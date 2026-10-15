import type {
  LeaveApprovalDecisionResult,
  LeaveApprovalStepOptions,
  LeaveCancelResult,
  LeaveCreateResult,
  LeaveSelfOverview,
} from "@ckace/contracts";
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
import {
  RequirePermission,
  RequireSelfPermission,
} from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { LeaveService } from "./leave.service";

@Controller("leave")
@UseGuards(AuthorizationGuard)
export class LeaveController {
  constructor(
    @Inject(LeaveService)
    private readonly service: LeaveService,
  ) {}

  @Get("me")
  @ModuleRoute("LEAVE_READ")
  @RequireSelfPermission("leave.self.read")
  async getSelf(
    @Req() request: SecurityRequest,
  ): Promise<LeaveSelfOverview> {
    const actor = this.requireActor(request);
    return this.service.getSelfOverview(actor.employeeId);
  }

  @Get("approval-options")
  @ModuleRoute("LEAVE_READ")
  @RequireSelfPermission("leave.self.read")
  async getApprovalOptions(
    @Req() request: SecurityRequest,
  ): Promise<readonly LeaveApprovalStepOptions[]> {
    const actor = this.requireActor(request);
    return this.service.getApprovalOptions(actor.employeeId);
  }

  @Post("requests")
  @ModuleRoute("LEAVE_WRITE")
  @RequireSelfPermission("leave.self.write")
  async create(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<LeaveCreateResult> {
    const actor = this.requireActor(request);

    return this.service.createSelfLeave({
      employeeId: actor.employeeId,
      correlationId:
        request.correlationId ?? actor.correlationId,
      body,
    });
  }

  @Post("requests/:requestId/decision")
  @ModuleRoute("LEAVE_WRITE")
  @RequirePermission("leave.approve", "GLOBAL")
  async decide(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
    @Body() body: unknown,
  ): Promise<LeaveApprovalDecisionResult> {
    const actor = this.requireActor(request);

    return this.service.decideLeave({
      approverEmployeeId: actor.employeeId,
      correlationId:
        request.correlationId ?? actor.correlationId,
      requestId,
      body,
    });
  }

  @Post("requests/:requestId/cancel")
  @ModuleRoute("LEAVE_WRITE")
  @RequireSelfPermission("leave.self.write")
  async cancel(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
  ): Promise<LeaveCancelResult> {
    const actor = this.requireActor(request);

    return this.service.cancelSelfLeave({
      employeeId: actor.employeeId,
      correlationId:
        request.correlationId ?? actor.correlationId,
      requestId,
    });
  }

  private requireActor(request: SecurityRequest) {
    if (!request.actor) {
      throw new UnauthorizedException();
    }

    return request.actor;
  }
}
