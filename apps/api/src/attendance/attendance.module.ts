import {
  getPrismaClient,
  PrismaAttendanceRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import { AttendanceController } from "./attendance.controller";
import {
  AttendanceService,
  ATTENDANCE_REPOSITORY,
} from "./attendance.service";

@Module({
  imports: [SecurityModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    {
      provide: ATTENDANCE_REPOSITORY,
      useFactory: () =>
        new PrismaAttendanceRepository(getPrismaClient()),
    },
  ],
})
export class AttendanceModule {}
