import type { InternalActorContext } from "@ckace/auth";
import type { AttachmentRepository } from "@ckace/database";
import { PrivateAttachmentStorageService } from "@ckace/storage";
import { describe, expect, it, vi } from "vitest";

import { AttachmentService } from "./attachment.service";

const actor: InternalActorContext = {
  employeeId: "00000000-0000-4000-8000-000000000001",
  legacyUid: null,
  roles: ["EMPLOYEE"],
  permissions: ["storage.attachment.self.write", "storage.attachment.self.read"],
  agencyId: null,
  departmentId: null,
  authenticatedBy: "PROJECT_B_WEB",
  correlationId: "attachment-test",
};

describe("Attachment API service", () => {
  it("returns only signed grant + attachment id and finalizes after storage verification", async () => {
    const repository = {
      createMetadata: vi.fn(async () => "00000000-0000-4000-8000-000000000010"),
      assignStorageKey: vi.fn(async () => undefined),
      getForAccess: vi.fn(async () => ({
        descriptor: {
          id: "00000000-0000-4000-8000-000000000010",
          ownerEmployeeId: actor.employeeId,
          privacyClass: "EMPLOYEE_PRIVATE" as const,
          storageProvider: "R2" as const,
          storageKey: "attachments/v1/00000000-0000-4000-8000-000000000010/00000000-0000-4000-8000-000000000011",
          originalFilename: "x.pdf",
          mimeType: "application/pdf",
          sizeBytes: 10n,
          checksumSha256: "a".repeat(64),
        },
        finalizedAt: null,
        linked: false,
        medicalRelationAuthorized: true,
      })),
      markFinalized: vi.fn(async () => undefined),
      deletePendingMetadata: vi.fn(async () => undefined),
      deleteUnlinkedMetadata: vi.fn(async () => undefined),
    } satisfies AttachmentRepository;
    const store = {
      createUploadGrant: vi.fn(async () => ({
        url: "https://signed.example/upload",
        method: "PUT" as const,
        expiresAt: new Date("2026-10-05T00:05:00.000Z"),
        requiredHeaders: { "content-type": "application/pdf" },
      })),
      createDownloadGrant: vi.fn(),
      inspectObject: vi.fn(async () => ({
        sizeBytes: 10,
        mimeType: "application/pdf",
        checksumSha256: "a".repeat(64),
      })),
      deleteObject: vi.fn(),
    };
    const storage = new PrivateAttachmentStorageService(store);
    const service = new AttachmentService(repository, storage);
    const upload = await service.createUploadIntent(actor, {
      privacyClass: "EMPLOYEE_PRIVATE",
      originalFilename: "x.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
      checksumSha256: "a".repeat(64),
    });
    expect(JSON.stringify(upload)).not.toMatch(/storageKey|secret/i);
    await expect(service.finalize(actor, upload.attachmentId)).resolves.toEqual({
      attachmentId: upload.attachmentId,
      finalized: true,
    });
    expect(store.inspectObject).toHaveBeenCalledOnce();
    expect(repository.markFinalized).toHaveBeenCalledOnce();
  });
});
