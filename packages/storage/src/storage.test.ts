import { describe, expect, it, vi } from "vitest";

import type { InternalActorContext } from "@ckace/auth";

import {
  canAccessPrivateAttachment,
  createPrivateAttachmentStorageKey,
  PrivateAttachmentStorageService,
  PrivateStorageAuthorizationError,
  R2PrivateObjectStore,
  r2S3Endpoint,
  validateGrantTtlSeconds,
  validateR2PrivateStorageConfig,
  type PrivateAttachmentDescriptor,
  type PrivateObjectStore,
  type R2RequestSigner,
  type SignedObjectGrant,
} from "./index";

const employeeId = "00000000-0000-4000-8000-000000000001";
const otherEmployeeId = "00000000-0000-4000-8000-000000000002";
const attachmentId = "00000000-0000-4000-8000-000000000101";

function actor(
  permissions: readonly string[],
  id = employeeId,
): InternalActorContext {
  return {
    employeeId: id,
    legacyUid: null,
    roles: ["EMPLOYEE"],
    permissions,
    agencyId: "00000000-0000-4000-8000-000000000201",
    departmentId: "00000000-0000-4000-8000-000000000301",
    authenticatedBy: "PROJECT_B_WEB",
    correlationId: "m5-test",
  };
}

function grant(method: "GET" | "PUT"): SignedObjectGrant {
  return {
    url: "https://signed.invalid/object",
    method,
    expiresAt: new Date("2026-10-05T03:00:00.000Z"),
    requiredHeaders: {},
  };
}

describe("private attachment access policy", () => {
  it("allows employee-private owner with explicit self permission", () => {
    expect(
      canAccessPrivateAttachment(
        actor(["storage.attachment.self.read"]),
        {
          ownerEmployeeId: employeeId,
          privacyClass: "EMPLOYEE_PRIVATE",
        },
        "READ",
      ),
    ).toBe(true);
  });

  it("denies cross-employee access without global permission", () => {
    expect(
      canAccessPrivateAttachment(
        actor(["storage.attachment.self.read"]),
        {
          ownerEmployeeId: otherEmployeeId,
          privacyClass: "EMPLOYEE_PRIVATE",
        },
        "READ",
      ),
    ).toBe(false);
  });

  it("requires medical-specific permission for medical files", () => {
    expect(
      canAccessPrivateAttachment(
        actor(["storage.attachment.global.read"]),
        {
          ownerEmployeeId: otherEmployeeId,
          privacyClass: "MEDICAL_PRIVATE",
        },
        "READ",
      ),
    ).toBe(false);

    expect(
      canAccessPrivateAttachment(
        actor(["medical.attachment.global.read"]),
        {
          ownerEmployeeId: otherEmployeeId,
          privacyClass: "MEDICAL_PRIVATE",
        },
        "READ",
      ),
    ).toBe(true);
  });

  it("keeps admin-private separate from generic global access", () => {
    expect(
      canAccessPrivateAttachment(
        actor(["storage.attachment.global.read"]),
        {
          ownerEmployeeId: null,
          privacyClass: "ADMIN_PRIVATE",
        },
        "READ",
      ),
    ).toBe(false);

    expect(
      canAccessPrivateAttachment(
        actor(["storage.attachment.admin.read"]),
        {
          ownerEmployeeId: null,
          privacyClass: "ADMIN_PRIVATE",
        },
        "READ",
      ),
    ).toBe(true);
  });
});

describe("private attachment object keys", () => {
  it("creates opaque keys without filename, owner or privacy data", () => {
    const storageKey =
      createPrivateAttachmentStorageKey(attachmentId);

    expect(storageKey).toMatch(
      /^attachments\/v1\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i,
    );
    expect(storageKey).not.toContain(employeeId);
    expect(storageKey).not.toContain("medical");
    expect(storageKey).not.toContain("receipt");
  });
});

describe("private attachment storage service", () => {
  it("issues an upload intent only after server-side authorization", async () => {
    const store: PrivateObjectStore = {
      createUploadGrant: vi.fn(async () => grant("PUT")),
      createDownloadGrant: vi.fn(async () => grant("GET")),
      inspectObject: vi.fn(async () => ({
        sizeBytes: 1024,
        mimeType: "application/pdf",
        checksumSha256: "a".repeat(64),
      })),
      deleteObject: vi.fn(async () => undefined),
    };
    const service = new PrivateAttachmentStorageService(store);

    const result = await service.createUploadIntent(
      actor(["storage.attachment.self.write"]),
      {
        attachmentId,
        ownerEmployeeId: employeeId,
        privacyClass: "EMPLOYEE_PRIVATE",
        originalFilename: "receipt.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        checksumSha256: "a".repeat(64),
      },
    );

    expect(result.storageProvider).toBe("R2");
    expect(result.storageKey).not.toContain("receipt.pdf");
    expect(store.createUploadGrant).toHaveBeenCalledTimes(1);
  });

  it("fails closed before contacting storage when authorization is absent", async () => {
    const createUploadGrant = vi.fn(async () => grant("PUT"));
    const store: PrivateObjectStore = {
      createUploadGrant,
      createDownloadGrant: vi.fn(async () => grant("GET")),
      inspectObject: vi.fn(async () => ({
        sizeBytes: 1024,
        mimeType: "application/pdf",
        checksumSha256: "a".repeat(64),
      })),
      deleteObject: vi.fn(async () => undefined),
    };
    const service = new PrivateAttachmentStorageService(store);

    await expect(
      service.createUploadIntent(actor([]), {
        attachmentId,
        ownerEmployeeId: employeeId,
        privacyClass: "EMPLOYEE_PRIVATE",
        originalFilename: "receipt.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        checksumSha256: "b".repeat(64),
      }),
    ).rejects.toBeInstanceOf(PrivateStorageAuthorizationError);

    expect(createUploadGrant).not.toHaveBeenCalled();
  });

  it("allows relation-authorized download only for INTERNAL attachments", async () => {
    const store: PrivateObjectStore = {
      createUploadGrant: vi.fn(async () => grant("PUT")),
      createDownloadGrant: vi.fn(async () => grant("GET")),
      inspectObject: vi.fn(async () => ({
        sizeBytes: 1024,
        mimeType: "application/pdf",
        checksumSha256: "a".repeat(64),
      })),
      deleteObject: vi.fn(async () => undefined),
    };
    const service = new PrivateAttachmentStorageService(store);
    const base: PrivateAttachmentDescriptor = {
      id: attachmentId,
      ownerEmployeeId: otherEmployeeId,
      privacyClass: "INTERNAL",
      storageProvider: "R2",
      storageKey: `attachments/v1/${attachmentId}/00000000-0000-4000-8000-000000000102`,
      originalFilename: "announcement.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024n,
      checksumSha256: "a".repeat(64),
    };

    await expect(
      service.createRelationAuthorizedDownloadGrant(base),
    ).resolves.toEqual(grant("GET"));

    await expect(
      service.createRelationAuthorizedDownloadGrant({
        ...base,
        privacyClass: "MEDICAL_PRIVATE",
      }),
    ).rejects.toThrow("INTERNAL attachments only");
  });

  it("rejects invalid R2 metadata keys before download", async () => {
    const store: PrivateObjectStore = {
      createUploadGrant: vi.fn(async () => grant("PUT")),
      createDownloadGrant: vi.fn(async () => grant("GET")),
      inspectObject: vi.fn(async () => ({
        sizeBytes: 1024,
        mimeType: "application/pdf",
        checksumSha256: "a".repeat(64),
      })),
      deleteObject: vi.fn(async () => undefined),
    };
    const service = new PrivateAttachmentStorageService(store);
    const attachment: PrivateAttachmentDescriptor = {
      id: attachmentId,
      ownerEmployeeId: employeeId,
      privacyClass: "EMPLOYEE_PRIVATE",
      storageProvider: "R2",
      storageKey: "../receipt.pdf",
      originalFilename: "receipt.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024n,
      checksumSha256: "c".repeat(64),
    };

    await expect(
      service.createDownloadGrant(
        actor(["storage.attachment.self.read"]),
        attachment,
      ),
    ).rejects.toThrow("Invalid private attachment storage key");
  });
});

describe("R2-compatible boundary", () => {
  const config = {
    accountId: "a".repeat(32),
    bucketName: "ckace-hr-test-private",
  };

  it("builds only the private S3-compatible endpoint", () => {
    expect(r2S3Endpoint(config)).toBe(
      `https://${"a".repeat(32)}.r2.cloudflarestorage.com`,
    );
  });

  it("rejects invalid bucket/account configuration", () => {
    expect(() =>
      validateR2PrivateStorageConfig({
        accountId: "not-an-account",
        bucketName: "CKACE_INVALID",
      }),
    ).toThrow();
  });

  it("delegates signing only after key and TTL validation", async () => {
    const signer: R2RequestSigner = {
      signUpload: vi.fn(async () => grant("PUT")),
      signDownload: vi.fn(async () => grant("GET")),
      inspectObject: vi.fn(async () => ({
        sizeBytes: 1024,
        mimeType: "application/pdf",
        checksumSha256: "a".repeat(64),
      })),
      deleteObject: vi.fn(async () => undefined),
    };
    const store = new R2PrivateObjectStore(config, signer);
    const storageKey =
      createPrivateAttachmentStorageKey(attachmentId);

    await expect(
      store.createDownloadGrant({
        storageKey,
        downloadFilename: "receipt.pdf",
        expiresInSeconds: 300,
      }),
    ).resolves.toEqual(grant("GET"));

    expect(signer.signDownload).toHaveBeenCalledTimes(1);
  });

  it("caps signed-grant TTL at 15 minutes", () => {
    expect(() => validateGrantTtlSeconds(29)).toThrow();
    expect(() => validateGrantTtlSeconds(901)).toThrow();
    expect(() => validateGrantTtlSeconds(300)).not.toThrow();
  });
});
