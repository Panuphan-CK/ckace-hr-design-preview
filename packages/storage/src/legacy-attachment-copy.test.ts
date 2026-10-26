import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  copyLegacyAttachmentsToR2,
  planLegacyAttachmentCopy,
  type LegacyAttachmentCopyManifestEntry,
} from "./legacy-attachment-copy";
import type { PrivateObjectStore } from "./types";

const TARGET_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";

function entry(content: Buffer, overrides: Partial<LegacyAttachmentCopyManifestEntry> = {}): LegacyAttachmentCopyManifestEntry {
  return {
    sourceAttachmentId: "FILE-001",
    relativePath: "nested/receipt.pdf",
    targetAttachmentId: TARGET_ID,
    storageKey: `attachments/v1/${TARGET_ID}/${VERSION_ID}`,
    privacyClass: "EMPLOYEE_PRIVATE",
    mimeType: "application/pdf",
    expectedSha256: createHash("sha256").update(content).digest("hex"),
    ...overrides,
  };
}

async function localSource(content: Buffer): Promise<{ root: string; file: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), "ckace-attachment-copy-"));
  const folder = path.join(root, "nested");
  await mkdir(folder);
  const file = path.join(folder, "receipt.pdf");
  await writeFile(file, content);
  return { root, file };
}

function mockStore(checksum: string, sizeBytes: number) {
  const store: PrivateObjectStore = {
    createUploadGrant: vi.fn(async () => ({
      url: "https://upload.invalid/private",
      method: "PUT" as const,
      expiresAt: new Date("2026-10-26T00:05:00.000Z"),
      requiredHeaders: { "content-type": "application/pdf" },
    })),
    createDownloadGrant: vi.fn(),
    inspectObject: vi.fn(async () => ({
      sizeBytes,
      mimeType: "application/pdf",
      checksumSha256: checksum,
    })),
    deleteObject: vi.fn(),
  };
  return store;
}

describe("local legacy attachment copy", () => {
  it("plans local copies with SHA-256 and dry-runs without contacting the object store", async () => {
    const content = Buffer.from("sanitized attachment bytes");
    const source = await localSource(content);
    try {
      const plan = await planLegacyAttachmentCopy({ sourceDirectory: source.root, entries: [entry(content)] });
      const store = mockStore(createHash("sha256").update(content).digest("hex"), content.length);
      const result = await copyLegacyAttachmentsToR2({ plan, dryRun: true, objectStore: store });

      expect(plan[0]).toMatchObject({ sourceAttachmentId: "FILE-001", sizeBytes: content.length });
      expect(plan[0]?.sha256).toBe(createHash("sha256").update(content).digest("hex"));
      expect(result).toMatchObject({ dryRun: true, filesPlanned: 1, filesUploaded: 0, filesVerified: 0, totalBytes: content.length });
      expect(store.createUploadGrant).not.toHaveBeenCalled();
      expect(store.inspectObject).not.toHaveBeenCalled();
    } finally {
      await rm(source.root, { recursive: true, force: true });
    }
  });

  it("uploads through a signed grant and verifies size plus downloaded SHA-256", async () => {
    const content = Buffer.from("verified attachment bytes");
    const checksum = createHash("sha256").update(content).digest("hex");
    const source = await localSource(content);
    try {
      const plan = await planLegacyAttachmentCopy({ sourceDirectory: source.root, entries: [entry(content)] });
      const store = mockStore(checksum, content.length);
      const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        expect(init?.method).toBe("PUT");
        expect(Buffer.from(init?.body as Uint8Array)).toEqual(content);
        return new Response(null, { status: 200 });
      });

      const result = await copyLegacyAttachmentsToR2({ plan, dryRun: false, objectStore: store, fetcher });

      expect(result).toMatchObject({ dryRun: false, filesUploaded: 1, filesVerified: 1 });
      expect(store.createUploadGrant).toHaveBeenCalledWith(expect.objectContaining({
        storageKey: `attachments/v1/${TARGET_ID}/${VERSION_ID}`,
        checksumSha256: checksum,
        sizeBytes: content.length,
      }));
      expect(store.inspectObject).toHaveBeenCalledWith(`attachments/v1/${TARGET_ID}/${VERSION_ID}`);
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      await rm(source.root, { recursive: true, force: true });
    }
  });

  it("rejects wrong checksums, unsafe paths, duplicate identities, and objects outside the private key shape", async () => {
    const content = Buffer.from("attachment");
    const source = await localSource(content);
    try {
      await expect(planLegacyAttachmentCopy({
        sourceDirectory: source.root,
        entries: [entry(content, { expectedSha256: "0".repeat(64) })],
      })).rejects.toThrow(/SHA-256 mismatch/);
      await expect(planLegacyAttachmentCopy({
        sourceDirectory: source.root,
        entries: [entry(content, { relativePath: "../receipt.pdf" })],
      })).rejects.toThrow(/unsafe segment/);
      await expect(planLegacyAttachmentCopy({
        sourceDirectory: source.root,
        entries: [entry(content), entry(content)],
      })).rejects.toThrow(/Duplicate source attachment ID/);
      await expect(planLegacyAttachmentCopy({
        sourceDirectory: source.root,
        entries: [entry(content, { storageKey: "public/receipt.pdf" })],
      })).rejects.toThrow(/private attachment storage key/);
    } finally {
      await rm(source.root, { recursive: true, force: true });
    }
  });

  it("detects source bytes changing after planning before making an upload request", async () => {
    const content = Buffer.from("before");
    const source = await localSource(content);
    try {
      const plan = await planLegacyAttachmentCopy({ sourceDirectory: source.root, entries: [entry(content)] });
      await writeFile(source.file, "after");
      const store = mockStore("0".repeat(64), content.length);

      await expect(copyLegacyAttachmentsToR2({ plan, dryRun: false, objectStore: store })).rejects.toThrow(/changed after planning/);
      expect(store.createUploadGrant).not.toHaveBeenCalled();
    } finally {
      await rm(source.root, { recursive: true, force: true });
    }
  });
});
