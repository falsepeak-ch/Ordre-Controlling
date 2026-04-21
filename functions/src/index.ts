import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

export { sendProjectInvite } from './sendProjectInvite';
export { createProject } from './createProject';
export { onStorageObjectFinalized, onStorageObjectDeleted } from './storageQuota';
