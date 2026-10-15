import type { InternalActorContext } from "@ckace/auth";
import type {
  AttachmentDownloadResult,
  AttachmentFinalizeResult,
  AttachmentUploadIntentInput,
  AttachmentUploadIntentResult,
  AttachmentDeleteResult,
} from "@ckace/contracts";
import type { AttachmentRepository } from "@ckace/database";
import type {
  PrivateAttachmentStorageService,
  SignedObjectGrant,
} from "@ckace/storage";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

export const ATTACHMENT_REPOSITORY = "CKACE_ATTACHMENT_REPOSITORY";
export const PRIVATE_ATTACHMENT_STORAGE = "CKACE_PRIVATE_ATTACHMENT_STORAGE";

function mapGrant(grant: SignedObjectGrant) {
  return {
    url: grant.url,
    method: grant.method,
    expiresAt: grant.expiresAt.toISOString(),
    requiredHeaders: grant.requiredHeaders,
  } as const;
}

function translate(error: unknown): never {
  const message = error instanceof Error ? error.message : "Attachment operation failed";
  if (/denied|not assigned|active employee/i.test(message)) {
    throw new ForbiddenException("Attachment access denied");
  }
  if (/unavailable/i.test(message)) {
    throw new NotFoundException("Attachment is unavailable");
  }
  throw new BadRequestException(message);
}

@Injectable()
export class AttachmentService {
  constructor(
    @Inject(ATTACHMENT_REPOSITORY)
    private readonly repository: AttachmentRepository,
    @Inject(PRIVATE_ATTACHMENT_STORAGE)
    private readonly storage: PrivateAttachmentStorageService,
  ) {}

  async createUploadIntent(
    actor: InternalActorContext,
    input: AttachmentUploadIntentInput,
  ): Promise<AttachmentUploadIntentResult> {
    const attachmentId = await this.repository.createMetadata(actor.employeeId, input);
    try {
      const intent = await this.storage.createUploadIntent(actor, {
        attachmentId,
        ownerEmployeeId: actor.employeeId,
        privacyClass: input.privacyClass,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksumSha256: input.checksumSha256,
      });
      await this.repository.assignStorageKey(
        attachmentId,
        actor.employeeId,
        intent.storageKey,
      );
      return { attachmentId, upload: mapGrant(intent.grant) };
    } catch (error) {
      await this.repository.deletePendingMetadata(attachmentId, actor.employeeId);
      translate(error);
    }
  }

  async finalize(
    actor: InternalActorContext,
    attachmentId: string,
  ): Promise<AttachmentFinalizeResult> {
    try {
      const record = await this.repository.getForAccess(attachmentId, actor.employeeId);
      if (record.finalizedAt) {
        return { attachmentId, finalized: true };
      }
      await this.storage.verifyUploadedObject(actor, record.descriptor);
      await this.repository.markFinalized(attachmentId, actor.employeeId);
      return { attachmentId, finalized: true };
    } catch (error) {
      return translate(error);
    }
  }

  async createDownload(
    actor: InternalActorContext,
    attachmentId: string,
  ): Promise<AttachmentDownloadResult> {
    try {
      const record = await this.repository.getForAccess(attachmentId, actor.employeeId);
      if (!record.finalizedAt) {
        throw new Error("Attachment is not finalized");
      }
      const grant = await this.storage.createDownloadGrant(actor, record.descriptor);
      return { attachmentId, download: mapGrant(grant) };
    } catch (error) {
      return translate(error);
    }
  }

  async delete(
    actor: InternalActorContext,
    attachmentId: string,
  ): Promise<AttachmentDeleteResult> {
    try {
      const record = await this.repository.getForAccess(attachmentId, actor.employeeId);
      if (record.linked) {
        throw new Error("Linked attachment cannot be deleted directly");
      }
      await this.storage.delete(actor, record.descriptor);
      await this.repository.deleteUnlinkedMetadata(attachmentId, actor.employeeId);
      return { attachmentId, deleted: true };
    } catch (error) {
      return translate(error);
    }
  }
}
