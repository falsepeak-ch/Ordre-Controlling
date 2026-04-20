import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, provider);
  await ensureUserDocument(cred.user);
  return cred.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

async function ensureUserDocument(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    uid: user.uid,
    email: (user.email ?? '').toLowerCase(),
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Unnamed',
    photoURL: user.photoURL ?? null,
    defaultProjectId: null,
    createdAt: serverTimestamp(),
  });
}
