import { createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const primaryBucket = "ckace-hr-prod-private";
const backupBucket = "ckace-hr-prod-backup-private";
const key = "m9-6-recovery-proof/synthetic-proof-20261007.txt";

if (!accountId || !accessKeyId || !secretAccessKey) {
  throw new Error("Missing R2 recovery-proof credentials.");
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

const expected = Buffer.from(
  "CKACE_HR_M9_6_R2_RECOVERY_PROOF_2026-10-07\n",
  "utf8",
);

const sha256 = (buffer) =>
  createHash("sha256").update(buffer).digest("hex");

async function readObject(bucket) {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  return Buffer.from(await response.Body.transformToByteArray());
}

async function exists(bucket) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound") return false;
    throw error;
  }
}

let primaryPut = false;
let backupPut = false;
let restored = false;

try {
  await client.send(
    new PutObjectCommand({
      Bucket: primaryBucket,
      Key: key,
      Body: expected,
      ContentType: "text/plain",
      Metadata: { purpose: "m9-6-recovery-proof" },
    }),
  );
  primaryPut = true;

  const primaryBytes = await readObject(primaryBucket);
  const primaryHash = sha256(primaryBytes);
  if (primaryHash !== sha256(expected)) {
    throw new Error("Primary object checksum mismatch.");
  }

  await client.send(
    new PutObjectCommand({
      Bucket: backupBucket,
      Key: key,
      Body: primaryBytes,
      ContentType: "text/plain",
      Metadata: { source: primaryBucket, purpose: "m9-6-backup-proof" },
    }),
  );
  backupPut = true;

  const backupBytes = await readObject(backupBucket);
  const backupHash = sha256(backupBytes);
  if (backupHash !== primaryHash) {
    throw new Error("Backup object checksum mismatch.");
  }

  await client.send(
    new DeleteObjectCommand({ Bucket: primaryBucket, Key: key }),
  );
  primaryPut = false;

  if (await exists(primaryBucket)) {
    throw new Error("Synthetic primary object was not removed before restore.");
  }

  const restoreBytes = await readObject(backupBucket);
  await client.send(
    new PutObjectCommand({
      Bucket: primaryBucket,
      Key: key,
      Body: restoreBytes,
      ContentType: "text/plain",
      Metadata: { source: backupBucket, purpose: "m9-6-restore-proof" },
    }),
  );
  primaryPut = true;
  restored = true;

  const restoredBytes = await readObject(primaryBucket);
  const restoredHash = sha256(restoredBytes);
  if (restoredHash !== backupHash) {
    throw new Error("Restored object checksum mismatch.");
  }

  console.log(
    [
      "M9_6_R2_RECOVERY_PROOF_PASS",
      `primary=${primaryBucket}`,
      `backup=${backupBucket}`,
      `key=${key}`,
      `sha256=${restoredHash}`,
      "backup_copy=PASS",
      "primary_delete=PASS",
      "restore_from_backup=PASS",
    ].join(" "),
  );
} finally {
  if (primaryPut || restored) {
    await client
      .send(new DeleteObjectCommand({ Bucket: primaryBucket, Key: key }))
      .catch(() => {});
  }
  if (backupPut) {
    await client
      .send(new DeleteObjectCommand({ Bucket: backupBucket, Key: key }))
      .catch(() => {});
  }
}
