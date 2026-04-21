import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import type { Analytics } from 'firebase/analytics';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';

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

// App Check — attach BEFORE any other service so every request carries
// a token. In dev the debug-token env var lets a localhost build talk
// to a project with enforcement on; register the token in the Firebase
// console under App Check → Apps → Manage debug tokens.
const APP_CHECK_SITE_KEY = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;

if (import.meta.env.DEV) {
  const debugToken = import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN;
  if (debugToken) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      debugToken;
  } else if (import.meta.env.VITE_APP_CHECK_DEBUG === 'true') {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
}

export let appCheck: AppCheck | null = null;
if (APP_CHECK_SITE_KEY) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
} else if (!import.meta.env.DEV) {
  // Fail loud in prod — missing App Check is a security regression.
  // In dev we only warn so contributors can run without a site key.
  console.error('[firebase] VITE_FIREBASE_APP_CHECK_SITE_KEY is not set — App Check disabled in production build.');
} else {
  console.warn('[firebase] VITE_FIREBASE_APP_CHECK_SITE_KEY not set — App Check disabled (dev).');
}

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

/**
 * Firebase Analytics reference. Initialisation is owned by
 * `src/lib/analytics.ts` and gated on the user's cookie-consent
 * decision — nothing loads here until the user opts in.
 */
export let analytics: Analytics | null = null;
export function setAnalyticsInstance(instance: Analytics | null): void {
  analytics = instance;
}
