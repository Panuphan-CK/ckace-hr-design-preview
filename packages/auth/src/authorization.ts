import type {
  AuthorizationTarget,
  PermissionRequirement,
} from "@ckace/contracts";

import {
  hasPermission,
  type InternalActorContext,
} from "./internal-actor";

export function isAuthorized(
  actor: InternalActorContext,
  requirement: PermissionRequirement,
  target: AuthorizationTarget = {},
): boolean {
  if (!hasPermission(actor, requirement.permission)) {
    return false;
  }

  switch (requirement.scope) {
    case "GLOBAL":
      return true;
    case "SELF":
      return Boolean(
        target.employeeId &&
          target.employeeId === actor.employeeId,
      );
    case "AGENCY":
      return Boolean(
        actor.agencyId &&
          target.agencyId &&
          target.agencyId === actor.agencyId,
      );
    case "DEPARTMENT":
      return Boolean(
        actor.departmentId &&
          target.departmentId &&
          target.departmentId === actor.departmentId,
      );
    default: {
      const exhaustive: never = requirement.scope;
      return exhaustive;
    }
  }
}

export class AuthorizationDeniedError extends Error {
  constructor() {
    super("Authorization denied");
    this.name = "AuthorizationDeniedError";
  }
}

export function assertAuthorized(
  actor: InternalActorContext,
  requirement: PermissionRequirement,
  target: AuthorizationTarget = {},
): void {
  if (!isAuthorized(actor, requirement, target)) {
    throw new AuthorizationDeniedError();
  }
}
