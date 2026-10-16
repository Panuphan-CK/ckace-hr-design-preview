import type {
  ApprovalChainPreview,
  OvertimeBulkApproveResult,
  OvertimeApprovalQueueItem,
  OvertimeCancelResult,
  OvertimeCreateResult,
  OvertimeDecisionResult,
  OvertimeResubmitResult,
  OvertimeWithdrawResult,
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

  @Get("approval-chain")
  @ModuleRoute("OT_READ")
  @RequireSelfPermission("overtime.self.read")
  async approvalChain(@Req() request: SecurityRequest): Promise<ApprovalChainPreview> {
    const actor = this.requireActor(request);

    return this.service.previewApprovalChain(actor.employeeId);
  }

  @Post("approve-all")
  @ModuleRoute("OT_WRITE")
  @RequirePermission("overtime.approve", "GLOBAL")
  async approveAll(@Req() request: SecurityRequest): Promise<OvertimeBulkApproveResult> {
    const actor = this.requireActor(request);

    return this.service.approveAllAssignedOvertime({
      approverEmployeeId: actor.employeeId,
      correlationId: request.correlationId ?? actor.correlationId,
    });
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

  @Post("requests/:requestId/resubmit")
  @ModuleRoute("OT_WRITE")
  @RequireSelfPermission("overtime.self.write")
  async resubmit(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
    @Body() body: unknown,
  ): Promise<OvertimeResubmitResult> {
    const actor = this.requireActor(request);

    return this.service.resubmitOvertime({
      employeeId: actor.employeeId,
      correlationId: request.correlationId ?? actor.correlationId,
      requestId,
      body,
    });
  }

  @Post("requests/:requestId/withdraw")
  @ModuleRoute("OT_WRITE")
  @RequirePermission("overtime.approved.withdraw", "GLOBAL")
  async withdraw(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
    @Body() body: unknown,
  ): Promise<OvertimeWithdrawResult> {
    const actor = this.requireActor(request);

    return this.service.withdrawApprovedOvertime({
      actorEmployeeId: actor.employeeId,
      correlationId: request.correlationId ?? actor.correlationId,
      requestId,
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
