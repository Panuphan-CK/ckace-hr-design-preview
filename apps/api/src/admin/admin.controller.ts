import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import { AuthorizationGuard } from "../security/authorization.guard";
import { RequirePermission } from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { AdminService } from "./admin.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller("admin")
@UseGuards(AuthorizationGuard)
export class AdminController {
  constructor(@Inject(AdminService) private readonly service: AdminService) {}

  @Get("notifications")
  @ModuleRoute("NOTIFICATIONS_READ")
  @RequirePermission("notifications.admin.read", "GLOBAL")
  notifications(
    @Req() request: SecurityRequest,
  ) {
    if (!request.actor) {
      throw new UnauthorizedException();
    }
    return this.service.notifications(
      request.actor.permissions,
    );
  }

  @Post("notifications/:id/retry")
  @ModuleRoute("NOTIFICATIONS_WRITE")
  @RequirePermission("notifications.admin.retry", "GLOBAL")
  retry(@Req() request: SecurityRequest, @Param("id") id: string) {
    if (!request.actor) throw new UnauthorizedException();
    if (!UUID.test(id)) throw new BadRequestException("Invalid notification ID");
    return this.service.retryNotification(id, request.actor.employeeId);
  }

  @Get("settings")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("admin.settings.read", "GLOBAL")
  settings() {
    return this.service.settings();
  }
}
