import type {
  ApprovalChainPreview,
  AttendanceSelfOverview,
  AttendanceWriteResult,
  TimeCorrectionCancelResult,
  TimeCorrectionCreateResult,
  TimeCorrectionDecisionResult,
  TimeCorrectionRequestView,
  TimeCorrectionResubmitResult,
  TimeCorrectionWithdrawResult,
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
import { AttendanceService } from "./attendance.service";

@Controller("attendance")
@UseGuards(AuthorizationGuard)
export class AttendanceController {
  constructor(
    @Inject(AttendanceService)
    private readonly service: AttendanceService,
  ) {}

  @Get("me")
  @ModuleRoute("ATTENDANCE_READ")
  @RequireSelfPermission("attendance.self.read")
  async getSelf(
    @Req() request: SecurityRequest,
  ): Promise<AttendanceSelfOverview> {
    const actor = this.requireActor(request);
    return this.service.getSelfOverview(actor.employeeId);
  }

  @Post("check-in")
  @ModuleRoute("ATTENDANCE_WRITE")
  @RequireSelfPermission("attendance.self.write")
  async checkIn(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<AttendanceWriteResult> {
    const actor = this.requireActor(request);

    return this.service.checkIn({
      employeeId: actor.employeeId,
      correlationId:
        request.correlationId ?? actor.correlationId,
      body,
    });
  }

  @Post("check-out")
  @ModuleRoute("ATTENDANCE_WRITE")
  @RequireSelfPermission("attendance.self.write")
  async checkOut(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<AttendanceWriteResult> {
    const actor = this.requireActor(request);

    return this.service.checkOut({
      employeeId: actor.employeeId,
      correlationId:
        request.correlationId ?? actor.correlationId,
      body,
    });
  }

  @Get("time-corrections/me")
  @ModuleRoute("TIME_CORRECTION_READ")
  @RequireSelfPermission("time_correction.self.read")
  async getSelfTimeCorrections(
    @Req() request: SecurityRequest,
  ): Promise<readonly TimeCorrectionRequestView[]> {
    const actor = this.requireActor(request);
    return this.service.getSelfTimeCorrections(
      actor.employeeId,
    );
  }

  @Get("time-corrections/assigned")
  @ModuleRoute("TIME_CORRECTION_READ")
  @RequirePermission("time_correction.approve", "GLOBAL")
  async getAssignedTimeCorrections(
    @Req() request: SecurityRequest,
  ): Promise<readonly TimeCorrectionRequestView[]> {
    const actor = this.requireActor(request);
    return this.service.getAssignedTimeCorrections(
      actor.employeeId,
    );
  }

  @Get("time-corrections/approval-chain")
  @ModuleRoute("TIME_CORRECTION_READ")
  @RequireSelfPermission("time_correction.self.read")
  async timeCorrectionApprovalChain(@Req() request: SecurityRequest): Promise<ApprovalChainPreview> {
    const actor = this.requireActor(request);

    return this.service.previewTimeCorrectionApprover(actor.employeeId);
  }

  @Post("time-corrections")
  @ModuleRoute("TIME_CORRECTION_WRITE")
  @RequireSelfPermission("time_correction.self.write")
  async createTimeCorrection(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<TimeCorrectionCreateResult> {
    const actor = this.requireActor(request);

    return this.service.createSelfTimeCorrection({
      employeeId: actor.employeeId,
      correlationId:
        request.correlationId ?? actor.correlationId,
      body,
    });
  }

  @Post("time-corrections/:requestId/resubmit")
  @ModuleRoute("TIME_CORRECTION_WRITE")
  @RequireSelfPermission("time_correction.self.write")
  async resubmitTimeCorrection(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
    @Body() body: unknown,
  ): Promise<TimeCorrectionResubmitResult> {
    const actor = this.requireActor(request);

    return this.service.resubmitTimeCorrection({
      employeeId: actor.employeeId,
      correlationId: request.correlationId ?? actor.correlationId,
      requestId,
      body,
    });
  }

  @Post("time-corrections/:requestId/withdraw")
  @ModuleRoute("TIME_CORRECTION_WRITE")
  @RequirePermission("time_correction.approved.withdraw", "GLOBAL")
  async withdrawTimeCorrection(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
    @Body() body: unknown,
  ): Promise<TimeCorrectionWithdrawResult> {
    const actor = this.requireActor(request);

    return this.service.withdrawApprovedTimeCorrection({
      actorEmployeeId: actor.employeeId,
      correlationId: request.correlationId ?? actor.correlationId,
      requestId,
      body,
    });
  }

  @Post("time-corrections/:requestId/cancel")
  @ModuleRoute("TIME_CORRECTION_WRITE")
  @RequireSelfPermission("time_correction.self.write")
  async cancelTimeCorrection(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
  ): Promise<TimeCorrectionCancelResult> {
    const actor = this.requireActor(request);

    return this.service.cancelSelfTimeCorrection({
      employeeId: actor.employeeId,
      correlationId:
        request.correlationId ?? actor.correlationId,
      requestId,
    });
  }

  @Post("time-corrections/:requestId/decision")
  @ModuleRoute("TIME_CORRECTION_WRITE")
  @RequirePermission("time_correction.approve", "GLOBAL")
  async decideTimeCorrection(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
    @Body() body: unknown,
  ): Promise<TimeCorrectionDecisionResult> {
    const actor = this.requireActor(request);

    return this.service.decideAssignedTimeCorrection({
      approverEmployeeId: actor.employeeId,
      correlationId:
        request.correlationId ?? actor.correlationId,
      requestId,
      body,
    });
  }

  private requireActor(request: SecurityRequest) {
    if (!request.actor) {
      throw new UnauthorizedException();
    }

    return request.actor;
  }
}
