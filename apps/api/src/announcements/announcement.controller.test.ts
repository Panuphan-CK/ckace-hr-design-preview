import type { AnnouncementRepository } from "@ckace/database";
import { PrivateAttachmentStorageService } from "@ckace/storage";
import {
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { REQUIRE_PERMISSION_KEY } from "../security/require-permission.decorator";
import { AnnouncementController } from "./announcement.controller";
import { AnnouncementService } from "./announcement.service";

function storage(): PrivateAttachmentStorageService {
  return new PrivateAttachmentStorageService({
    createUploadGrant: vi.fn(),
    createDownloadGrant: vi.fn(async () => ({
      url: "https://signed.invalid/announcement",
      method: "GET" as const,
      expiresAt: new Date("2026-10-05T22:00:00.000Z"),
      requiredHeaders: {},
    })),
    inspectObject: vi.fn(),
    deleteObject: vi.fn(),
  });
}

describe("Announcement API", () => {
  it("requires explicit read/admin permissions including relation download", () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, AnnouncementController.prototype.list))
      .toEqual({ permission: "announcements.read", scope: "GLOBAL" });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, AnnouncementController.prototype.adminList))
      .toEqual({ permission: "announcements.admin.write", scope: "GLOBAL" });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, AnnouncementController.prototype.create))
      .toEqual({ permission: "announcements.admin.write", scope: "GLOBAL" });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, AnnouncementController.prototype.update))
      .toEqual({ permission: "announcements.admin.write", scope: "GLOBAL" });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, AnnouncementController.prototype.delete))
      .toEqual({ permission: "announcements.admin.delete", scope: "GLOBAL" });
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, AnnouncementController.prototype.downloadAttachment))
      .toEqual({ permission: "announcements.read", scope: "GLOBAL" });
  });

  it("rejects attachment relinking through announcement update", () => {
    const service = {
      update: vi.fn(),
    } as unknown as AnnouncementService;
    const controller = new AnnouncementController(service);

    expect(() =>
      controller.update(
        {
          actor: {
            employeeId: "00000000-0000-4000-8000-000000000002",
            legacyUid: null,
            roles: ["ADMIN"],
            permissions: ["announcements.admin.write"],
            agencyId: null,
            departmentId: null,
            authenticatedBy: "PROJECT_B_WEB",
            correlationId: "task39-5-announcement-test",
          },
        },
        "00000000-0000-4000-8000-000000000001",
        {
          title: "Updated",
          content: "Updated content",
          scope: "GLOBAL",
          attachmentIds: [
            "00000000-0000-4000-8000-000000000010",
          ],
        },
      ),
    ).toThrow(BadRequestException);
    expect(service.update).not.toHaveBeenCalled();
  });

  it("maps attachment-bearing announcement deletion to conflict", async () => {
    const repository = {
      listVisible: vi.fn(),
      listAdmin: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(async () => {
        throw new Error(
          "Announcement with attachments must be unpublished instead of deleted",
        );
      }),
      getVisibleAttachment: vi.fn(),
    } satisfies AnnouncementRepository;
    const service = new AnnouncementService(repository, storage());

    await expect(
      service.delete(
        {
          employeeId: "00000000-0000-4000-8000-000000000002",
          agencyId: null,
          departmentId: null,
        },
        "00000000-0000-4000-8000-000000000001",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("projects safe attachment IDs and uses relation-authorized download", async () => {
    const attachmentId = "00000000-0000-4000-8000-000000000010";
    const repository = {
      listVisible: vi.fn(async () => ({
        dataStatus: "AVAILABLE" as const,
        announcements: [{
          id: "00000000-0000-4000-8000-000000000001",
          title: null,
          content: "Notice",
          scope: "GLOBAL" as const,
          publishedAt: "2026-10-05T00:00:00.000Z",
          hasAttachment: true,
          attachmentIds: [attachmentId],
        }],
      })),
      listAdmin: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getVisibleAttachment: vi.fn(async () => ({
        id: attachmentId,
        ownerEmployeeId: "00000000-0000-4000-8000-000000000003",
        privacyClass: "INTERNAL" as const,
        storageProvider: "R2" as const,
        storageKey: `attachments/v1/${attachmentId}/00000000-0000-4000-8000-000000000011`,
        originalFilename: "notice.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10n,
        checksumSha256: "a".repeat(64),
      })),
    } satisfies AnnouncementRepository;
    const service = new AnnouncementService(repository, storage());
    const actor = {
      employeeId: "00000000-0000-4000-8000-000000000002",
      agencyId: null,
      departmentId: null,
    };

    const result = await service.list(actor);
    expect(JSON.stringify(result)).not.toMatch(/storageKey|legacyDrive|cloudflarestorage/i);
    expect(result.announcements[0]?.attachmentIds).toEqual([attachmentId]);

    const download = await service.downloadAttachment(
      actor,
      "00000000-0000-4000-8000-000000000001",
      attachmentId,
    );
    expect(repository.getVisibleAttachment).toHaveBeenCalledOnce();
    expect(download).toMatchObject({
      attachmentId,
      download: { method: "GET" },
    });
    expect(JSON.stringify(download)).not.toContain("storageKey");
  });
});
