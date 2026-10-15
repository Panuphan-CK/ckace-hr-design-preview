import type { BenefitsSelfOverview } from "@ckace/contracts";
import {
  Controller,
  Get,
  Inject,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import { AuthorizationGuard } from "../security/authorization.guard";
import { RequireSelfPermission } from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { BenefitsService } from "./benefits.service";

@Controller("benefits")
@UseGuards(AuthorizationGuard)
export class BenefitsController {
  constructor(@Inject(BenefitsService) private readonly service: BenefitsService) {}

  @Get("me")
  @ModuleRoute("BENEFITS_READ")
  @RequireSelfPermission("benefits.self.read")
  async getSelf(@Req() request: SecurityRequest): Promise<BenefitsSelfOverview> {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.getSelfOverview(request.actor.employeeId);
  }
}
