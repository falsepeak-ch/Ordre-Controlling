import type { Role } from '~/types';

const RANK: Record<Role, number> = { viewer: 0, editor: 1, owner: 2 };

export const ROLES: Role[] = ['viewer', 'editor', 'owner'];

export const canEdit = (role: Role | undefined): boolean =>
  role !== undefined && RANK[role] >= RANK.editor;

export const canManage = (role: Role | undefined): boolean => role === 'owner';

export const isMember = (role: Role | undefined): boolean => role !== undefined;

export function roleRank(role: Role): number {
  return RANK[role];
}

export function hasRoleAtLeast(role: Role | undefined, atLeast: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[atLeast];
}
