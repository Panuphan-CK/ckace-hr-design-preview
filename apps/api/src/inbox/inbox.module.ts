import { getPrismaClient, PrismaInboxRepository } from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import { InboxController } from "./inbox.controller";
import { INBOX_REPOSITORY, InboxService } from "./inbox.service";

@Module({
  imports: [SecurityModule],
  controllers: [InboxController],
  providers: [
    InboxService,
    {
      provide: INBOX_REPOSITORY,
      useFactory: () => new PrismaInboxRepository(getPrismaClient()),
    },
  ],
})
export class InboxModule {}
