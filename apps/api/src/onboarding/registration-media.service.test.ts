import { describe, expect, it, vi } from "vitest";

import { RegistrationMediaService } from "./registration-media.service";

const SECRET = "s".repeat(40);

function build(secret = SECRET) {
  const repository = {
    createPending: vi.fn().mockResolvedValue("att-1"),
    assignStorageKey: vi.fn(),
    getDescriptor: vi.fn(),
    finalizeAndLink: vi.fn(),
    deletePending: vi.fn(),
  };
  const storage = {
    createUploadIntent: vi.fn().mockResolvedValue({
      storageKey: "k",
      grant: { url: "https://r2/x", method: "PUT", expiresAt: new Date(), requiredHeaders: {} },
    }),
    verifyUploadedObject: vi.fn(),
  };
  const service = new RegistrationMediaService(repository as never, storage as never, secret);
  return { service, repository, storage };
}

const input = {
  kind: "SIGNATURE",
  originalFilename: "s.png",
  mimeType: "image/png",
  sizeBytes: 1000,
  checksumSha256: "a".repeat(64),
} as const;

describe("RegistrationMediaService", () => {
  it("issues a token that authorizes an upload for that employee only", async () => {
    const { service, repository } = build();
    const token = service.issueToken("emp-1");
    expect(token).toBeTruthy();
    await service.createUploadIntent(token as string, input);
    expect(repository.createPending).toHaveBeenCalledWith("emp-1", "SIGNATURE", input);
  });

  it("rejects tampered tokens, non-images and oversized files", async () => {
    const { service } = build();
    const token = service.issueToken("emp-1") as string;
    await expect(service.createUploadIntent(token + "x", input)).rejects.toThrow();
    await expect(
      service.createUploadIntent(token, { ...input, mimeType: "application/pdf" }),
    ).rejects.toThrow();
    await expect(
      service.createUploadIntent(token, { ...input, sizeBytes: 3 * 1024 * 1024 }),
    ).rejects.toThrow();
  });

  it("issues no token when the secret is too short", () => {
    expect(build("short").service.issueToken("emp-1")).toBeNull();
  });
});
