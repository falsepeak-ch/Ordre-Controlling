import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

interface UserSubscriptionShape {
  subscriptionStatus?: string | null;
}

export function isProSubscription(doc: UserSubscriptionShape | undefined): boolean {
  const status = doc?.subscriptionStatus;
  return status === 'active' || status === 'trialing';
}

/**
 * Guards the free-tier rule: a non-pro user can only be `owner` or `editor`
 * of one project at a time. `viewer` / `approver` are unlimited and callers
 * should not invoke this helper for those roles.
 *
 * When `excludeProjectId` is passed, an existing `owner`/`editor` role on
 * that same project doesn't count toward the limit — needed so promoting
 * a viewer/approver within the current project isn't blocked by
 * themselves.
 */
export async function assertCanTakeOwnerOrEditor(
  targetUid: string,
  excludeProjectId?: string,
): Promise<void> {
  const db = getFirestore();
  const userSnap = await db.doc(`users/${targetUid}`).get();
  const user = userSnap.exists ? (userSnap.data() as UserSubscriptionShape) : {};
  if (isProSubscription(user)) return;

  // Firestore has no `in` on map-value equality, so count owner + editor
  // separately and sum.
  const [ownedSnap, editedSnap] = await Promise.all([
    db
      .collection('projects')
      .where(`members.${targetUid}`, '==', 'owner')
      .get(),
    db
      .collection('projects')
      .where(`members.${targetUid}`, '==', 'editor')
      .get(),
  ]);

  const counts = [...ownedSnap.docs, ...editedSnap.docs]
    .filter((d) => d.id !== excludeProjectId)
    .length;

  if (counts >= 1) {
    throw new HttpsError(
      'failed-precondition',
      'This user is already owner or editor of another project.',
      { code: 'target-project-limit' },
    );
  }
}
