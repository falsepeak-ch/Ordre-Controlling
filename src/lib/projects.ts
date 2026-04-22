import {
  collection,
  deleteDoc,
  deleteField,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import i18next from 'i18next';
import { db, functions } from './firebase';
import { projectDoc, projectsCol } from './firestore';
import type { Project, Role } from '~/types';

type InviteLocale = 'ca' | 'es' | 'en';

interface SendProjectInvitePayload {
  projectId: string;
  email: string;
  role: Role;
  recipientName?: string;
  locale: InviteLocale;
}

const sendProjectInviteCallable = httpsCallable<SendProjectInvitePayload, { ok: boolean }>(
  functions,
  'sendProjectInvite',
);

interface CreateProjectPayload {
  name: string;
  description?: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

const createProjectCallable = httpsCallable<CreateProjectPayload, { projectId: string }>(
  functions,
  'createProject',
);

interface AddProjectMemberPayload {
  projectId: string;
  email: string;
  role: Role;
}

const addProjectMemberCallable = httpsCallable<AddProjectMemberPayload, { ok: true; uid: string }>(
  functions,
  'addProjectMember',
);

interface SetMemberRolePayload {
  projectId: string;
  uid: string;
  role: Role;
  demote?: { uid: string; role: Role };
}

const setMemberRoleCallable = httpsCallable<SetMemberRolePayload, { ok: true }>(
  functions,
  'setMemberRole',
);

/** Thrown when the free-tier project limit blocks creation. */
export class ProjectLimitReachedError extends Error {
  constructor() {
    super('project-limit-reached');
    this.name = 'ProjectLimitReachedError';
  }
}

export type MemberMutationErrorCode =
  | 'user-not-found'
  | 'already-member'
  | 'target-project-limit'
  | 'permission-denied'
  | 'unknown';

/**
 * Typed error surface for add / promote / transfer flows. The UI
 * maps `code` to a localised toast — any unmapped code falls back
 * to the generic copy.
 */
export class MemberMutationError extends Error {
  readonly code: MemberMutationErrorCode;
  constructor(code: MemberMutationErrorCode) {
    super(code);
    this.name = 'MemberMutationError';
    this.code = code;
  }
}

function toMemberMutationError(err: unknown): MemberMutationError {
  const asFns = err as {
    code?: string;
    details?: { code?: MemberMutationErrorCode };
  };
  const detail = asFns?.details?.code;
  if (
    detail === 'user-not-found' ||
    detail === 'already-member' ||
    detail === 'target-project-limit'
  ) {
    return new MemberMutationError(detail);
  }
  if (asFns?.code === 'functions/permission-denied') {
    return new MemberMutationError('permission-denied');
  }
  if (asFns?.code === 'functions/not-found' && !detail) {
    // The callables only throw bare `not-found` for things like missing
    // project doc, which shouldn't happen in normal flows.
    return new MemberMutationError('unknown');
  }
  return new MemberMutationError('unknown');
}

function currentInviteLocale(): InviteLocale {
  const raw = (i18next.language || 'ca').slice(0, 2).toLowerCase();
  return raw === 'es' || raw === 'en' ? raw : 'ca';
}

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

  try {
    const res = await createProjectCallable({
      name,
      description: input.description?.trim() ?? '',
      displayName: owner.displayName,
      email: owner.email.toLowerCase(),
      photoURL: owner.photoURL,
    });
    return res.data.projectId;
  } catch (err) {
    // Firebase callable errors surface the HttpsError code in `err.code`
    // (e.g. "functions/resource-exhausted"). The server also attaches
    // a structured `details.code` for more precise client handling.
    const asFns = err as { code?: string; details?: { code?: string } };
    if (
      asFns.code === 'functions/resource-exhausted' ||
      asFns.details?.code === 'project-limit-reached'
    ) {
      throw new ProjectLimitReachedError();
    }
    throw err;
  }
}

export function listenProjectsForUser(
  uid: string,
  onData: (projects: Project[]) => void,
): Unsubscribe {
  const q = query(projectsCol(), where(`members.${uid}`, 'in', ['owner', 'editor', 'approver', 'viewer']));
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
  try {
    await addProjectMemberCallable({ projectId, email: normalized, role });
  } catch (err) {
    throw toMemberMutationError(err);
  }

  // Fire-and-forget invite email. A failure here should never block the
  // role write — the member already has access; the email is a courtesy.
  try {
    await sendProjectInviteCallable({
      projectId,
      email: normalized,
      role,
      locale: currentInviteLocale(),
    });
  } catch (err) {
    console.warn('[addMemberByEmail] invite email failed', err);
  }
}

export async function updateMemberRole(
  projectId: string,
  uid: string,
  role: Role,
): Promise<void> {
  try {
    await setMemberRoleCallable({ projectId, uid, role });
  } catch (err) {
    throw toMemberMutationError(err);
  }
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
 * demoted to `editor` in the same server-side write so the project
 * never ends up ownerless and the pro-tier limit is re-checked on
 * the new owner.
 */
export async function transferOwnership(
  projectId: string,
  fromUid: string,
  toUid: string,
): Promise<void> {
  if (fromUid === toUid) return;
  if (!toUid) throw new Error('target-required');
  try {
    await setMemberRoleCallable({
      projectId,
      uid: toUid,
      role: 'owner',
      demote: { uid: fromUid, role: 'editor' },
    });
  } catch (err) {
    throw toMemberMutationError(err);
  }
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
