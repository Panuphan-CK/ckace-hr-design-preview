import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import { AuthorizationGuard } from "./authorization.guard";
import { PasswordRecoveryService } from "./password-recovery.service";
import { RequirePermission } from "./require-permission.decorator";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function bodyObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Body is required");
  }
  return body as Record<string, unknown>;
}

@Controller("password-recovery")
export class PasswordRecoveryController {
  constructor(
    @Inject(PasswordRecoveryService)
    private readonly service: PasswordRecoveryService,
  ) {}

  @Post("admin/users/:employeeId/issue")
  @ModuleRoute("ADMIN_WRITE")
  @UseGuards(AuthorizationGuard)
  @RequirePermission("credentials.reset.issue", "GLOBAL")
  issue(@Param("employeeId") employeeId: string) {
    if (!UUID.test(employeeId)) {
      throw new BadRequestException("Invalid employee ID");
    }
    return this.service.issue(employeeId);
  }

  @Post("request")
  @ModuleRoute("IDENTITY_WRITE")
  request(@Body() body: unknown) {
    const value = bodyObject(body);
    return this.service.requestByLogin(value.login);
  }

  @Post("preview")
  @ModuleRoute("IDENTITY_WRITE")
  preview(@Body() body: unknown) {
    const value = bodyObject(body);
    if (typeof value.token !== "string" || !value.token.trim()) {
      throw new BadRequestException("token is required");
    }
    return this.service.preview(value.token);
  }

  @Post("reset")
  @ModuleRoute("IDENTITY_WRITE")
  reset(@Body() body: unknown) {
    const value = bodyObject(body);
    if (typeof value.token !== "string" || !value.token.trim()) {
      throw new BadRequestException("token is required");
    }
    if (
      typeof value.password !== "string" ||
      value.password.length < 8 ||
      value.password.length > 200
    ) {
      throw new BadRequestException(
        "Password must be 8-200 characters",
      );
    }
    return this.service.reset(value.token, value.password);
  }
}
