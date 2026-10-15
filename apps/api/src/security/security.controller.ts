import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import {
  desktopNavigationForPermissions,
} from "./desktop-navigation";
import type { SecurityRequest } from "./security-request";

@Controller("security")
export class SecurityController {
  @Get("contract")
  getContract() {
    return {
      actorAuthority: "server-populated-only",
      clientRoleAuthority: false,
      moduleRouting: "LEGACY",
      legacyBridgeEnvelope: "HMAC-SHA256-short-lived",
      authorization: "permission-plus-scope-fail-closed",
    } as const;
  }

  @Get("session")
  @ModuleRoute("IDENTITY_READ")
  getSession(
    @Req() request: SecurityRequest,
  ) {
    if (!request.actor) {
      throw new UnauthorizedException();
    }

    return {
      authenticated: true,
      employeeId: request.actor.employeeId,
      authenticatedBy: request.actor.authenticatedBy,
      roleCount: request.actor.roles.length,
      permissionCount: request.actor.permissions.length,
      navigation: desktopNavigationForPermissions(
        request.actor.permissions,
      ),
      clientRoleAuthority: false,
      correlationId: request.actor.correlationId,
    } as const;
  }
}
