import { NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  Task34AttachmentRow,
  Task34ClassificationInput,
} from "./task34-r2.controller";
import {
  assertTask34ResourceBoundary,
  assertTask34Runtime,
  classifyTask34Reconciliation,
  isTask34ObjectNotFound,
  reconcileTask34R2,
  TASK34_R2_ALLOWLIST,
  Task34R2Controller,
} from "./task34-r2.controller";

const DEV_DATABASE_URL =
  "postgresql://synthetic:synthetic@ep-twilight-bread-b32n36nz.c-4.ap-southeast-1.aws.neon.tech/ckace_hr_dev?sslmode=require";

const RUNTIME_ENV = {
  CKACE_RUNTIME_STAGE: "test",
  K_SERVICE: "ckace-hr-api-test",
  K_REVISION: "ckace-hr-api-test-task34r2-20261014a",
  R2_BUCKET_NAME: "ckace-hr-test-private",
  DATABASE_URL: DEV_DATABASE_URL,
} as const;

const metadata = {
  sizeBytes: 92,
  mimeType: "application/pdf",
  checksumSha256: TASK34_R2_ALLOWLIST[0].checksumSha256,
};

type Task34Target = (typeof TASK34_R2_ALLOWLIST)[number];

function attachmentRow(
  target: Task34Target = TASK34_R2_ALLOWLIST[0] as Task34Target,
  overrides: Partial<Task34AttachmentRow> = {},
): Task34AttachmentRow {
  return {
    ownerEmployeeId: target.ownerEmployeeId,
    privacyClass: target.privacyClass,
    storageProvider: target.storageProvider,
    storageKey: target.storageKey,
    finalizedAt: null,
    sizeBytes: BigInt(metadata.sizeBytes),
    mimeType: metadata.mimeType,
    checksumSha256: metadata.checksumSha256,
    leaveLink: null,
    overtimeLink: null,
    medicalLink: null,
    announcementLink: null,
    employeeMedia: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TASK-34 exact TEST-only R2 reconciliation boundary", () => {
  it("accepts only the exact TASK34R2 TEST API revision", () => {
    expect(() => assertTask34Runtime(RUNTIME_ENV)).not.toThrow();
    expect(new Task34R2Controller().reconcile.length).toBe(0);
  });

  it("pins reconciliation to the attested DEV database and TEST R2 bucket", () => {
    expect(() =>
      assertTask34ResourceBoundary({
        env: RUNTIME_ENV,
        currentDatabase: "ckace_hr_dev",
      }),
    ).not.toThrow();

    expect(() =>
      assertTask34ResourceBoundary({
        env: { ...RUNTIME_ENV, R2_BUCKET_NAME: "ckace-hr-prod-private" },
        currentDatabase: "ckace_hr_dev",
      }),
    ).toThrow(NotFoundException);
    expect(() =>
      assertTask34ResourceBoundary({
        env: RUNTIME_ENV,
        currentDatabase: "ckace_hr_prod",
      }),
    ).toThrow(NotFoundException);
  });

  it.each([
    {
      CKACE_RUNTIME_STAGE: "production",
      K_SERVICE: RUNTIME_ENV.K_SERVICE,
      K_REVISION: RUNTIME_ENV.K_REVISION,
    },
    {
      CKACE_RUNTIME_STAGE: RUNTIME_ENV.CKACE_RUNTIME_STAGE,
      K_SERVICE: "ckace-hr-api-prod",
      K_REVISION: RUNTIME_ENV.K_REVISION,
    },
    {
      CKACE_RUNTIME_STAGE: RUNTIME_ENV.CKACE_RUNTIME_STAGE,
      K_SERVICE: RUNTIME_ENV.K_SERVICE,
      K_REVISION: "ckace-hr-api-test-task32r2-20261014a",
    },
    {
      CKACE_RUNTIME_STAGE: RUNTIME_ENV.CKACE_RUNTIME_STAGE,
      K_SERVICE: RUNTIME_ENV.K_SERVICE,
      K_REVISION: "ckace-hr-api-test-task34r2x-20261014a",
    },
  ])("fails closed for a non-TASK34 runtime: $K_SERVICE / $K_REVISION", (env) => {
    expect(() => assertTask34Runtime(env)).toThrow(NotFoundException);
  });
});

describe("TASK-34 pure reconciliation classification", () => {
  const pending = {
    dbPresent: true,
    storageKeyMatchesExpected: true,
    dbInvariantMatchesExpected: true,
    finalized: false,
    linked: false,
    objectState: "PRESENT" as const,
    metadataMatches: true,
  } satisfies Task34ClassificationInput;

  const cases: readonly [
    string,
    Task34ClassificationInput,
    string,
  ][] = [
    [
      "missing DB row",
      {
        ...pending,
        dbPresent: false,
        storageKeyMatchesExpected: false,
        objectState: "NOT_INSPECTED",
        metadataMatches: null,
      },
      "DB_ROW_MISSING",
    ],
    [
      "drifted DB key",
      {
        ...pending,
        storageKeyMatchesExpected: false,
        objectState: "NOT_INSPECTED",
        metadataMatches: null,
      },
      "DB_KEY_MISMATCH_BLOCKED",
    ],
    [
      "drifted DB invariant",
      {
        ...pending,
        dbInvariantMatchesExpected: false,
        objectState: "NOT_INSPECTED",
        metadataMatches: null,
      },
      "DB_ROW_INVARIANT_MISMATCH_BLOCKED",
    ],
    [
      "finalized row",
      { ...pending, finalized: true },
      "NOT_PENDING_UNLINKED",
    ],
    [
      "linked row",
      { ...pending, linked: true },
      "NOT_PENDING_UNLINKED",
    ],
    [
      "pending DB-only row",
      { ...pending, objectState: "NOT_FOUND", metadataMatches: null },
      "DB_ONLY_PENDING_OBJECT_MISSING",
    ],
    [
      "uploaded unfinalized orphan",
      pending,
      "UPLOADED_UNFINALIZED_ORPHAN",
    ],
    [
      "object metadata mismatch",
      { ...pending, metadataMatches: false },
      "OBJECT_METADATA_MISMATCH_BLOCKED",
    ],
    [
      "storage inspection error",
      {
        ...pending,
        objectState: "INSPECTION_ERROR",
        metadataMatches: null,
      },
      "STORAGE_INSPECTION_ERROR",
    ],
  ];

  it.each(cases)("classifies %s", (_label, input, expected) => {
    expect(classifyTask34Reconciliation(input)).toBe(expected);
  });

  it.each([
    { name: "NoSuchKey" },
    { name: "NotFound" },
    { name: "S3ServiceException", Code: "NoSuchKey" },
    { $metadata: { httpStatusCode: 404 } },
    { statusCode: 404 },
  ])("treats %j as an object-not-found result", (error) => {
    expect(isTask34ObjectNotFound(error)).toBe(true);
  });

  it.each([
    { name: "AccessDenied", $metadata: { httpStatusCode: 403 } },
    { name: "TimeoutError" },
    new Error("storage unavailable"),
  ])("keeps %j as a storage inspection error", (error) => {
    expect(isTask34ObjectNotFound(error)).toBe(false);
  });
});

describe("TASK-34 read-only exact reconciliation probe", () => {
  it("reads only the allowlisted rows/keys and returns no storage metadata or mutation result", async () => {
    const rows = new Map<string, Task34AttachmentRow>(
      TASK34_R2_ALLOWLIST.map((target) => [
        target.attachmentId,
        attachmentRow(target),
      ]),
    );
    const readAttachment = vi.fn(async (attachmentId: string) =>
      rows.get(attachmentId) ?? null,
    );
    const inspectObject = vi.fn(async (storageKey: string) => {
      void storageKey;
      return metadata;
    });
    const objectStore = {
      inspectObject,
      createUploadGrant: vi.fn(() => {
        throw new Error("mutation method must not be called");
      }),
      createDownloadGrant: vi.fn(() => {
        throw new Error("signed URL method must not be called");
      }),
      deleteObject: vi.fn(() => {
        throw new Error("mutation method must not be called");
      }),
    };

    const result = await reconcileTask34R2({
      readAttachment,
      objectStore,
    });

    expect(readAttachment.mock.calls.map(([id]) => id)).toEqual(
      TASK34_R2_ALLOWLIST.map((target) => target.attachmentId),
    );
    expect(inspectObject.mock.calls.map(([key]) => key)).toEqual(
      TASK34_R2_ALLOWLIST.map((target) => target.storageKey),
    );
    expect(result).toEqual({
      attachments: TASK34_R2_ALLOWLIST.map((target) => ({
        attachmentId: target.attachmentId,
        dbPresent: true,
        finalized: false,
        linked: false,
        objectState: "PRESENT",
        metadataMatches: true,
        reconciliationClass: "UPLOADED_UNFINALIZED_ORPHAN",
      })),
    });

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("storageKey");
    expect(serialized).not.toContain("application/pdf");
    expect(serialized).not.toContain(metadata.checksumSha256);
    expect(objectStore.createUploadGrant).not.toHaveBeenCalled();
    expect(objectStore.createDownloadGrant).not.toHaveBeenCalled();
    expect(objectStore.deleteObject).not.toHaveBeenCalled();
  });

  it("blocks a drifted DB row invariant without inspecting that object", async () => {
    const firstTarget = TASK34_R2_ALLOWLIST[0];
    const secondTarget = TASK34_R2_ALLOWLIST[1];
    const readAttachment = vi.fn(async (attachmentId: string) =>
      attachmentId === firstTarget.attachmentId
        ? attachmentRow(firstTarget, { privacyClass: "INTERNAL" })
        : attachmentRow(secondTarget),
    );
    const inspectObject = vi.fn(async (storageKey: string) => {
      void storageKey;
      return metadata;
    });

    const result = await reconcileTask34R2({
      readAttachment,
      objectStore: { inspectObject },
    });

    expect(inspectObject).toHaveBeenCalledTimes(1);
    expect(inspectObject).toHaveBeenCalledWith(secondTarget.storageKey);
    expect(result.attachments[0]).toMatchObject({
      attachmentId: firstTarget.attachmentId,
      objectState: "NOT_INSPECTED",
      reconciliationClass: "DB_ROW_INVARIANT_MISMATCH_BLOCKED",
    });
  });

  it("does not inspect an arbitrary drifted DB key and distinguishes 404 from other storage errors", async () => {
    const firstTarget = TASK34_R2_ALLOWLIST[0];
    const secondTarget = TASK34_R2_ALLOWLIST[1];
    const readAttachment = vi.fn(async (attachmentId: string) =>
      attachmentId === firstTarget.attachmentId
        ? attachmentRow(firstTarget, { storageKey: "attachments/v1/drifted" })
        : attachmentRow(secondTarget),
    );
    const inspectObject = vi.fn(async (storageKey: string) => {
      if (storageKey === secondTarget.storageKey) {
        throw { name: "S3ServiceException", Code: "NoSuchKey" };
      }
      return metadata;
    });

    const result = await reconcileTask34R2({
      readAttachment,
      objectStore: { inspectObject },
    });

    expect(inspectObject).toHaveBeenCalledTimes(1);
    expect(inspectObject).toHaveBeenCalledWith(secondTarget.storageKey);
    expect(result.attachments[0]).toMatchObject({
      attachmentId: firstTarget.attachmentId,
      objectState: "NOT_INSPECTED",
      metadataMatches: null,
      reconciliationClass: "DB_KEY_MISMATCH_BLOCKED",
    });
    expect(result.attachments[1]).toMatchObject({
      attachmentId: secondTarget.attachmentId,
      objectState: "NOT_FOUND",
      metadataMatches: null,
      reconciliationClass: "DB_ONLY_PENDING_OBJECT_MISSING",
    });
  });
});
