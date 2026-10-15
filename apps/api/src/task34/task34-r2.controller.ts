import { getPrismaClient } from "@ckace/database";
import {
  R2AwsRequestSigner,
  R2PrivateObjectStore,
  type PrivateObjectStore,
  type StoredObjectInspection,
} from "@ckace/storage";
import { Get, Controller, NotFoundException } from "@nestjs/common";

import { attestWd13TestRuntime } from "../security/wd13-test-boundary";

const TASK34_RUNTIME_SERVICE = "ckace-hr-api-test";
const TASK34_RUNTIME_REVISION_PREFIX = "ckace-hr-api-test-task34r2-";
const TASK34_R2_BUCKET = "ckace-hr-test-private";
const TASK34_OWNER_EMPLOYEE_ID = "29000000-0000-4000-9000-000000000001";
const TASK34_RECEIPT_SIZE_BYTES = 92;
const TASK34_RECEIPT_MIME_TYPE = "application/pdf";
const TASK34_RECEIPT_CHECKSUM =
  "42cef79776cf0d5ce63df78e172ec982c8ce1b7c6da6bd51ecfe3408d9737939";

export const TASK34_R2_ALLOWLIST = [
  {
    attachmentId: "b77d51eb-6a95-49d8-904c-25a524ae52a5",
    storageKey:
      "attachments/v1/b77d51eb-6a95-49d8-904c-25a524ae52a5/cb578239-3c70-4911-85f9-ec0b2d0ec32f",
    ownerEmployeeId: TASK34_OWNER_EMPLOYEE_ID,
    privacyClass: "MEDICAL_PRIVATE",
    storageProvider: "R2",
    sizeBytes: TASK34_RECEIPT_SIZE_BYTES,
    mimeType: TASK34_RECEIPT_MIME_TYPE,
    checksumSha256: TASK34_RECEIPT_CHECKSUM,
  },
  {
    attachmentId: "53cb60e3-a7a6-4a14-9e72-f235b5bf5dd6",
    storageKey:
      "attachments/v1/53cb60e3-a7a6-4a14-9e72-f235b5bf5dd6/a1db0feb-1b6b-4346-9d2e-0156d30c7044",
    ownerEmployeeId: TASK34_OWNER_EMPLOYEE_ID,
    privacyClass: "MEDICAL_PRIVATE",
    storageProvider: "R2",
    sizeBytes: TASK34_RECEIPT_SIZE_BYTES,
    mimeType: TASK34_RECEIPT_MIME_TYPE,
    checksumSha256: TASK34_RECEIPT_CHECKSUM,
  },
] as const;

export type Task34ObjectState =
  | "NOT_INSPECTED"
  | "PRESENT"
  | "NOT_FOUND"
  | "INSPECTION_ERROR";

export type Task34ReconciliationClass =
  | "DB_ROW_MISSING"
  | "DB_KEY_MISMATCH_BLOCKED"
  | "DB_ROW_INVARIANT_MISMATCH_BLOCKED"
  | "NOT_PENDING_UNLINKED"
  | "DB_ONLY_PENDING_OBJECT_MISSING"
  | "UPLOADED_UNFINALIZED_ORPHAN"
  | "OBJECT_METADATA_MISMATCH_BLOCKED"
  | "STORAGE_INSPECTION_ERROR";

export interface Task34ReconciliationResult {
  readonly attachmentId: string;
  readonly dbPresent: boolean;
  readonly finalized: boolean | null;
  readonly linked: boolean | null;
  readonly objectState: Task34ObjectState;
  readonly metadataMatches: boolean | null;
  readonly reconciliationClass: Task34ReconciliationClass;
}

export interface Task34ClassificationInput {
  readonly dbPresent: boolean;
  readonly storageKeyMatchesExpected: boolean;
  readonly dbInvariantMatchesExpected: boolean;
  readonly finalized: boolean;
  readonly linked: boolean;
  readonly objectState: Task34ObjectState;
  readonly metadataMatches: boolean | null;
}

export interface Task34AttachmentRow {
  readonly ownerEmployeeId: string | null;
  readonly privacyClass: string;
  readonly storageProvider: string;
  readonly storageKey: string | null;
  readonly finalizedAt: Date | null;
  readonly sizeBytes: bigint | null;
  readonly mimeType: string | null;
  readonly checksumSha256: string | null;
  readonly leaveLink: { readonly attachmentId: string } | null;
  readonly overtimeLink: { readonly attachmentId: string } | null;
  readonly medicalLink: { readonly attachmentId: string } | null;
  readonly announcementLink: { readonly attachmentId: string } | null;
  readonly employeeMedia: { readonly attachmentId: string } | null;
}

export interface Task34ReadDependencies {
  readonly readAttachment: (
    attachmentId: string,
  ) => Promise<Task34AttachmentRow | null>;
  readonly objectStore: Pick<PrivateObjectStore, "inspectObject">;
}

const TASK34_ATTACHMENT_SELECT = {
  ownerEmployeeId: true,
  privacyClass: true,
  storageProvider: true,
  storageKey: true,
  finalizedAt: true,
  sizeBytes: true,
  mimeType: true,
  checksumSha256: true,
  leaveLink: { select: { attachmentId: true } },
  overtimeLink: { select: { attachmentId: true } },
  medicalLink: { select: { attachmentId: true } },
  announcementLink: { select: { attachmentId: true } },
  employeeMedia: { select: { attachmentId: true } },
} as const;

export function assertTask34Runtime(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const revision = env.K_REVISION?.trim() ?? "";
  if (
    env.CKACE_RUNTIME_STAGE?.trim().toLowerCase() !== "test" ||
    env.K_SERVICE?.trim() !== TASK34_RUNTIME_SERVICE ||
    !revision.startsWith(TASK34_RUNTIME_REVISION_PREFIX)
  ) {
    throw new NotFoundException();
  }
}

export const assertTask34R2Runtime = assertTask34Runtime;

export function assertTask34ResourceBoundary(input: {
  readonly env?: NodeJS.ProcessEnv;
  readonly currentDatabase?: string | undefined;
}): void {
  const env = input.env ?? process.env;
  assertTask34Runtime(env);
  if (env.R2_BUCKET_NAME?.trim() !== TASK34_R2_BUCKET) {
    throw new NotFoundException();
  }

  try {
    attestWd13TestRuntime({
      databaseUrl: env.DATABASE_URL,
      runtimeStage: env.CKACE_RUNTIME_STAGE,
      serviceName: env.K_SERVICE,
      currentDatabase: input.currentDatabase,
    });
  } catch {
    throw new NotFoundException();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorCodes(value: unknown): readonly string[] {
  if (!isRecord(value)) {
    return [];
  }

  const codes: string[] = [];
  for (const key of ["name", "Code", "code"] as const) {
    const candidate = value[key];
    if (typeof candidate === "string") {
      codes.push(candidate);
    }
  }

  return codes;
}

function errorStatusCode(value: unknown): number | null {
  if (!isRecord(value)) {
    return null;
  }

  const metadata = value.$metadata;
  const candidates = [
    value.statusCode,
    value.httpStatusCode,
    isRecord(metadata) ? metadata.httpStatusCode : undefined,
  ];

  for (const candidate of candidates) {
    if (candidate === 404 || candidate === "404") {
      return 404;
    }
  }

  return null;
}

export function isTask34ObjectNotFound(error: unknown): boolean {
  const codes = errorCodes(error);
  return (
    errorStatusCode(error) === 404 ||
    codes.includes("NoSuchKey") ||
    codes.includes("NotFound")
  );
}

export function classifyTask34Reconciliation(
  input: Task34ClassificationInput,
): Task34ReconciliationClass {
  if (!input.dbPresent) {
    return "DB_ROW_MISSING";
  }

  if (!input.storageKeyMatchesExpected) {
    return "DB_KEY_MISMATCH_BLOCKED";
  }

  if (!input.dbInvariantMatchesExpected) {
    return "DB_ROW_INVARIANT_MISMATCH_BLOCKED";
  }

  if (input.finalized || input.linked) {
    return "NOT_PENDING_UNLINKED";
  }

  if (input.objectState === "NOT_FOUND") {
    return "DB_ONLY_PENDING_OBJECT_MISSING";
  }

  if (
    input.objectState === "PRESENT" &&
    input.metadataMatches === true
  ) {
    return "UPLOADED_UNFINALIZED_ORPHAN";
  }

  if (
    input.objectState === "PRESENT" &&
    input.metadataMatches === false
  ) {
    return "OBJECT_METADATA_MISMATCH_BLOCKED";
  }

  return "STORAGE_INSPECTION_ERROR";
}

function linked(row: Task34AttachmentRow): boolean {
  return Boolean(
    row.leaveLink ||
    row.overtimeLink ||
    row.medicalLink ||
    row.announcementLink ||
    row.employeeMedia,
  );
}

function dbInvariantMatches(
  target: (typeof TASK34_R2_ALLOWLIST)[number],
  row: Task34AttachmentRow,
): boolean {
  return row.ownerEmployeeId === target.ownerEmployeeId &&
    row.privacyClass === target.privacyClass &&
    row.storageProvider === target.storageProvider &&
    row.sizeBytes === BigInt(target.sizeBytes) &&
    row.mimeType === target.mimeType &&
    row.checksumSha256?.trim().toLowerCase() === target.checksumSha256.toLowerCase();
}

function sameMetadata(
  row: Task34AttachmentRow,
  object: StoredObjectInspection,
): boolean {
  if (
    row.sizeBytes === null ||
    !Number.isSafeInteger(object.sizeBytes) ||
    object.sizeBytes < 0 ||
    BigInt(object.sizeBytes) !== row.sizeBytes ||
    row.mimeType === null ||
    object.mimeType !== row.mimeType ||
    row.checksumSha256 === null
  ) {
    return false;
  }

  return (
    object.checksumSha256.trim().toLowerCase() ===
    row.checksumSha256.trim().toLowerCase()
  );
}

export function task34MetadataMatches(
  row: Task34AttachmentRow,
  object: StoredObjectInspection,
): boolean {
  return sameMetadata(row, object);
}

interface Task34ObjectProbe {
  readonly objectState: Task34ObjectState;
  readonly inspection: StoredObjectInspection | null;
}

async function inspectExactObject(
  objectStore: Pick<PrivateObjectStore, "inspectObject">,
  storageKey: string,
): Promise<Task34ObjectProbe> {
  try {
    return {
      objectState: "PRESENT",
      inspection: await objectStore.inspectObject(storageKey),
    };
  } catch (error) {
    return {
      objectState: isTask34ObjectNotFound(error)
        ? "NOT_FOUND"
        : "INSPECTION_ERROR",
      inspection: null,
    };
  }
}

function resultFor(
  target: (typeof TASK34_R2_ALLOWLIST)[number],
  row: Task34AttachmentRow | null,
  objectProbe: Task34ObjectProbe,
  storageKeyMatchesExpected: boolean,
): Task34ReconciliationResult {
  const dbPresent = row !== null;
  const dbInvariantMatchesExpected =
    row !== null && dbInvariantMatches(target, row);
  const finalized = row === null ? null : row.finalizedAt !== null;
  const isLinked = row === null ? null : linked(row);
  const metadataMatches =
    row !== null && objectProbe.inspection !== null
      ? sameMetadata(row, objectProbe.inspection)
      : null;

  return {
    attachmentId: target.attachmentId,
    dbPresent,
    finalized,
    linked: isLinked,
    objectState: objectProbe.objectState,
    metadataMatches,
    reconciliationClass: classifyTask34Reconciliation({
      dbPresent,
      storageKeyMatchesExpected,
      dbInvariantMatchesExpected,
      finalized: finalized ?? false,
      linked: isLinked ?? false,
      objectState: objectProbe.objectState,
      metadataMatches,
    }),
  };
}

export async function reconcileTask34R2(
  dependencies: Task34ReadDependencies,
): Promise<{ readonly attachments: readonly Task34ReconciliationResult[] }> {
  const results: Task34ReconciliationResult[] = [];

  for (const target of TASK34_R2_ALLOWLIST) {
    const row = await dependencies.readAttachment(target.attachmentId);

    const storageKeyMatchesExpected =
      row !== null && row.storageKey === target.storageKey;
    if (
      row !== null &&
      (!storageKeyMatchesExpected || !dbInvariantMatches(target, row))
    ) {
      results.push(
        resultFor(target, row, {
          objectState: "NOT_INSPECTED",
          inspection: null,
        }, storageKeyMatchesExpected),
      );
      continue;
    }

    const objectProbe = await inspectExactObject(
      dependencies.objectStore,
      target.storageKey,
    );
    results.push(
      resultFor(
        target,
        row,
        objectProbe,
        storageKeyMatchesExpected,
      ),
    );
  }

  return { attachments: results };
}

function requiredRuntimeValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error("TASK34_RUNTIME_CONFIG_MISSING");
  }
  return value;
}

function createTask34ObjectStore(): Pick<
  PrivateObjectStore,
  "inspectObject"
> {
  return new R2PrivateObjectStore(
    {
      accountId: requiredRuntimeValue("R2_ACCOUNT_ID"),
      bucketName: requiredRuntimeValue("R2_BUCKET_NAME"),
    },
    new R2AwsRequestSigner({
      accessKeyId: requiredRuntimeValue("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredRuntimeValue("R2_SECRET_ACCESS_KEY"),
    }),
  );
}

type Task34PrismaClient = ReturnType<typeof getPrismaClient>;

function createTask34Dependencies(
  prisma: Task34PrismaClient,
): Task34ReadDependencies {
  return {
    readAttachment: async (attachmentId) =>
      prisma.attachment.findUnique({
        where: { id: attachmentId },
        select: TASK34_ATTACHMENT_SELECT,
      }),
    objectStore: createTask34ObjectStore(),
  };
}

@Controller("test/task34-r2")
export class Task34R2Controller {
  @Get("reconcile")
  async reconcile() {
    assertTask34Runtime();
    const prisma = getPrismaClient();
    const rows = await prisma.$queryRawUnsafe<Array<{ database_name: string }>>(
      "SELECT current_database() AS database_name",
    );
    assertTask34ResourceBoundary({
      env: process.env,
      currentDatabase: rows[0]?.database_name,
    });
    return reconcileTask34R2(createTask34Dependencies(prisma));
  }
}
