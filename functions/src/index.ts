// Runtime: Node.js 22 (Cloud Functions 2nd Gen). Runtime is pinned in
// firebase.json; `engines.node` in package.json must match.
import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

export { sendProjectInvite } from './sendProjectInvite';
export { createProject } from './createProject';
export { addProjectMember } from './addProjectMember';
export { setMemberRole } from './setMemberRole';
export { onStorageObjectFinalized, onStorageObjectDeleted } from './storageQuota';
