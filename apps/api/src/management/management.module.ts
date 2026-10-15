import {
  getPrismaClient,
  PrismaManagementRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import { ManagementController } from "./management.controller";
import {
  MANAGEMENT_REPOSITORY,
  ManagementService,
} from "./management.service";

@Module({
  imports: [SecurityModule],
  controllers: [ManagementController],
  providers: [
    ManagementService,
    {
      provide: MANAGEMENT_REPOSITORY,
      useFactory: () =>
        new PrismaManagementRepository(getPrismaClient()),
    },
  ],
})
export class ManagementModule {}
