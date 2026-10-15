import type { InternalActorContext } from "@ckace/auth";

import {
  assertPrivateAttachmentAccess,
} from "./access-policy";
import {
  assertPrivateAttachmentStorageKey,
  createPrivateAttachmentStorageKey,
} from "./object-key";
import type {
  PrivateAttachmentDescriptor,
  PrivateObjectStore,
  SignedObjectGrant,
  UploadIntent,
  UploadIntentInput,
} from "./types";
import {
  validateGrantTtlSeconds,
  validateUploadMetadata,
} from "./validation";

const DEFAULT_GRANT_TTL_SECONDS = 300;

export class PrivateAttachmentStorageService {
  constructor(
    private readonly objectStore: PrivateObjectStore,
    private readonly grantTtlSeconds = DEFAULT_GRANT_TTL_SECONDS,
  ) {
    validateGrantTtlSeconds(grantTtlSeconds);
  }

  async createUploadIntent(
    actor: InternalActorContext,
    input: UploadIntentInput,
  ): Promise<UploadIntent> {
    validateUploadMetadata(input);

    assertPrivateAttachmentAccess(
      actor,
      {
        ownerEmployeeId: input.ownerEmployeeId,
        privacyClass: input.privacyClass,
      },
      "WRITE",
    );

    const storageKey = createPrivateAttachmentStorageKey(
      input.attachmentId,
    );

    const grant = await this.objectStore.createUploadGrant({
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      expiresInSeconds: this.grantTtlSeconds,
    });

    return {
      storageProvider: "R2",
      storageKey,
      grant,
    };
  }

  async createDownloadGrant(
    actor: InternalActorContext,
    attachment: PrivateAttachmentDescriptor,
  ): Promise<SignedObjectGrant> {
    this.assertR2Attachment(attachment);
    assertPrivateAttachmentAccess(actor, attachment, "READ");

    return this.objectStore.createDownloadGrant({
      storageKey: attachment.storageKey,
      downloadFilename: attachment.originalFilename,
      expiresInSeconds: this.grantTtlSeconds,
    });
  }

  async createRelationAuthorizedDownloadGrant(
    attachment: PrivateAttachmentDescriptor,
  ): Promise<SignedObjectGrant> {
    this.assertR2Attachment(attachment);
    if (attachment.privacyClass !== "INTERNAL") {
      throw new Error("Relation-authorized download supports INTERNAL attachments only");
    }
    return this.objectStore.createDownloadGrant({
      storageKey: attachment.storageKey,
      downloadFilename: attachment.originalFilename,
      expiresInSeconds: this.grantTtlSeconds,
    });
  }

  async verifyUploadedObject(
    actor: InternalActorContext,
    attachment: PrivateAttachmentDescriptor,
  ): Promise<void> {
    this.assertR2Attachment(attachment);
    assertPrivateAttachmentAccess(actor, attachment, "WRITE");

    if (
      !attachment.mimeType ||
      attachment.sizeBytes === null ||
      !attachment.checksumSha256
    ) {
      throw new Error("Attachment finalization metadata is incomplete");
    }

    const inspection = await this.objectStore.inspectObject(
      attachment.storageKey,
    );
    const expectedSize = Number(attachment.sizeBytes);

    if (
      !Number.isSafeInteger(expectedSize) ||
      inspection.sizeBytes !== expectedSize
    ) {
      throw new Error("Uploaded attachment size does not match declared metadata");
    }

    if (inspection.mimeType !== attachment.mimeType) {
      throw new Error("Uploaded attachment MIME type does not match declared metadata");
    }

    if (
      inspection.checksumSha256.toLowerCase() !==
      attachment.checksumSha256.toLowerCase()
    ) {
      throw new Error("Uploaded attachment checksum does not match declared metadata");
    }
  }

  async delete(
    actor: InternalActorContext,
    attachment: PrivateAttachmentDescriptor,
  ): Promise<void> {
    this.assertR2Attachment(attachment);
    assertPrivateAttachmentAccess(actor, attachment, "DELETE");
    await this.objectStore.deleteObject(attachment.storageKey);
  }

  private assertR2Attachment(
    attachment: PrivateAttachmentDescriptor,
  ): void {
    if (attachment.storageProvider !== "R2") {
      throw new Error("Only R2 attachments are supported by this service");
    }

    assertPrivateAttachmentStorageKey(attachment.storageKey);
  }
}
