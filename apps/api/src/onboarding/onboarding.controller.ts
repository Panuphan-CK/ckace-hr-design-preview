import type {
  EmployeeRegistrationInput,
  ImportedDesktopActivationInput,
  PendingEmployeeApprovalInput,
  PendingLineBindingInput,
} from "@ckace/contracts";
import {
  BadRequestException,
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
import { RequirePermission } from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { OnboardingService } from "./onboarding.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function obj(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") throw new BadRequestException("Body is required");
  return body as Record<string, unknown>;
}
function textValue(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new BadRequestException(`${name} is required`);
  return value.trim();
}

@Controller("onboarding")
export class OnboardingController {
  constructor(@Inject(OnboardingService) private readonly service: OnboardingService) {}

  @Post("register")
  @ModuleRoute("ONBOARDING_WRITE")
  register(@Body() body: unknown) {
    const value = obj(body);
    const input: EmployeeRegistrationInput = {
      username: textValue(value.username, "username"),
      password: textValue(value.password, "password"),
      fullName: textValue(value.fullName, "fullName"),
      nickname: typeof value.nickname === "string" ? value.nickname : null,
      dateOfBirth: textValue(value.dateOfBirth, "dateOfBirth"),
      employmentStart: textValue(value.employmentStart, "employmentStart"),
    };
    return this.service.register(input);
  }

  @Post("desktop-activate")
  @ModuleRoute("ONBOARDING_WRITE")
  activateDesktop(@Body() body: unknown) {
    const value = obj(body);
    const input: ImportedDesktopActivationInput = {
      password: textValue(value.password, "password"),
      lineIdToken: textValue(value.lineIdToken, "lineIdToken"),
    };
    return this.service.activateImportedDesktop(input);
  }

  @Post("line-bind")
  @ModuleRoute("ONBOARDING_WRITE")
  bindLine(@Body() body: unknown) {
    const value = obj(body);
    const input: PendingLineBindingInput = {
      username: textValue(value.username, "username"),
      password: textValue(value.password, "password"),
      lineIdToken: textValue(value.lineIdToken, "lineIdToken"),
    };
    return this.service.bindLine(input);
  }

  @Get("pending")
  @ModuleRoute("ONBOARDING_READ")
  @UseGuards(AuthorizationGuard)
  @RequirePermission("onboarding.admin.approve", "GLOBAL")
  listPending(@Req() request: SecurityRequest) {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.listPending();
  }

  @Get("approval-options")
  @ModuleRoute("ONBOARDING_READ")
  @UseGuards(AuthorizationGuard)
  @RequirePermission("onboarding.admin.approve", "GLOBAL")
  approvalOptions(@Req() request: SecurityRequest) {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.getApprovalOptions();
  }

  @Post("employees/:id/approve")
  @ModuleRoute("ONBOARDING_WRITE")
  @UseGuards(AuthorizationGuard)
  @RequirePermission("onboarding.admin.approve", "GLOBAL")
  approve(
    @Req() request: SecurityRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    if (!request.actor) throw new UnauthorizedException();
    if (!UUID.test(id)) throw new BadRequestException("Invalid employee ID");
    const value = obj(body);
    const input: PendingEmployeeApprovalInput = {
      agencyId: textValue(value.agencyId, "agencyId"),
      departmentId: textValue(value.departmentId, "departmentId"),
    };
    if (!UUID.test(input.agencyId) || !UUID.test(input.departmentId)) {
      throw new BadRequestException("Invalid organization ID");
    }
    return this.service.approve(id, input, request.actor.employeeId);
  }
}
