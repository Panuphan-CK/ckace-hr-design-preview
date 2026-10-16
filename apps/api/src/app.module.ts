import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common";

import { AdminModule } from "./admin/admin.module";
import { AnnouncementModule } from "./announcements/announcement.module";
import { AttachmentModule } from "./attachments/attachment.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { BenefitsModule } from "./benefits/benefits.module";
import { HealthController } from "./health.controller";
import { LeaveModule } from "./leave/leave.module";
import { MedicalModule } from "./medical/medical.module";
import { ManagementModule } from "./management/management.module";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { OvertimeModule } from "./overtime/overtime.module";
import { DelegationModule } from "./delegation/delegation.module";
import { ProfileModule } from "./profile/profile.module";
import { RequestStatusModule } from "./request-status/request-status.module";
import { ModuleRoutingModule } from "./routing/module-routing.module";
import { CorrelationMiddleware } from "./runtime/correlation.middleware";
import { RuntimeReadinessService } from "./runtime/runtime-readiness.service";
import { BridgeActorMiddleware } from "./security/bridge-actor.middleware";
import { DesktopSessionMiddleware } from "./security/desktop-session.middleware";
import { SecurityModule } from "./security/security.module";
import { Task32R2Module } from "./task32/task32-r2.module";
import { Task34R2Module } from "./task34/task34-r2.module";

@Module({
  imports: [
    SecurityModule,
    ModuleRoutingModule,
    ProfileModule,
    DelegationModule,
    LeaveModule,
    AttendanceModule,
    OvertimeModule,
    MedicalModule,
    BenefitsModule,
    ManagementModule,
    RequestStatusModule,
    AnnouncementModule,
    AttachmentModule,
    AdminModule,
    OnboardingModule,
    Task32R2Module,
    Task34R2Module,
  ],
  controllers: [HealthController],
  providers: [
    RuntimeReadinessService,
    DesktopSessionMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(
        CorrelationMiddleware,
        BridgeActorMiddleware,
        DesktopSessionMiddleware,
      )
      .forRoutes("{*path}");
  }
}
