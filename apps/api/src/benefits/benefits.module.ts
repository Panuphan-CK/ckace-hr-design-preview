import {
  getPrismaClient,
  PrismaMedicalRepository,
  PrismaOvertimeRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import { BenefitsController } from "./benefits.controller";
import {
  BENEFITS_MEDICAL_REPOSITORY,
  BENEFITS_OVERTIME_REPOSITORY,
  BenefitsService,
} from "./benefits.service";

@Module({
  imports: [SecurityModule],
  controllers: [BenefitsController],
  providers: [
    BenefitsService,
    {
      provide: BENEFITS_OVERTIME_REPOSITORY,
      useFactory: () => new PrismaOvertimeRepository(getPrismaClient()),
    },
    {
      provide: BENEFITS_MEDICAL_REPOSITORY,
      useFactory: () => new PrismaMedicalRepository(getPrismaClient()),
    },
  ],
})
export class BenefitsModule {}
