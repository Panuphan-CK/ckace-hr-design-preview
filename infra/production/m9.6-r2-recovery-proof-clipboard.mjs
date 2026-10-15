import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const accountId = "2220c587568faa782c803cea8496f920";
const primaryBucket = "ckace-hr-prod-private";
const backupBucket = "ckace-hr-prod-backup-private";
const key = "m9-6-recovery-proof/synthetic-proof-20261007.txt";

function clipboard() {
  return execFileSync(
    "powershell.exe",
    ["-NoProfile", "-Command", "Get-Clipboard -Raw"],
    { encoding: "utf8", windowsHide: true },
  ).trim();
}

function clearClipboard() {
  try {
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", "Set-Clipboard -Value ''"],
      { windowsHide: true },
    );
  } catch {}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (buffer) =>
  createHash("sha256").update(buffer).digest("hex");

async function readObject(client, bucket) {
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  return Buffer.from(await response.Body.transformToByteArray());
}

async function exists(client, bucket) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound") return false;
    throw error;
  }
}

const expected = Buffer.from(
  "CKACE_HR_M9_6_R2_RECOVERY_PROOF_2026-10-07\n",
  "utf8",
);

let client;
let primaryPut = false;
let backupPut = false;

try {
  const accessKeyId = clipboard();
  if (!accessKeyId) throw new Error("Access Key ID was not available on clipboard.");

  console.log("M9_6_R2_RECOVERY_PROOF_WAITING_FOR_SECRET");
  await sleep(10000);

  const secretAccessKey = clipboard();
  if (!secretAccessKey || secretAccessKey === accessKeyId) {
    throw new Error("Secret Access Key was not copied to clipboard in time.");
  }

  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

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

  const primaryBytes = await readObject(client, primaryBucket);
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

  const backupBytes = await readObject(client, backupBucket);
  const backupHash = sha256(backupBytes);
  if (backupHash !== primaryHash) {
    throw new Error("Backup object checksum mismatch.");
  }

  await client.send(
    new DeleteObjectCommand({ Bucket: primaryBucket, Key: key }),
  );
  primaryPut = false;

  if (await exists(client, primaryBucket)) {
    throw new Error("Synthetic primary object was not removed before restore.");
  }

  const restoreBytes = await readObject(client, backupBucket);
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

  const restoredBytes = await readObject(client, primaryBucket);
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
  clearClipboard();
  if (client && primaryPut) {
    await client
      .send(new DeleteObjectCommand({ Bucket: primaryBucket, Key: key }))
      .catch(() => {});
  }
  if (client && backupPut) {
    await client
      .send(new DeleteObjectCommand({ Bucket: backupBucket, Key: key }))
      .catch(() => {});
  }
}
