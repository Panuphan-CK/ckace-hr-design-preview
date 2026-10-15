import type {
  AnnouncementAdminListResult,
  AnnouncementCreateInput,
  AnnouncementCreateResult,
  AnnouncementListResult,
  AnnouncementUpdateResult,
  AnnouncementDeleteResult,
  AttachmentDownloadResult,
} from "@ckace/contracts";
import type {
  AnnouncementActorScope,
  AnnouncementRepository,
} from "@ckace/database";
import type { PrivateAttachmentStorageService } from "@ckace/storage";
import { ConflictException, Inject, Injectable } from "@nestjs/common";

import { PRIVATE_ATTACHMENT_STORAGE } from "../attachments/attachment.service";

export const ANNOUNCEMENT_REPOSITORY = "CKACE_ANNOUNCEMENT_REPOSITORY";

@Injectable()
export class AnnouncementService {
  constructor(
    @Inject(ANNOUNCEMENT_REPOSITORY)
    private readonly repository: AnnouncementRepository,
    @Inject(PRIVATE_ATTACHMENT_STORAGE)
    private readonly storage: PrivateAttachmentStorageService,
  ) {}

  list(actor: AnnouncementActorScope): Promise<AnnouncementListResult> {
    return this.repository.listVisible(actor);
  }

  adminList(
    actor: AnnouncementActorScope,
  ): Promise<AnnouncementAdminListResult> {
    return this.repository.listAdmin(actor);
  }

  async create(
    actor: AnnouncementActorScope,
    input: AnnouncementCreateInput,
  ): Promise<AnnouncementCreateResult> {
    return { announcement: await this.repository.create(actor, input) };
  }

  async update(
    actor: AnnouncementActorScope,
    announcementId: string,
    input: AnnouncementCreateInput,
  ): Promise<AnnouncementUpdateResult> {
    return {
      announcement: await this.repository.update(
        actor,
        announcementId,
        input,
      ),
    };
  }

  async delete(
    actor: AnnouncementActorScope,
    announcementId: string,
  ): Promise<AnnouncementDeleteResult> {
    try {
      await this.repository.delete(actor, announcementId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Announcement delete failed";
      if (/attachments must be unpublished/i.test(message)) {
        throw new ConflictException(message);
      }
      throw error;
    }
    return { announcementId, deleted: true };
  }

  async downloadAttachment(
    actor: AnnouncementActorScope,
    announcementId: string,
    attachmentId: string,
  ): Promise<AttachmentDownloadResult> {
    const descriptor = await this.repository.getVisibleAttachment(
      actor,
      announcementId,
      attachmentId,
    );
    const grant =
      await this.storage.createRelationAuthorizedDownloadGrant(descriptor);
    return {
      attachmentId,
      download: {
        url: grant.url,
        method: grant.method,
        expiresAt: grant.expiresAt.toISOString(),
        requiredHeaders: grant.requiredHeaders,
      },
    };
  }
}
