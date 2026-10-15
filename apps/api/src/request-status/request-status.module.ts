import {
  getPrismaClient, PrismaRequestStatusRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import { RequestStatusController } from "./request-status.controller";
import {
  REQUEST_STATUS_REPOSITORY, RequestStatusService,
} from "./request-status.service";

@Module({
  imports: [SecurityModule],
  controllers: [RequestStatusController],
  providers: [
    RequestStatusService,
    {
      provide: REQUEST_STATUS_REPOSITORY,
      useFactory: () => new PrismaRequestStatusRepository(getPrismaClient()),
    },
  ],
})
export class RequestStatusModule {}
