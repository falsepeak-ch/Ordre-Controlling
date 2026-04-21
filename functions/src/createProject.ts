import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

const FREE_PROJECT_LIMIT = 1;
const DEFAULT_STORAGE_CAP_BYTES = {
  free: 300 * 1024 * 1024, // 300 MB
  pro: 10 * 1024 * 1024 * 1024, // 10 GB
} as const;

interface CreateProjectPayload {
  name?: string;
  description?: string;
  displayName?: string;
  email?: string;
  photoURL?: string | null;
}

interface UserSubscriptionShape {
  subscriptionStatus?: string | null;
}

function deriveInitial(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'P';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function isProSubscription(doc: UserSubscriptionShape | undefined): boolean {
  const status = doc?.subscriptionStatus;
  return status === 'active' || status === 'trialing';
}

/**
 * Creates a new project owned by the caller. Cloud-side so the free-tier
 * "max 1 owned project" quota is unforgeable — the client-side check in
 * [ProjectsListPage] is UX, this function is the security boundary.
 *
 * Enforces App Check so a leaked callable endpoint can't be scripted to
 * flood projects.
 */
export const createProject = onCall(
  {
    region: 'europe-west1',
    cors: true,
    enforceAppCheck: true,
  },
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in to create a project.');
    if (!req.app) {
      throw new HttpsError('failed-precondition', 'App Check token required.');
    }

    const payload = (req.data ?? {}) as Partial<CreateProjectPayload>;
    const name = (payload.name ?? '').trim();
    if (!name) throw new HttpsError('invalid-argument', 'Project name required.');
    const description = (payload.description ?? '').trim();
    const displayName = (payload.displayName ?? '').trim() || 'Owner';
    const email = (payload.email ?? '').toLowerCase().trim();
    if (!email) throw new HttpsError('invalid-argument', 'Caller email required.');
    const photoURL = payload.photoURL ?? null;

    const db = getFirestore();

    // Read the caller's tier + current owned-project count in parallel.
    const userSnap = await db.doc(`users/${uid}`).get();
    const user = userSnap.exists ? (userSnap.data() as UserSubscriptionShape) : {};
    const isPro = isProSubscription(user);

    if (!isPro) {
      const ownedSnap = await db
        .collection('projects')
        .where(`members.${uid}`, '==', 'owner')
        .count()
        .get();
      const owned = ownedSnap.data().count;
      if (owned >= FREE_PROJECT_LIMIT) {
        throw new HttpsError(
          'resource-exhausted',
          'Free tier is limited to one project. Upgrade to Pro to add more.',
          { code: 'project-limit-reached', limit: FREE_PROJECT_LIMIT },
        );
      }
    }

    const capBytes = isPro ? DEFAULT_STORAGE_CAP_BYTES.pro : DEFAULT_STORAGE_CAP_BYTES.free;

    const projectRef = db.collection('projects').doc();
    const projectData = {
      name,
      description,
      currency: 'EUR',
      initial: deriveInitial(name),
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      members: { [uid]: 'owner' },
      memberEmails: { [uid]: email },
      memberProfiles: {
        [uid]: { displayName, email, photoURL },
      },
      storageBytesUsed: 0,
      storageCapBytes: capBytes,
    };

    await projectRef.set(projectData);
    await db.doc(`users/${uid}`).set(
      { defaultProjectId: projectRef.id },
      { merge: true },
    );

    logger.info('[createProject] created', { projectId: projectRef.id, uid, isPro });
    return { projectId: projectRef.id };
  },
);
