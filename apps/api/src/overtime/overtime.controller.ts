import type {
  OvertimeApprovalQueueItem,
  OvertimeCancelResult,
  OvertimeCreateResult,
  OvertimeDecisionResult,
  OvertimeSelfOverview,
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
import { OvertimeService } from "./overtime.service";

@Controller("overtime")
@UseGuards(AuthorizationGuard)
export class OvertimeController {
  constructor(
    @Inject(OvertimeService)
    private readonly service: OvertimeService,
  ) {}

  @Get("me")
  @ModuleRoute("OT_READ")
  @RequireSelfPermission("overtime.self.read")
  async getSelf(
    @Req() request: SecurityRequest,
  ): Promise<OvertimeSelfOverview> {
    const actor = this.requireActor(request);

    return this.service.getSelfOverview(
      actor.employeeId,
    );
  }

  @Get("assigned")
  @ModuleRoute("OT_READ")
  @RequirePermission(
    "overtime.approve",
    "GLOBAL",
  )
  async getAssigned(
    @Req() request: SecurityRequest,
  ): Promise<
    readonly OvertimeApprovalQueueItem[]
  > {
    const actor = this.requireActor(request);

    return this.service.getAssignedApprovals(
      actor.employeeId,
    );
  }

  @Post("requests")
  @ModuleRoute("OT_WRITE")
  @RequireSelfPermission("overtime.self.write")
  async create(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<OvertimeCreateResult> {
    const actor = this.requireActor(request);

    return this.service.createSelfOvertime({
      employeeId: actor.employeeId,
      correlationId:
        request.correlationId ??
        actor.correlationId,
      body,
    });
  }

  @Post("requests/:requestId/cancel")
  @ModuleRoute("OT_WRITE")
  @RequireSelfPermission("overtime.self.write")
  async cancel(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
  ): Promise<OvertimeCancelResult> {
    const actor = this.requireActor(request);

    return this.service.cancelSelfOvertime({
      employeeId: actor.employeeId,
      correlationId:
        request.correlationId ??
        actor.correlationId,
      requestId,
    });
  }

  @Post("requests/:requestId/decision")
  @ModuleRoute("OT_WRITE")
  @RequirePermission(
    "overtime.approve",
    "GLOBAL",
  )
  async decide(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
    @Body() body: unknown,
  ): Promise<OvertimeDecisionResult> {
    const actor = this.requireActor(request);

    return this.service.decideAssignedOvertime({
      approverEmployeeId: actor.employeeId,
      correlationId:
        request.correlationId ??
        actor.correlationId,
      requestId,
      body,
    });
  }

  private requireActor(
    request: SecurityRequest,
  ) {
    if (!request.actor) {
      throw new UnauthorizedException();
    }

    return request.actor;
  }
}
