import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { assertCanTakeOwnerOrEditor } from './memberLimits';

type Role = 'owner' | 'editor' | 'approver' | 'viewer';

interface SetMemberRolePayload {
  projectId?: string;
  uid?: string;
  role?: Role;
  demote?: { uid?: string; role?: Role };
}

const VALID_ROLES: ReadonlySet<Role> = new Set(['owner', 'editor', 'approver', 'viewer']);

/**
 * Changes a member's role on a project. Also covers the demote-old-owner
 * half of an ownership transfer so both writes land atomically.
 *
 * Admin-SDK write so the pro-tier "owner/editor on one project only"
 * rule cannot be bypassed by promoting an existing viewer/approver
 * client-side.
 */
export const setMemberRole = onCall(
  {
    region: 'europe-west1',
    cors: true,
    enforceAppCheck: true,
  },
  async (req) => {
    const callerUid = req.auth?.uid;
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Sign in to change roles.');
    }
    if (!req.app) {
      throw new HttpsError('failed-precondition', 'App Check token required.');
    }

    const payload = (req.data ?? {}) as Partial<SetMemberRolePayload>;
    const projectId = (payload.projectId ?? '').trim();
    const uid = (payload.uid ?? '').trim();
    const role = (payload.role ?? '') as Role;
    const demoteUid = (payload.demote?.uid ?? '').trim();
    const demoteRole = (payload.demote?.role ?? '') as Role;

    if (!projectId) throw new HttpsError('invalid-argument', 'Missing projectId.');
    if (!uid) throw new HttpsError('invalid-argument', 'Missing uid.');
    if (!VALID_ROLES.has(role)) throw new HttpsError('invalid-argument', 'Invalid role.');
    if (demoteUid && !VALID_ROLES.has(demoteRole)) {
      throw new HttpsError('invalid-argument', 'Invalid demote role.');
    }

    const db = getFirestore();
    const projectRef = db.doc(`projects/${projectId}`);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new HttpsError('not-found', 'Project not found.');
    }
    const project = projectSnap.data() as { members?: Record<string, Role> };

    const callerRole = project.members?.[callerUid];
    if (callerRole !== 'owner') {
      throw new HttpsError('permission-denied', 'Only owners can change roles.');
    }

    if (!project.members?.[uid]) {
      throw new HttpsError('not-found', 'Target user is not a project member.');
    }
    if (demoteUid && !project.members?.[demoteUid]) {
      throw new HttpsError('not-found', 'Demote target is not a project member.');
    }

    if (role === 'owner' || role === 'editor') {
      await assertCanTakeOwnerOrEditor(uid, projectId);
    }

    const update: Record<string, Role> = { [`members.${uid}`]: role };
    if (demoteUid) update[`members.${demoteUid}`] = demoteRole;
    await projectRef.update(update);

    logger.info('[setMemberRole] updated', { projectId, uid, role, demoteUid, demoteRole });
    return { ok: true as const };
  },
);
