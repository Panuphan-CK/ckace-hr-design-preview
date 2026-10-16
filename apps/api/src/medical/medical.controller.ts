import type {
  ApprovalChainPreview,
  MedicalApprovalQueueItem,
  MedicalCancelResult,
  MedicalCreateResult,
  MedicalDecisionResult,
  MedicalResubmitResult,
  MedicalSelfOverview,
  MedicalWithdrawResult,
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
import { MedicalService } from "./medical.service";

@Controller("medical")
@UseGuards(AuthorizationGuard)
export class MedicalController {
  constructor(
    @Inject(MedicalService)
    private readonly service:
      MedicalService,
  ) {}

  @Get("me")
  @ModuleRoute("MEDICAL_READ")
  @RequireSelfPermission(
    "medical.self.read",
  )
  async getSelf(
    @Req() request: SecurityRequest,
  ): Promise<MedicalSelfOverview> {
    const actor =
      this.requireActor(request);

    return this.service.getSelfOverview(
      actor.employeeId,
    );
  }

  @Get("assigned")
  @ModuleRoute("MEDICAL_READ")
  @RequirePermission(
    "medical.approve",
    "GLOBAL",
  )
  async getAssigned(
    @Req() request: SecurityRequest,
  ): Promise<
    readonly MedicalApprovalQueueItem[]
  > {
    const actor =
      this.requireActor(request);

    return this.service.getAssignedApprovals(
      actor.employeeId,
    );
  }

  @Get("approval-chain")
  @ModuleRoute("MEDICAL_READ")
  @RequireSelfPermission("medical.self.read")
  async approvalChain(@Req() request: SecurityRequest): Promise<ApprovalChainPreview> {
    const actor = this.requireActor(request);

    return this.service.previewApprovalChain(actor.employeeId);
  }

  @Post("claims")
  @ModuleRoute("MEDICAL_WRITE")
  @RequireSelfPermission(
    "medical.self.write",
  )
  async create(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<MedicalCreateResult> {
    const actor =
      this.requireActor(request);

    return this.service.createSelfMedical({
      employeeId:
        actor.employeeId,
      correlationId:
        request.correlationId ??
        actor.correlationId,
      body,
    });
  }

  @Post("claims/:claimId/resubmit")
  @ModuleRoute("MEDICAL_WRITE")
  @RequireSelfPermission("medical.self.write")
  async resubmit(
    @Req() request: SecurityRequest,
    @Param("claimId") claimId: string,
    @Body() body: unknown,
  ): Promise<MedicalResubmitResult> {
    const actor = this.requireActor(request);

    return this.service.resubmitMedical({
      employeeId: actor.employeeId,
      correlationId: request.correlationId ?? actor.correlationId,
      claimId,
      body,
    });
  }

  @Post("claims/:claimId/withdraw")
  @ModuleRoute("MEDICAL_WRITE")
  @RequirePermission("medical.approved.withdraw", "GLOBAL")
  async withdraw(
    @Req() request: SecurityRequest,
    @Param("claimId") claimId: string,
    @Body() body: unknown,
  ): Promise<MedicalWithdrawResult> {
    const actor = this.requireActor(request);

    return this.service.withdrawApprovedMedical({
      actorEmployeeId: actor.employeeId,
      correlationId: request.correlationId ?? actor.correlationId,
      claimId,
      body,
    });
  }

  @Post("claims/:claimId/cancel")
  @ModuleRoute("MEDICAL_WRITE")
  @RequireSelfPermission(
    "medical.self.write",
  )
  async cancel(
    @Req() request: SecurityRequest,
    @Param("claimId") claimId: string,
  ): Promise<MedicalCancelResult> {
    const actor =
      this.requireActor(request);

    return this.service.cancelSelfMedical({
      employeeId:
        actor.employeeId,
      correlationId:
        request.correlationId ??
        actor.correlationId,
      claimId,
    });
  }

  @Post("claims/:claimId/decision")
  @ModuleRoute("MEDICAL_WRITE")
  @RequirePermission(
    "medical.approve",
    "GLOBAL",
  )
  async decide(
    @Req() request: SecurityRequest,
    @Param("claimId") claimId: string,
    @Body() body: unknown,
  ): Promise<MedicalDecisionResult> {
    const actor =
      this.requireActor(request);

    return this.service.decideAssignedMedical({
      approverEmployeeId:
        actor.employeeId,
      correlationId:
        request.correlationId ??
        actor.correlationId,
      claimId,
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
