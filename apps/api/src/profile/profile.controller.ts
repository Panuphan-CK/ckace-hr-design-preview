import type { SelfProfileResponse } from "@ckace/contracts";
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import { AuthorizationGuard } from "../security/authorization.guard";
import { RequireSelfPermission } from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { ProfileService } from "./profile.service";

@Controller("profile")
@UseGuards(AuthorizationGuard)
export class ProfileController {
  constructor(
    @Inject(ProfileService)
    private readonly profileService: ProfileService,
  ) {}

  @Get("me")
  @ModuleRoute("IDENTITY_READ")
  @RequireSelfPermission("profile.self.read")
  async getSelf(
    @Req() request: SecurityRequest,
  ): Promise<SelfProfileResponse> {
    if (!request.actor) {
      throw new UnauthorizedException();
    }

    return this.profileService.getSelfProfile(
      request.actor.employeeId,
    );
  }

  @Post("password")
  @ModuleRoute("IDENTITY_WRITE")
  @RequireSelfPermission("profile.self.write")
  async changePassword(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<{ readonly changed: true }> {
    if (!request.actor) {
      throw new UnauthorizedException();
    }

    return this.profileService.changePassword({
      employeeId: request.actor.employeeId,
      correlationId: request.correlationId ?? request.actor.correlationId,
      body,
    });
  }
}
