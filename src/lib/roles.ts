import type { Role } from '~/types';

const RANK: Record<Role, number> = { viewer: 0, approver: 1, editor: 2, owner: 3 };

export const ROLES: Role[] = ['viewer', 'approver', 'editor', 'owner'];

export const canEdit = (role: Role | undefined): boolean =>
  role === 'editor' || role === 'owner';

export const canManage = (role: Role | undefined): boolean => role === 'owner';

export const canApprove = (role: Role | undefined): boolean =>
  role === 'approver' || role === 'owner';

export const isMember = (role: Role | undefined): boolean => role !== undefined;

export function roleRank(role: Role): number {
  return RANK[role];
}

export function hasRoleAtLeast(role: Role | undefined, atLeast: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[atLeast];
}
