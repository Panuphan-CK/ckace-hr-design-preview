import {
  createHash,
  randomUUID,
} from "node:crypto";

import {
  R2AwsRequestSigner,
  R2PrivateObjectStore,
  type R2PrivateStorageConfig,
} from "./index";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function tamperSignedUrl(url: string): string {
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/");

  if (segments.length < 3) {
    throw new Error("Unexpected signed URL path");
  }

  segments[segments.length - 1] = randomUUID();
  parsed.pathname = segments.join("/");
  return parsed.toString();
}

async function main(): Promise<void> {
  const config: R2PrivateStorageConfig = {
    accountId: requiredEnv("R2_ACCOUNT_ID"),
    bucketName: requiredEnv("R2_BUCKET_NAME"),
  };

  const signer = new R2AwsRequestSigner({
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
  });
  const store = new R2PrivateObjectStore(config, signer);

  const attachmentId = randomUUID();
  const objectId = randomUUID();
  const storageKey =
    `attachments/v1/${attachmentId}/${objectId}`;
  const payload = Buffer.from(
    `ckace-hr-m5-r2-smoke:${randomUUID()}`,
    "utf8",
  );
  const checksumSha256 = createHash("sha256")
    .update(payload)
    .digest("hex");

  const upload = await store.createUploadGrant({
    storageKey,
    mimeType: "text/plain",
    sizeBytes: payload.byteLength,
    checksumSha256,
    expiresInSeconds: 120,
  });

  const uploadResponse = await fetch(upload.url, {
    method: "PUT",
    headers: upload.requiredHeaders,
    body: payload,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `R2 signed upload failed: ${uploadResponse.status}`,
    );
  }

  const download = await store.createDownloadGrant({
    storageKey,
    downloadFilename: "m5-smoke.txt",
    expiresInSeconds: 120,
  });

  const downloadResponse = await fetch(download.url);

  if (!downloadResponse.ok) {
    throw new Error(
      `R2 signed download failed: ${downloadResponse.status}`,
    );
  }

  const downloaded = Buffer.from(
    await downloadResponse.arrayBuffer(),
  );

  if (!downloaded.equals(payload)) {
    throw new Error("R2 downloaded payload mismatch");
  }

  const tamperedResponse = await fetch(
    tamperSignedUrl(download.url),
  );

  if (tamperedResponse.status !== 403) {
    throw new Error(
      `Tampered signed URL did not fail closed: ${tamperedResponse.status}`,
    );
  }

  await store.deleteObject(storageKey);

  const afterDeleteResponse = await fetch(download.url);

  if (afterDeleteResponse.status !== 404) {
    throw new Error(
      `Deleted object remained readable: ${afterDeleteResponse.status}`,
    );
  }

  process.stdout.write(
    "M5_R2_HOSTED_SMOKE_PASS upload=200 download=200 tampered=403 deleted=404\n",
  );
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown R2 smoke error";

  process.stderr.write(`M5_R2_HOSTED_SMOKE_FAIL ${message}\n`);
  process.exitCode = 1;
});
