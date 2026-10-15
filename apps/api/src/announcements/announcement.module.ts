import {
  getPrismaClient,
  PrismaAnnouncementRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { AttachmentModule } from "../attachments/attachment.module";
import { SecurityModule } from "../security/security.module";
import { AnnouncementController } from "./announcement.controller";
import {
  ANNOUNCEMENT_REPOSITORY,
  AnnouncementService,
} from "./announcement.service";

@Module({
  imports: [SecurityModule, AttachmentModule],
  controllers: [AnnouncementController],
  providers: [
    AnnouncementService,
    {
      provide: ANNOUNCEMENT_REPOSITORY,
      useFactory: () => new PrismaAnnouncementRepository(getPrismaClient()),
    },
  ],
})
export class AnnouncementModule {}
