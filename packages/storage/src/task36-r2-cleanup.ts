import {
  R2AwsRequestSigner,
  R2PrivateObjectStore,
  type StoredObjectInspection,
} from "./index";

const TEST_BUCKET = "ckace-hr-test-private";
const TEST_ACCOUNT_ID = "2220c587568faa782c803cea8496f920";
const EXPECTED_SIZE = 92;
const EXPECTED_MIME = "application/pdf";
const EXPECTED_SHA =
  "42cef79776cf0d5ce63df78e172ec982c8ce1b7c6da6bd51ecfe3408d9737939";

const TARGETS = [
  {
    id: "d720fb69-7654-48cb-811f-5f3d91c4c328",
    key: "attachments/v1/d720fb69-7654-48cb-811f-5f3d91c4c328/ed8a612f-3daf-44ce-b094-ec7d1b205a5b",
    shouldExistBefore: true,
  },
  {
    id: "b77d51eb-6a95-49d8-904c-25a524ae52a5",
    key: "attachments/v1/b77d51eb-6a95-49d8-904c-25a524ae52a5/cb578239-3c70-4911-85f9-ec0b2d0ec32f",
    shouldExistBefore: false,
  },
  {
    id: "53cb60e3-a7a6-4a14-9e72-f235b5bf5dd6",
    key: "attachments/v1/53cb60e3-a7a6-4a14-9e72-f235b5bf5dd6/a1db0feb-1b6b-4346-9d2e-0156d30c7044",
    shouldExistBefore: false,
  },
] as const;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`TASK36_MISSING_${name}`);
  return value;
}

function assertBoundary(): void {
  if (
    required("CKACE_TASK36_CLEANUP") !== "YES" ||
    required("R2_BUCKET_NAME") !== TEST_BUCKET ||
    required("R2_ACCOUNT_ID") !== TEST_ACCOUNT_ID
  ) {
    throw new Error("TASK36_R2_BOUNDARY_MISMATCH");
  }
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as {
    name?: unknown;
    Code?: unknown;
    code?: unknown;
    statusCode?: unknown;
    httpStatusCode?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  const code = String(value.name ?? value.Code ?? value.code ?? "");
  const status =
    value.$metadata?.httpStatusCode ??
    value.statusCode ??
    value.httpStatusCode;
  return (
    status === 404 ||
    status === "404" ||
    code === "NoSuchKey" ||
    code === "NotFound"
  );
}

async function main(): Promise<void> {
  assertBoundary();

  const store = new R2PrivateObjectStore(
    {
      accountId: required("R2_ACCOUNT_ID"),
      bucketName: required("R2_BUCKET_NAME"),
    },
    new R2AwsRequestSigner({
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    }),
  );

  async function inspect(
    key: string,
  ): Promise<StoredObjectInspection | null> {
    try {
      return await store.inspectObject(key);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  const before = await Promise.all(
    TARGETS.map(async (target) => ({
      target,
      object: await inspect(target.key),
    })),
  );

  for (const item of before) {
    if (item.target.shouldExistBefore) {
      if (!item.object) {
        throw new Error(
          `TASK36_FINALIZED_OBJECT_MISSING_${item.target.id}`,
        );
      }
      if (
        item.object.sizeBytes !== EXPECTED_SIZE ||
        item.object.mimeType !== EXPECTED_MIME ||
        item.object.checksumSha256.toLowerCase() !== EXPECTED_SHA
      ) {
        throw new Error(
          `TASK36_FINALIZED_OBJECT_METADATA_MISMATCH_${item.target.id}`,
        );
      }
    } else if (item.object) {
      throw new Error(
        `TASK36_STALE_OBJECT_PRESENT_${item.target.id}`,
      );
    }
  }

  await store.deleteObject(TARGETS[0].key);

  const after = await Promise.all(
    TARGETS.map((target) => inspect(target.key)),
  );
  if (after.some((object) => object !== null)) {
    throw new Error("TASK36_R2_POST_DELETE_DRIFT");
  }

  process.stdout.write(
    "TASK36_R2_CLEANUP_PASS exact_keys=3 deleted_finalized=1 stale_absent=2 post_absent=3\n",
  );
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : String(error);
  process.stderr.write(`TASK36_R2_CLEANUP_FAIL ${message}\n`);
  process.exitCode = 1;
});
