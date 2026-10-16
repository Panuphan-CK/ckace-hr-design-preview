import { getPrismaClient, PrismaDelegationRepository } from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import { DelegationController } from "./delegation.controller";
import { DELEGATION_REPOSITORY, DelegationService } from "./delegation.service";

@Module({
  imports: [SecurityModule],
  controllers: [DelegationController],
  providers: [
    DelegationService,
    {
      provide: DELEGATION_REPOSITORY,
      useFactory: () => new PrismaDelegationRepository(getPrismaClient()),
    },
  ],
})
export class DelegationModule {}
