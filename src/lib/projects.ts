import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { findUserByEmail, projectDoc, projectsCol, userDoc } from './firestore';
import type { Project, Role } from '~/types';

export interface NewProjectInput {
  name: string;
  description?: string;
}

function deriveInitial(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'P';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export async function createProject(
  input: NewProjectInput,
  owner: { uid: string; email: string; displayName: string; photoURL: string | null },
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Project name required');

  const email = owner.email.toLowerCase();
  const data = {
    name,
    description: input.description?.trim() ?? '',
    currency: 'EUR' as const,
    initial: deriveInitial(name),
    createdBy: owner.uid,
    createdAt: serverTimestamp(),
    members: { [owner.uid]: 'owner' as Role },
    memberEmails: { [owner.uid]: email },
    memberProfiles: {
      [owner.uid]: {
        displayName: owner.displayName,
        email,
        photoURL: owner.photoURL,
      },
    },
  };

  const ref = await addDoc(projectsCol(), data as never);

  if (!owner) return ref.id;
  // Set default project for the user if they don't have one yet.
  await setDoc(
    userDoc(owner.uid),
    { defaultProjectId: ref.id },
    { merge: true },
  );
  return ref.id;
}

export function listenProjectsForUser(
  uid: string,
  onData: (projects: Project[]) => void,
): Unsubscribe {
  const q = query(projectsCol(), where(`members.${uid}`, 'in', ['owner', 'editor', 'viewer']));
  return onSnapshot(q, (snap) => {
    const items: Project[] = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
    items.sort((a, b) => a.name.localeCompare(b.name));
    onData(items);
  });
}

export function listenProject(
  projectId: string,
  onData: (project: Project | null) => void,
): Unsubscribe {
  return onSnapshot(projectDoc(projectId), (snap) => {
    if (!snap.exists()) return onData(null);
    onData({ ...snap.data(), id: snap.id });
  });
}

export async function addMemberByEmail(
  projectId: string,
  email: string,
  role: Role = 'editor',
): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const user = await findUserByEmail(normalized);
  if (!user) {
    throw new Error('user-not-found');
  }
  await updateDoc(projectDoc(projectId), {
    [`members.${user.uid}`]: role,
    [`memberEmails.${user.uid}`]: normalized,
    [`memberProfiles.${user.uid}`]: {
      displayName: user.displayName,
      email: normalized,
      photoURL: user.photoURL ?? null,
    },
  });
}

export async function updateMemberRole(
  projectId: string,
  uid: string,
  role: Role,
): Promise<void> {
  await updateDoc(projectDoc(projectId), { [`members.${uid}`]: role });
}

export async function removeMember(projectId: string, uid: string): Promise<void> {
  await updateDoc(projectDoc(projectId), {
    [`members.${uid}`]: deleteField(),
    [`memberEmails.${uid}`]: deleteField(),
    [`memberProfiles.${uid}`]: deleteField(),
  });
}

export async function renameProject(projectId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('name-required');
  await updateDoc(projectDoc(projectId), {
    name: trimmed,
    initial: deriveInitial(trimmed),
  });
}

export interface ProjectMetaPatch {
  name?: string;
  description?: string;
}

/**
 * Owner-only edit of the project's non-member metadata (name, initial
 * and description). Enforced by firestore.rules which insist that
 * the members map is unchanged unless the caller is the owner.
 */
export async function updateProjectMeta(
  projectId: string,
  patch: ProjectMetaPatch,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error('name-required');
    payload.name = trimmed;
    payload.initial = deriveInitial(trimmed);
  }
  if (patch.description !== undefined) {
    payload.description = patch.description.trim();
  }
  if (Object.keys(payload).length === 0) return;
  await updateDoc(projectDoc(projectId), payload);
}

export async function archiveProject(projectId: string): Promise<void> {
  await updateDoc(projectDoc(projectId), {
    archived: true,
    archivedAt: serverTimestamp(),
  });
}

export async function unarchiveProject(projectId: string): Promise<void> {
  await updateDoc(projectDoc(projectId), {
    archived: false,
    archivedAt: null,
  });
}

/**
 * Hand the `owner` role to another member. The previous owner is
 * demoted to `editor` in the same batched write so the project never
 * ends up ownerless.
 */
export async function transferOwnership(
  projectId: string,
  fromUid: string,
  toUid: string,
): Promise<void> {
  if (fromUid === toUid) return;
  if (!toUid) throw new Error('target-required');
  const batch = writeBatch(db);
  batch.update(projectDoc(projectId), {
    [`members.${toUid}`]: 'owner',
    [`members.${fromUid}`]: 'editor',
  });
  await batch.commit();
}

export interface ProjectContentsCheck {
  supplierCount: number;
  categoryCount: number;
  poCount: number;
  isEmpty: boolean;
}

/**
 * Count-but-bounded check used by the Delete Project flow. We cap each
 * sub-collection read at 10 just to know whether the project is empty —
 * a cascading delete across thousands of docs + Storage files isn't
 * safe to do client-side, so we refuse and suggest Archive instead.
 */
export async function inspectProjectContents(
  projectId: string,
): Promise<ProjectContentsCheck> {
  const cap = 10;
  const [sup, cat, po] = await Promise.all([
    getDocs(query(collection(db, 'projects', projectId, 'suppliers'), limit(cap))),
    getDocs(query(collection(db, 'projects', projectId, 'categories'), limit(cap))),
    getDocs(query(collection(db, 'projects', projectId, 'purchaseOrders'), limit(cap))),
  ]);
  return {
    supplierCount: sup.size,
    categoryCount: cat.size,
    poCount: po.size,
    isEmpty: sup.empty && cat.empty && po.empty,
  };
}

/**
 * Delete a project document. Refuses when the project still has
 * content — callers must check first (see `inspectProjectContents`)
 * or use Archive. The full cascading delete across all sub-collections
 * and Storage objects needs a Cloud Function and is deferred.
 */
export async function deleteEmptyProject(projectId: string): Promise<void> {
  const check = await inspectProjectContents(projectId);
  if (!check.isEmpty) throw new Error('project-not-empty');
  await deleteDoc(projectDoc(projectId));
}
