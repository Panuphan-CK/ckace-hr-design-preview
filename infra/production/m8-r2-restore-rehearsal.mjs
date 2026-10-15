import { createHash, randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const accountId = requiredEnv("R2_ACCOUNT_ID");
const bucket = requiredEnv("R2_BUCKET_NAME");
const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function put(key, body) {
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "text/plain",
  }));
}

async function get(key) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error("R2 object body unavailable");
  return Buffer.from(await response.Body.transformToByteArray());
}

async function main() {
  const runId = randomUUID();
  const prefix = `rehearsal/m8/${runId}`;
  const primary = `${prefix}/primary`;
  const backup = `${prefix}/backup`;
  const original = Buffer.from(`ckace-m8-r2-original:${runId}`, "utf8");
  const changed = Buffer.from(`ckace-m8-r2-mutated:${runId}`, "utf8");

  await put(primary, original);
  await put(backup, original);

  const backupBytes = await get(backup);
  if (hash(backupBytes) !== hash(original)) throw new Error("Backup checksum mismatch");

  await put(primary, changed);
  const mutated = await get(primary);
  if (hash(mutated) === hash(original)) throw new Error("Primary mutation was not detected");

  await put(primary, backupBytes);
  const restored = await get(primary);
  if (hash(restored) !== hash(backupBytes)) throw new Error("Primary restore checksum mismatch");

  console.log([
    "M8_R2_RESTORE_PASS",
    "backup_match=1",
    "mutation_detected=1",
    "restore_match=1",
    "retained=1",
    `primary=${primary}`,
    `backup=${backup}`,
    `checksum=${hash(restored)}`,
  ].join(" "));
}

main().catch((error) => {
  console.error("M8_R2_RESTORE_FAIL " + (error instanceof Error ? error.message : "unknown error"));
  process.exitCode = 1;
});
