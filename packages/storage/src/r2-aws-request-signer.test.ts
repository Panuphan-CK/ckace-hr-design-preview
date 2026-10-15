import { describe, expect, it } from "vitest";

import {
  R2AwsRequestSigner,
  type R2PrivateStorageConfig,
} from "./index";

const config: R2PrivateStorageConfig = {
  accountId: "a".repeat(32),
  bucketName: "ckace-hr-test-private",
};

const signer = new R2AwsRequestSigner({
  accessKeyId: "A".repeat(32),
  secretAccessKey: "b".repeat(64),
});

describe("R2AwsRequestSigner", () => {
  it("creates a short-lived path-style upload URL with required content type", async () => {
    const grant = await signer.signUpload(config, {
      storageKey:
        "attachments/v1/00000000-0000-4000-8000-000000000101/00000000-0000-4000-8000-000000000102",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      checksumSha256: "c".repeat(64),
      expiresInSeconds: 300,
    });

    const url = new URL(grant.url);

    expect(grant.method).toBe("PUT");
    expect(url.hostname).toBe(
      `${config.accountId}.r2.cloudflarestorage.com`,
    );
    expect(url.pathname).toContain(
      `/${config.bucketName}/attachments/v1/`,
    );
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(grant.requiredHeaders).toEqual({
      "content-type": "application/pdf",
    });
  });

  it("creates a bounded download URL with content disposition", async () => {
    const grant = await signer.signDownload(config, {
      storageKey:
        "attachments/v1/00000000-0000-4000-8000-000000000101/00000000-0000-4000-8000-000000000102",
      downloadFilename: "medical receipt.pdf",
      expiresInSeconds: 120,
    });

    const url = new URL(grant.url);

    expect(grant.method).toBe("GET");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("120");
    expect(
      url.searchParams.get("response-content-disposition"),
    ).toContain("medical%20receipt.pdf");
  });

  it("rejects malformed credential input without echoing values", () => {
    expect(
      () =>
        new R2AwsRequestSigner({
          accessKeyId: "short",
          secretAccessKey: "short",
        }),
    ).toThrow("Invalid R2 S3 credentials");
  });
});
