import {
  getPrismaClient,
  PrismaLeaveRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { ModuleRoutingModule } from "../routing/module-routing.module";
import { SecurityModule } from "../security/security.module";
import { LegacyLeaveLiffController } from "./legacy-leave-liff.controller";
import { LegacyLeaveLiffService } from "./legacy-leave-liff.service";
import { LeaveController } from "./leave.controller";
import {
  LeaveService,
  LEAVE_REPOSITORY,
} from "./leave.service";

@Module({
  imports: [SecurityModule, ModuleRoutingModule],
  controllers: [LeaveController, LegacyLeaveLiffController],
  providers: [
    LeaveService,
    LegacyLeaveLiffService,
    {
      provide: LEAVE_REPOSITORY,
      useFactory: () =>
        new PrismaLeaveRepository(getPrismaClient()),
    },
  ],
})
export class LeaveModule {}
