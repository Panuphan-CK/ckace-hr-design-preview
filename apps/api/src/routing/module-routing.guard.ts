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
  ServiceUnavailableException,
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
    const request =
      context.switchToHttp().getRequest<SecurityRequest>();
    const systemReadOnly = this.routing.systemReadOnly;
    const routeKey =
      this.reflector.getAllAndOverride<ModuleRouteKey>(
        MODULE_ROUTE_KEY_METADATA,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!routeKey) {
      if (
        systemReadOnly &&
        isMutationMethod(request.method) &&
        !isSessionOperation(context)
      ) {
        throw new ServiceUnavailableException({
          code: "SYSTEM_READ_ONLY",
          retryable: false,
        });
      }
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
    const resolved = this.routing.resolve(routeKey);

    request.moduleRouting = resolved;
    request.systemReadOnly = systemReadOnly;

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

function isMutationMethod(method: string | undefined): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(
    method?.toUpperCase() ?? "",
  );
}

/** Authentication/session endpoints do not mutate HR business data. */
function isSessionOperation(context: ExecutionContext): boolean {
  const controllerName = context.getClass().name;
  const handlerName = context.getHandler().name;
  return (
    controllerName === "DesktopAuthController" &&
    ["login", "lineLogin", "logout", "requireSession"].includes(
      handlerName,
    )
  );
}
