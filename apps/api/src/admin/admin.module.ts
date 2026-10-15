import {
  getPrismaClient,
  PrismaNotificationAdminRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import { AdminController } from "./admin.controller";
import {
  AdminService,
  NOTIFICATION_ADMIN_REPOSITORY,
} from "./admin.service";

@Module({
  imports: [SecurityModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    {
      provide: NOTIFICATION_ADMIN_REPOSITORY,
      useFactory: () => new PrismaNotificationAdminRepository(getPrismaClient()),
    },
  ],
})
export class AdminModule {}
