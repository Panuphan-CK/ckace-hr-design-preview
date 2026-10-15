import type {
  AuthorizationScope,
  PermissionRequirement,
} from "@ckace/contracts";
import {
  applyDecorators,
  SetMetadata,
} from "@nestjs/common";

export const REQUIRE_PERMISSION_KEY =
  "ckace.requirePermission";
export const SELF_AUTHORIZATION_TARGET_KEY =
  "ckace.selfAuthorizationTarget";

export function RequirePermission(
  permission: string,
  scope: AuthorizationScope,
): MethodDecorator & ClassDecorator {
  const requirement: PermissionRequirement = {
    permission,
    scope,
  };

  return SetMetadata(
    REQUIRE_PERMISSION_KEY,
    requirement,
  );
}

export function RequireSelfPermission(
  permission: string,
): MethodDecorator & ClassDecorator {
  const requirement: PermissionRequirement = {
    permission,
    scope: "SELF",
  };

  return applyDecorators(
    SetMetadata(REQUIRE_PERMISSION_KEY, requirement),
    SetMetadata(SELF_AUTHORIZATION_TARGET_KEY, true),
  );
}
