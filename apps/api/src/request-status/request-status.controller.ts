import type {
  ApprovalHistoryOverview,
  RequestStatusOverview,
  RequestTimeline,
} from "@ckace/contracts";
import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import { AuthorizationGuard } from "../security/authorization.guard";
import {
  RequireSelfPermission,
} from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { RequestStatusService } from "./request-status.service";

@Controller("requests")
@UseGuards(AuthorizationGuard)
export class RequestStatusController {
  constructor(
    @Inject(RequestStatusService)
    private readonly service: RequestStatusService,
  ) {}

  @Get("me")
  @ModuleRoute("REQUEST_STATUS_READ")
  @RequireSelfPermission("requests.self.read")
  getSelf(@Req() request: SecurityRequest): Promise<RequestStatusOverview> {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.getSelf(request.actor.employeeId);
  }

  @Get("assigned")
  @ModuleRoute("REQUEST_STATUS_READ")
  getAssigned(@Req() request: SecurityRequest): Promise<RequestStatusOverview> {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.getAssigned(
      request.actor.employeeId,
      request.actor.permissions,
    );
  }

  @Get("timeline/:requestId")
  @ModuleRoute("REQUEST_STATUS_READ")
  getTimeline(
    @Req() request: SecurityRequest,
    @Param("requestId") requestId: string,
  ): Promise<RequestTimeline> {
    if (!request.actor) throw new UnauthorizedException();
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
      throw new BadRequestException("Invalid request ID");
    }
    return this.service.getTimeline(request.actor.employeeId, requestId);
  }

  @Get("assigned/history")
  @ModuleRoute("REQUEST_STATUS_READ")
  getApprovalHistory(
    @Req() request: SecurityRequest,
  ): Promise<ApprovalHistoryOverview> {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.getApprovalHistory(
      request.actor.employeeId,
      request.actor.permissions,
    );
  }
}
