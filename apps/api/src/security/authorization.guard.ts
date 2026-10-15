import {
  isAuthorized,
} from "@ckace/auth";
import type {
  AuthorizationTarget,
  PermissionRequirement,
} from "@ckace/contracts";
import type {
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import {
  REQUIRE_PERMISSION_KEY,
  SELF_AUTHORIZATION_TARGET_KEY,
} from "./require-permission.decorator";
import { assertModuleWriteAllowed } from "../routing/module-write-freeze";
import type { SecurityRequest } from "./security-request";

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement =
      this.reflector.getAllAndOverride<PermissionRequirement>(
        REQUIRE_PERMISSION_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requirement) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<SecurityRequest>();

    if (!request.actor) {
      throw new UnauthorizedException();
    }

    const selfTarget =
      this.reflector.getAllAndOverride<boolean>(
        SELF_AUTHORIZATION_TARGET_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    const target: AuthorizationTarget = selfTarget
      ? {
          ...(request.authorizationTarget ?? {}),
          employeeId: request.actor.employeeId,
        }
      : request.authorizationTarget ?? {};

    if (
      !isAuthorized(
        request.actor,
        requirement,
        target,
      )
    ) {
      throw new ForbiddenException();
    }

    assertModuleWriteAllowed(request);

    return true;
  }
}
