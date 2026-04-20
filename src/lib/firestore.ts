import {
  collection,
  doc,
  getDocs,
  query,
  where,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Project, PurchaseOrder, Supplier, UserProfile } from '~/types';

// ---- Projects (top-level) ----
export const projectsCol = (): CollectionReference<Project> =>
  collection(db, 'projects') as CollectionReference<Project>;

export const projectDoc = (projectId: string): DocumentReference<Project> =>
  doc(db, 'projects', projectId) as DocumentReference<Project>;

// ---- Project sub-collections ----
export const suppliersCol = (projectId: string): CollectionReference<Supplier> =>
  collection(db, 'projects', projectId, 'suppliers') as CollectionReference<Supplier>;

export const purchaseOrdersCol = (projectId: string): CollectionReference<PurchaseOrder> =>
  collection(db, 'projects', projectId, 'purchaseOrders') as CollectionReference<PurchaseOrder>;

// ---- Users ----
export const usersCol = (): CollectionReference<UserProfile> =>
  collection(db, 'users') as CollectionReference<UserProfile>;

export const userDoc = (uid: string): DocumentReference<UserProfile> =>
  doc(db, 'users', uid) as DocumentReference<UserProfile>;

export function tsToISO(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && 'toDate' in (val as object)) {
    return (val as { toDate(): Date }).toDate().toISOString();
  }
  return null;
}

export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const q = query(usersCol(), where('email', '==', email.toLowerCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ...d.data(), uid: d.id };
}
