import {
  addDoc,
  deleteField,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
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
