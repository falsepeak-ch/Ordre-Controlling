import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey) {
  throw new Error(
    'Firebase config is missing. Copy .env.example to .env.local and fill in the VITE_FIREBASE_* keys.',
  );
}

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app, 'europe-west1');

/**
 * Firebase Storage is initialised lazily — the service component isn't
 * always registered at module-load time (can throw
 * "Service storage is not available"), and we don't need it on the
 * landing or auth screens. Lib code calls `getStorageInstance()` when it
 * actually needs to upload / delete a file.
 */
let _storage: FirebaseStorage | null = null;
export function getStorageInstance(): FirebaseStorage {
  if (_storage) return _storage;
  const bucket = firebaseConfig.storageBucket;
  _storage = bucket
    ? getStorage(app, `gs://${bucket}`)
    : getStorage(app);
  return _storage;
}

export let analytics: Analytics | null = null;
if (!import.meta.env.DEV) {
  isSupported()
    .then((supported) => {
      if (supported) analytics = getAnalytics(app);
    })
    .catch(() => {
      analytics = null;
    });
}
