import type { ApprovalDelegationItem, ApprovalDelegationOverview } from "@ckace/contracts";
import {
  Body,
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
import { RequireSelfPermission } from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { DelegationService } from "./delegation.service";

@Controller("delegations")
@UseGuards(AuthorizationGuard)
export class DelegationController {
  constructor(
    @Inject(DelegationService)
    private readonly service: DelegationService,
  ) {}

  @Get("me")
  @ModuleRoute("IDENTITY_READ")
  @RequireSelfPermission("delegation.self.manage")
  async overview(@Req() request: SecurityRequest): Promise<ApprovalDelegationOverview> {
    return this.service.overview(this.actor(request).employeeId);
  }

  @Post()
  @ModuleRoute("IDENTITY_WRITE")
  @RequireSelfPermission("delegation.self.manage")
  async create(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<ApprovalDelegationItem> {
    const actor = this.actor(request);

    return this.service.create({
      employeeId: actor.employeeId,
      correlationId: request.correlationId ?? actor.correlationId,
      body,
    });
  }

  @Post(":delegationId/cancel")
  @ModuleRoute("IDENTITY_WRITE")
  @RequireSelfPermission("delegation.self.manage")
  async cancel(
    @Req() request: SecurityRequest,
    @Param("delegationId") delegationId: string,
  ): Promise<ApprovalDelegationItem> {
    const actor = this.actor(request);

    return this.service.cancel({
      employeeId: actor.employeeId,
      correlationId: request.correlationId ?? actor.correlationId,
      delegationId,
    });
  }

  private actor(request: SecurityRequest) {
    if (!request.actor) {
      throw new UnauthorizedException();
    }

    return request.actor;
  }
}
