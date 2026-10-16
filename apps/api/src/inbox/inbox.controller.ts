import type { InboxOverview } from "@ckace/contracts";
import { Body, Controller, Get, Inject, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import { AuthorizationGuard } from "../security/authorization.guard";
import { RequireSelfPermission } from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { InboxService } from "./inbox.service";

@Controller("inbox")
@UseGuards(AuthorizationGuard)
export class InboxController {
  constructor(
    @Inject(InboxService)
    private readonly service: InboxService,
  ) {}

  @Get("me")
  @ModuleRoute("IDENTITY_READ")
  @RequireSelfPermission("profile.self.read")
  async overview(@Req() request: SecurityRequest): Promise<InboxOverview> {
    return this.service.overview(this.actor(request).employeeId);
  }

  @Post("read")
  @ModuleRoute("IDENTITY_WRITE")
  @RequireSelfPermission("profile.self.write")
  async markRead(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<{ readonly updated: number }> {
    return this.service.markRead(this.actor(request).employeeId, body);
  }

  private actor(request: SecurityRequest) {
    if (!request.actor) {
      throw new UnauthorizedException();
    }

    return request.actor;
  }
}
