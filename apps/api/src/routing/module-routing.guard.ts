import type {
  ModuleRouteKey,
  PermissionRequirement,
} from "@ckace/contracts";
import type {
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import {
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import {
  REQUIRE_PERMISSION_KEY,
} from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { MODULE_ROUTE_KEY_METADATA } from "./module-route.decorator";
import { ModuleRoutingService } from "./module-routing.service";
import { assertModuleWriteAllowed } from "./module-write-freeze";

@Injectable()
export class ModuleRoutingGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(ModuleRoutingService)
    private readonly routing: ModuleRoutingService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const routeKey =
      this.reflector.getAllAndOverride<ModuleRouteKey>(
        MODULE_ROUTE_KEY_METADATA,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!routeKey) {
      return true;
    }

    const targets = [
      context.getHandler(),
      context.getClass(),
    ];
    const requirement =
      this.reflector.getAllAndOverride<PermissionRequirement>(
        REQUIRE_PERMISSION_KEY,
        targets,
      );
    const request =
      context.switchToHttp().getRequest<SecurityRequest>();
    const resolved = this.routing.resolve(routeKey);

    request.moduleRouting = resolved;

    // Protected routes must authenticate/authorize before freeze state is
    // disclosed. AuthorizationGuard enforces the freeze after permission
    // checks. Public business writes (for example onboarding register/bind)
    // are frozen here because they intentionally have no permission guard.
    if (!requirement) {
      assertModuleWriteAllowed(request);
    }

    return true;
  }
}
