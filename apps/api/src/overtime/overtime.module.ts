import {
  getPrismaClient,
  PrismaOvertimeRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import { OvertimeController } from "./overtime.controller";
import {
  OvertimeService,
  OVERTIME_REPOSITORY,
} from "./overtime.service";

@Module({
  imports: [SecurityModule],
  controllers: [OvertimeController],
  providers: [
    OvertimeService,
    {
      provide: OVERTIME_REPOSITORY,
      useFactory: () =>
        new PrismaOvertimeRepository(
          getPrismaClient(),
        ),
    },
  ],
})
export class OvertimeModule {}
