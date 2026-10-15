import type { AuthenticatedBy } from "@ckace/contracts";

export interface InternalActorContext {
  readonly employeeId: string;
  readonly legacyUid: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly agencyId: string | null;
  readonly departmentId: string | null;
  readonly authenticatedBy: AuthenticatedBy;
  readonly correlationId: string;
}

export function hasRole(
  actor: InternalActorContext,
  role: string,
): boolean {
  return actor.roles.includes(role);
}

export function hasPermission(
  actor: InternalActorContext,
  permission: string,
): boolean {
  return actor.permissions.includes(permission);
}
