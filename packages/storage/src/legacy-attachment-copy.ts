import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { assertPrivateAttachmentStorageKey } from "./object-key";
import type {
  AttachmentPrivacyClass,
  PrivateObjectStore,
} from "./types";

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVACY_CLASSES = new Set<AttachmentPrivacyClass>([
  "INTERNAL",
  "EMPLOYEE_PRIVATE",
  "MEDICAL_PRIVATE",
  "ADMIN_PRIVATE",
]);

export interface LegacyAttachmentCopyManifestEntry {
  readonly sourceAttachmentId: string;
  readonly relativePath?: string;
  readonly originalFilename?: string | null;
  readonly targetAttachmentId: string;
  readonly storageKey: string;
  readonly privacyClass: AttachmentPrivacyClass;
  readonly mimeType: string;
  readonly expectedSha256?: string;
}

export interface PlannedLegacyAttachmentCopy {
  readonly sourceAttachmentId: string;
  readonly targetAttachmentId: string;
  readonly storageKey: string;
  readonly privacyClass: AttachmentPrivacyClass;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly localPath: string;
}

export interface LegacyAttachmentCopyResult {
  readonly dryRun: boolean;
  readonly filesPlanned: number;
  readonly filesUploaded: number;
  readonly filesVerified: number;
  readonly totalBytes: number;
  readonly files: readonly {
    readonly sourceAttachmentId: string;
    readonly targetAttachmentId: string;
    readonly storageKey: string;
    readonly sizeBytes: number;
    readonly sha256: string;
    readonly status: "DRY_RUN" | "UPLOADED_AND_VERIFIED";
  }[];
}

function isWithinDirectory(root: string, child: string): boolean {
  const relative = path.relative(root, child);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function validateRelativePath(relativePath: string): string[] {
  if (typeof relativePath !== "string" || !relativePath.trim() || relativePath.includes("\\") || path.isAbsolute(relativePath) || /^[a-z]:/i.test(relativePath)) {
    throw new Error("Attachment manifest path must be a relative POSIX path");
  }
  const segments = relativePath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Attachment manifest path contains an unsafe segment");
  }
  return segments;
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk: Buffer) => hash.update(chunk));
    stream.on("error", rejectPromise);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

function validateManifestEntry(entry: LegacyAttachmentCopyManifestEntry): void {
  if (typeof entry.sourceAttachmentId !== "string" || !entry.sourceAttachmentId.trim()) throw new Error("Attachment source ID is required");
  if (typeof entry.targetAttachmentId !== "string" || !UUID_PATTERN.test(entry.targetAttachmentId)) throw new Error("Target attachment ID must be a UUID");
  if (typeof entry.storageKey !== "string") throw new Error("Attachment storage key is required");
  assertPrivateAttachmentStorageKey(entry.storageKey);
  if (!entry.storageKey.toLowerCase().startsWith(`attachments/v1/${entry.targetAttachmentId.toLowerCase()}/`)) {
    throw new Error("Attachment object key must belong to the declared target attachment ID");
  }
  if (!PRIVACY_CLASSES.has(entry.privacyClass)) throw new Error("Unsupported attachment privacy class");
  if (typeof entry.mimeType !== "string" || !/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(entry.mimeType)) {
    throw new Error("Attachment MIME type is invalid");
  }
  if (entry.expectedSha256 != null && (typeof entry.expectedSha256 !== "string" || !SHA256_PATTERN.test(entry.expectedSha256))) {
    throw new Error("Expected SHA-256 must contain 64 hexadecimal characters");
  }
  if (entry.relativePath !== undefined) validateRelativePath(entry.relativePath);
  if (entry.originalFilename != null) {
    if (
      typeof entry.originalFilename !== "string" ||
      !entry.originalFilename.trim() ||
      entry.originalFilename !== path.basename(entry.originalFilename) ||
      entry.originalFilename.includes("/") ||
      entry.originalFilename.includes("\\")
    ) {
      throw new Error("Original attachment filename must be a basename");
    }
  }
  if (entry.relativePath === undefined && !entry.originalFilename?.trim() && !entry.sourceAttachmentId.trim()) {
    throw new Error("Attachment matching requires a FileID, filename, or explicit relativePath");
  }
}

interface LocalAttachmentFile {
  readonly relativePath: string;
  readonly fileName: string;
}

async function listLocalFiles(root: string): Promise<readonly LocalAttachmentFile[]> {
  const files: LocalAttachmentFile[] = [];
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const info = await lstat(absolutePath);
      if (info.isSymbolicLink()) throw new Error("Attachment source tree must not contain symbolic links");
      if (info.isDirectory()) {
        await visit(absolutePath);
      } else if (info.isFile()) {
        files.push({
          relativePath: path.relative(root, absolutePath).split(path.sep).join("/"),
          fileName: entry.name,
        });
      } else {
        throw new Error("Attachment source tree contains a non-regular file");
      }
    }
  }
  await visit(root);
  return files;
}

function normalizedFilename(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("en-US");
}

function resolveAttachmentRelativePath(
  entry: LegacyAttachmentCopyManifestEntry,
  files: readonly LocalAttachmentFile[],
): string[] {
  if (entry.relativePath !== undefined) return validateRelativePath(entry.relativePath);

  let matches: readonly LocalAttachmentFile[] = [];
  if (entry.originalFilename?.trim()) {
    const filename = normalizedFilename(entry.originalFilename.trim());
    matches = files.filter((file) => normalizedFilename(file.fileName) === filename);
  }
  if (matches.length === 0) {
    const sourceId = normalizedFilename(entry.sourceAttachmentId.trim());
    matches = files.filter((file) => normalizedFilename(path.parse(file.fileName).name) === sourceId);
  }
  if (matches.length === 0) throw new Error(`No local file matches source attachment ID ${entry.sourceAttachmentId}`);
  if (matches.length > 1) throw new Error(`Multiple local files match source attachment ID ${entry.sourceAttachmentId}`);
  return validateRelativePath(matches[0]!.relativePath);
}

export async function planLegacyAttachmentCopy(input: {
  readonly sourceDirectory: string;
  readonly entries: readonly LegacyAttachmentCopyManifestEntry[];
}): Promise<readonly PlannedLegacyAttachmentCopy[]> {
  if (!Array.isArray(input.entries)) throw new Error("Attachment manifest entries must be an array");
  const sourceRoot = path.resolve(input.sourceDirectory);
  const rootLink = await lstat(sourceRoot);
  if (rootLink.isSymbolicLink()) throw new Error("Attachment source directory must not be a symbolic link");
  const rootInfo = await stat(sourceRoot);
  if (!rootInfo.isDirectory()) throw new Error("Attachment source path must be a directory");
  const realRoot = await realpath(sourceRoot);
  const localFiles = await listLocalFiles(realRoot);
  const sourceIds = new Set<string>();
  const targetIds = new Set<string>();
  const storageKeys = new Set<string>();
  const plan: PlannedLegacyAttachmentCopy[] = [];

  for (const entry of input.entries) {
    validateManifestEntry(entry);
    if (sourceIds.has(entry.sourceAttachmentId)) throw new Error("Duplicate source attachment ID in manifest");
    if (targetIds.has(entry.targetAttachmentId)) throw new Error("Duplicate target attachment ID in manifest");
    if (storageKeys.has(entry.storageKey)) throw new Error("Duplicate R2 storage key in manifest");
    sourceIds.add(entry.sourceAttachmentId);
    targetIds.add(entry.targetAttachmentId);
    storageKeys.add(entry.storageKey);

    const localPath = path.resolve(realRoot, ...resolveAttachmentRelativePath(entry, localFiles));
    if (!isWithinDirectory(realRoot, localPath)) throw new Error("Attachment path escapes its source directory");
    const linkInfo = await lstat(localPath);
    if (linkInfo.isSymbolicLink() || !linkInfo.isFile()) throw new Error("Attachment source must be a regular non-symlink file");
    const realFile = await realpath(localPath);
    if (!isWithinDirectory(realRoot, realFile)) throw new Error("Attachment file resolves outside its source directory");
    const info = await stat(realFile);
    const sha256 = await sha256File(realFile);
    if (entry.expectedSha256 && sha256.toLowerCase() !== entry.expectedSha256.toLowerCase()) {
      throw new Error(`Attachment SHA-256 mismatch for source ID ${entry.sourceAttachmentId}`);
    }
    if (!Number.isSafeInteger(info.size) || info.size < 0) throw new Error("Attachment size is invalid");
    plan.push({
      sourceAttachmentId: entry.sourceAttachmentId,
      targetAttachmentId: entry.targetAttachmentId,
      storageKey: entry.storageKey,
      privacyClass: entry.privacyClass,
      mimeType: entry.mimeType,
      sizeBytes: info.size,
      sha256,
      localPath: realFile,
    });
  }
  return plan;
}

export async function copyLegacyAttachmentsToR2(input: {
  readonly plan: readonly PlannedLegacyAttachmentCopy[];
  readonly dryRun: boolean;
  readonly objectStore?: PrivateObjectStore;
  readonly fetcher?: typeof fetch;
}): Promise<LegacyAttachmentCopyResult> {
  if (!input.dryRun && !input.objectStore) throw new Error("An R2 object store is required outside dry-run mode");
  const result: LegacyAttachmentCopyResult["files"][number][] = [];

  for (const file of input.plan) {
    if (input.dryRun) {
      result.push({
        sourceAttachmentId: file.sourceAttachmentId,
        targetAttachmentId: file.targetAttachmentId,
        storageKey: file.storageKey,
        sizeBytes: file.sizeBytes,
        sha256: file.sha256,
        status: "DRY_RUN",
      });
      continue;
    }

    const bytes = await readFile(file.localPath);
    const actualBeforeUpload = createHash("sha256").update(bytes).digest("hex");
    if (actualBeforeUpload !== file.sha256) throw new Error(`Attachment changed after planning for source ID ${file.sourceAttachmentId}`);
    const objectStore = input.objectStore!;
    const grant = await objectStore.createUploadGrant({
      storageKey: file.storageKey,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      checksumSha256: file.sha256,
      expiresInSeconds: 300,
    });
    const response = await (input.fetcher ?? fetch)(grant.url, {
      method: grant.method,
      headers: grant.requiredHeaders,
      body: bytes as unknown as Exclude<
        NonNullable<Parameters<typeof fetch>[1]>["body"],
        null | undefined
      >,
    });
    if (!response.ok) throw new Error(`R2 attachment upload failed with HTTP ${response.status}`);
    const stored = await objectStore.inspectObject(file.storageKey);
    if (stored.sizeBytes !== file.sizeBytes || stored.checksumSha256.toLowerCase() !== file.sha256) {
      throw new Error(`R2 attachment checksum verification failed for source ID ${file.sourceAttachmentId}`);
    }
    result.push({
      sourceAttachmentId: file.sourceAttachmentId,
      targetAttachmentId: file.targetAttachmentId,
      storageKey: file.storageKey,
      sizeBytes: file.sizeBytes,
      sha256: file.sha256,
      status: "UPLOADED_AND_VERIFIED",
    });
  }

  return {
    dryRun: input.dryRun,
    filesPlanned: input.plan.length,
    filesUploaded: result.filter((file) => file.status === "UPLOADED_AND_VERIFIED").length,
    filesVerified: result.filter((file) => file.status === "UPLOADED_AND_VERIFIED").length,
    totalBytes: input.plan.reduce((total, file) => total + file.sizeBytes, 0),
    files: result,
  };
}
