import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  R2AwsRequestSigner,
  R2PrivateObjectStore,
  copyLegacyAttachmentsToR2,
  planLegacyAttachmentCopy,
} from "@ckace/storage";

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

const supportedFlags = new Set(["--source-dir", "--manifest", "--apply"]);
for (const value of process.argv.slice(2)) {
  if (value.startsWith("--") && !supportedFlags.has(value)) throw new Error(`Unknown option ${value}`);
}

const sourceDirectory = argument("--source-dir");
const manifestPath = argument("--manifest");
if (!sourceDirectory || !manifestPath) {
  throw new Error("Usage: node scripts/migration/copy-local-attachments-to-r2.mjs --source-dir <download-folder> --manifest <external-json> [--apply]");
}
const repositoryRoot = path.resolve(process.cwd());
const absoluteSourceDirectory = path.resolve(sourceDirectory);
const absoluteManifestPath = path.resolve(manifestPath);
if (isInside(repositoryRoot, absoluteSourceDirectory) || isInside(repositoryRoot, absoluteManifestPath)) {
  throw new Error("Keep downloaded attachment files and their manifest outside the repository.");
}

let manifest;
try {
  manifest = JSON.parse(await readFile(absoluteManifestPath, "utf8"));
} catch {
  throw new Error("Attachment transfer manifest could not be read as JSON.");
}
if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.files)) {
  throw new Error("Attachment manifest must contain schemaVersion 1 and a files array.");
}

const plan = await planLegacyAttachmentCopy({
  sourceDirectory: absoluteSourceDirectory,
  entries: manifest.files,
});
const applyRequested = process.argv.includes("--apply");
let objectStore;
if (applyRequested) {
  if (process.env.CKACE_ATTACHMENT_COPY_APPLY !== "YES") throw new Error("Set CKACE_ATTACHMENT_COPY_APPLY=YES to enable an upload run.");
  if (process.env.CKACE_RUNTIME_STAGE !== "dev") throw new Error("R2 attachment copy is restricted to CKACE_RUNTIME_STAGE=dev.");
  if (process.env.CKACE_SYSTEM_WRITE_MODE !== "READ_ONLY") throw new Error("R2 attachment copy requires CKACE_SYSTEM_WRITE_MODE=READ_ONLY.");
  if (process.env.CKACE_MIGRATION_JOB !== "YES") throw new Error("R2 attachment copy requires CKACE_MIGRATION_JOB=YES.");
  if (process.env.R2_BUCKET_NAME !== "ckace-hr-test-private") throw new Error("R2 attachment copy is restricted to the CKACE HR TEST private bucket.");
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error("R2 TEST credentials must be provided through the local environment.");
  objectStore = new R2PrivateObjectStore(
    { accountId, bucketName: process.env.R2_BUCKET_NAME },
    new R2AwsRequestSigner({ accessKeyId, secretAccessKey }),
  );
}

const result = await copyLegacyAttachmentsToR2({ plan, dryRun: !applyRequested, objectStore });
process.stdout.write(`${JSON.stringify({
  mode: result.dryRun ? "DRY_RUN_NO_UPLOAD" : "TEST_R2_UPLOAD_AND_SHA256_VERIFY",
  filesPlanned: result.filesPlanned,
  filesUploaded: result.filesUploaded,
  filesVerified: result.filesVerified,
  totalBytes: result.totalBytes,
  files: result.files,
}, null, 2)}\n`);
