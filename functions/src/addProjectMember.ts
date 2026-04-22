import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { assertCanTakeOwnerOrEditor } from './memberLimits';

type Role = 'owner' | 'editor' | 'approver' | 'viewer';

interface AddProjectMemberPayload {
  projectId?: string;
  email?: string;
  role?: Role;
}

const VALID_ROLES: ReadonlySet<Role> = new Set(['owner', 'editor', 'approver', 'viewer']);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Adds an existing Ordre user to a project by email. Admin-SDK write so
 * the pro-tier "owner/editor on one project only" rule cannot be bypassed
 * client-side. Mirror of `createProject` for the promotion side of the
 * quota.
 */
export const addProjectMember = onCall(
  {
    region: 'europe-west1',
    cors: true,
    enforceAppCheck: true,
  },
  async (req) => {
    const callerUid = req.auth?.uid;
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Sign in to add members.');
    }
    if (!req.app) {
      throw new HttpsError('failed-precondition', 'App Check token required.');
    }

    const payload = (req.data ?? {}) as Partial<AddProjectMemberPayload>;
    const projectId = (payload.projectId ?? '').trim();
    const email = (payload.email ?? '').toLowerCase().trim();
    const role = (payload.role ?? 'editor') as Role;

    if (!projectId) throw new HttpsError('invalid-argument', 'Missing projectId.');
    if (!isValidEmail(email)) throw new HttpsError('invalid-argument', 'Invalid email.');
    if (!VALID_ROLES.has(role)) throw new HttpsError('invalid-argument', 'Invalid role.');

    const db = getFirestore();
    const projectRef = db.doc(`projects/${projectId}`);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new HttpsError('not-found', 'Project not found.');
    }
    const project = projectSnap.data() as {
      members?: Record<string, Role>;
    };

    const callerRole = project.members?.[callerUid];
    if (callerRole !== 'owner') {
      throw new HttpsError('permission-denied', 'Only owners can add members.');
    }

    const targetSnap = await db
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (targetSnap.empty) {
      throw new HttpsError(
        'not-found',
        'No Ordre account with that email.',
        { code: 'user-not-found' },
      );
    }
    const targetDoc = targetSnap.docs[0];
    const targetUid = targetDoc.id;
    const targetData = targetDoc.data() as {
      displayName?: string;
      email?: string;
      photoURL?: string | null;
    };

    if (project.members?.[targetUid]) {
      throw new HttpsError(
        'already-exists',
        'This person is already a project member.',
        { code: 'already-member' },
      );
    }

    if (role === 'owner' || role === 'editor') {
      await assertCanTakeOwnerOrEditor(targetUid);
    }

    await projectRef.update({
      [`members.${targetUid}`]: role,
      [`memberEmails.${targetUid}`]: email,
      [`memberProfiles.${targetUid}`]: {
        displayName: targetData.displayName ?? email,
        email,
        photoURL: targetData.photoURL ?? null,
      },
    });

    logger.info('[addProjectMember] added', { projectId, targetUid, role });
    return { ok: true as const, uid: targetUid };
  },
);
