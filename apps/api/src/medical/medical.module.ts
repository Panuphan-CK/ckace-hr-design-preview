import {
  getPrismaClient,
  PrismaMedicalRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import { MedicalController } from "./medical.controller";
import {
  MedicalService,
  MEDICAL_REPOSITORY,
} from "./medical.service";

@Module({
  imports: [SecurityModule],
  controllers: [MedicalController],
  providers: [
    MedicalService,
    {
      provide: MEDICAL_REPOSITORY,
      useFactory: () =>
        new PrismaMedicalRepository(
          getPrismaClient(),
        ),
    },
  ],
})
export class MedicalModule {}
