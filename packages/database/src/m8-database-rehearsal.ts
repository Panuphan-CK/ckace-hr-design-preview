import { createHash, randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

export const M8_SOURCE_DATABASE = "ckace_hr_dev";
export const M8_REHEARSAL_DATABASE = "ckace_hr_m8_rehearsal_20261006b";
export const M8_SNAPSHOT_DATABASE = "ckace_hr_m8_snapshot_20261006b";
export const M8_RECOVERED_DATABASE = "ckace_hr_m8_recovered_20261006b";

const DATABASE_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

export function databaseNameFromUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  const name = decodeURIComponent(parsed.pathname.replace(/^\/+/, "")).trim();

  if (!name || name.includes("/")) {
    throw new Error("DATABASE_URL must include exactly one database name");
  }

  return name;
}

export function replaceDatabaseName(
  rawUrl: string,
  databaseName: string,
): string {
  if (!DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error("Unsafe rehearsal database name");
  }

  const parsed = new URL(rawUrl);
  parsed.pathname = `/${databaseName}`;
  return parsed.toString();
}

export function assertRehearsalSource(input: {
  readonly databaseUrl: string;
  readonly allowed: string | undefined;
  readonly moduleRouting: string | undefined;
}): void {
  if (input.allowed?.trim().toLowerCase() !== "true") {
    throw new Error("M8 rehearsal requires M8_REHEARSAL_ALLOWED=true");
  }

  if ((input.moduleRouting ?? "").trim().toUpperCase() !== "LEGACY") {
    throw new Error("M8 rehearsal requires CKACE_MODULE_ROUTING=LEGACY");
  }

  if (databaseNameFromUrl(input.databaseUrl) !== M8_SOURCE_DATABASE) {
    throw new Error("M8 rehearsal may run only from ckace_hr_dev");
  }
}

function quoteIdentifier(value: string): string {
  if (!DATABASE_NAME_PATTERN.test(value)) {
    throw new Error("Unsafe SQL identifier");
  }
  return `"${value}"`;
}

function createClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

async function databaseExists(
  client: PrismaClient,
  databaseName: string,
): Promise<boolean> {
  const rows = await client.$queryRawUnsafe<Array<{ exists: boolean }>>(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    databaseName,
  );
  return rows[0]?.exists === true;
}

async function createEmptyDatabase(
  admin: PrismaClient,
  databaseName: string,
): Promise<void> {
  await admin.$executeRawUnsafe(
    `CREATE DATABASE ${quoteIdentifier(databaseName)} TEMPLATE template0 ENCODING 'UTF8'`,
  );
}

async function terminateRehearsalConnections(
  admin: PrismaClient,
  databaseName: string,
): Promise<void> {
  const allowed = new Set([
    M8_REHEARSAL_DATABASE,
    M8_SNAPSHOT_DATABASE,
    M8_RECOVERED_DATABASE,
  ]);

  if (!allowed.has(databaseName)) {
    throw new Error("Refusing to terminate connections outside M8 rehearsal databases");
  }

  await admin.$queryRawUnsafe(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
    databaseName,
  );
}

async function cloneDatabase(
  admin: PrismaClient,
  sourceDatabase: string,
  targetDatabase: string,
): Promise<void> {
  await terminateRehearsalConnections(admin, sourceDatabase);
  await admin.$executeRawUnsafe(
    `CREATE DATABASE ${quoteIdentifier(targetDatabase)} TEMPLATE ${quoteIdentifier(sourceDatabase)}`,
  );
}

function runPrismaMigrations(databaseUrl: string): void {
  const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
  const prismaCli = path.join(
    repositoryRoot,
    "node_modules",
    "prisma",
    "build",
    "index.js",
  );
  const schemaPath = path.join(
    repositoryRoot,
    "packages",
    "database",
    "prisma",
    "schema.prisma",
  );

  const result = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "deploy", "--schema", schemaPath],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    throw new Error("Prisma migrate deploy failed in rehearsal database");
  }
}

function expectedMigrations(): readonly string[] {
  const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
  const migrationsDirectory = path.join(
    repositoryRoot,
    "packages",
    "database",
    "prisma",
    "migrations",
  );

  return readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function appliedMigrations(
  client: PrismaClient,
): Promise<readonly string[]> {
  const rows = await client.$queryRawUnsafe<
    Array<{ migration_name: string }>
  >(
    'SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL ORDER BY "migration_name"',
  );
  return rows.map((row) => row.migration_name);
}

async function seedSyntheticMigrationEvidence(
  client: PrismaClient,
  sourceSnapshot: string,
): Promise<void> {
  const runId = randomUUID();

  await client.migrationRun.create({
    data: {
      id: runId,
      sourceSystem: "APP_LEAVE_GAS",
      sourceSnapshot,
      transformerVersion: "m8-rehearsal-v1",
      status: "COMPLETED",
      startedAt: new Date("2026-10-06T00:00:00.000Z"),
      completedAt: new Date("2026-10-06T00:00:01.000Z"),
      importedCount: 1,
      skippedCount: 0,
      rejectedCount: 0,
      mismatchCount: 0,
    },
  });

  await client.legacyRecord.create({
    data: {
      migrationRunId: runId,
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "M8_REHEARSAL",
      sourceTab: "Synthetic",
      sourcePeriod: "REHEARSAL",
      legacyId: sourceSnapshot,
      rowFingerprint: createHash("sha256")
        .update(sourceSnapshot)
        .digest("hex"),
      payloadHash: createHash("sha256")
        .update(`payload:${sourceSnapshot}`)
        .digest("hex"),
      targetEntityType: "m8_rehearsal_marker",
      targetEntityId: null,
    },
  });

  await client.migrationReconciliationResult.create({
    data: {
      migrationRunId: runId,
      entityType: "m8_rehearsal",
      checkName: "synthetic_import_marker",
      status: "PASS",
      sourceValue: "1",
      targetValue: "1",
      exceptionCode: null,
      disposition: null,
      evidenceRef: sourceSnapshot,
    },
  });
}

interface DatabaseFingerprint {
  readonly hash: string;
  readonly tableCounts: Readonly<Record<string, number>>;
  readonly migrations: readonly string[];
  readonly schemaColumnCount: number;
  readonly migrationRunSnapshots: readonly string[];
}

async function fingerprint(
  client: PrismaClient,
): Promise<DatabaseFingerprint> {
  const tables = await client.$queryRawUnsafe<Array<{ table_name: string }>>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
  );

  const tableCounts: Record<string, number> = {};
  for (const { table_name: tableName } of tables) {
    const safeTableName = tableName.replace(/"/g, '""');
    const rows = await client.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${safeTableName}"`,
    );
    tableCounts[tableName] = Number(rows[0]?.count ?? 0n);
  }

  const schemaRows = await client.$queryRawUnsafe<
    Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>
  >(
    "SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
  );

  const migrations = await appliedMigrations(client);
  const migrationRunSnapshots = (
    await client.migrationRun.findMany({
      select: { sourceSnapshot: true },
      orderBy: { sourceSnapshot: "asc" },
    })
  ).map((row) => row.sourceSnapshot);

  const material = JSON.stringify({
    tableCounts,
    migrations,
    schemaRows,
    migrationRunSnapshots,
  });

  return {
    hash: createHash("sha256").update(material).digest("hex"),
    tableCounts,
    migrations,
    schemaColumnCount: schemaRows.length,
    migrationRunSnapshots,
  };
}

async function main(): Promise<void> {
  const sourceUrl = process.env.DATABASE_URL?.trim();
  if (!sourceUrl) {
    throw new Error("DATABASE_URL is required");
  }

  assertRehearsalSource({
    databaseUrl: sourceUrl,
    allowed: process.env.M8_REHEARSAL_ALLOWED,
    moduleRouting: process.env.CKACE_MODULE_ROUTING,
  });

  const admin = createClient(sourceUrl);
  const createdDatabases = [
    M8_REHEARSAL_DATABASE,
    M8_SNAPSHOT_DATABASE,
    M8_RECOVERED_DATABASE,
  ] as const;

  try {
    const current = await admin.$queryRawUnsafe<Array<{ database: string }>>(
      "SELECT current_database() AS database",
    );
    if (current[0]?.database !== M8_SOURCE_DATABASE) {
      throw new Error("Connected database is not ckace_hr_dev");
    }

    for (const databaseName of createdDatabases) {
      if (await databaseExists(admin, databaseName)) {
        throw new Error(
          `Rehearsal database already exists: ${databaseName}; refusing destructive reuse`,
        );
      }
    }

    await createEmptyDatabase(admin, M8_REHEARSAL_DATABASE);

    const rehearsalUrl = replaceDatabaseName(
      sourceUrl,
      M8_REHEARSAL_DATABASE,
    );
    runPrismaMigrations(rehearsalUrl);

    let rehearsal = createClient(rehearsalUrl);
    const expected = expectedMigrations();
    const applied = await appliedMigrations(rehearsal);

    if (JSON.stringify(applied) !== JSON.stringify(expected)) {
      throw new Error("Rehearsal migration chain does not match repository migrations");
    }

    await seedSyntheticMigrationEvidence(
      rehearsal,
      "m8-rehearsal-snapshot-1",
    );

    const beforeSnapshot = await fingerprint(rehearsal);
    await rehearsal.$disconnect();

    await cloneDatabase(
      admin,
      M8_REHEARSAL_DATABASE,
      M8_SNAPSHOT_DATABASE,
    );

    rehearsal = createClient(rehearsalUrl);
    await seedSyntheticMigrationEvidence(
      rehearsal,
      "m8-post-snapshot-mutation",
    );
    const mutated = await fingerprint(rehearsal);
    await rehearsal.$disconnect();

    if (mutated.hash === beforeSnapshot.hash) {
      throw new Error("Post-snapshot mutation did not change database fingerprint");
    }

    await cloneDatabase(
      admin,
      M8_SNAPSHOT_DATABASE,
      M8_RECOVERED_DATABASE,
    );

    const snapshot = createClient(
      replaceDatabaseName(sourceUrl, M8_SNAPSHOT_DATABASE),
    );
    const recovered = createClient(
      replaceDatabaseName(sourceUrl, M8_RECOVERED_DATABASE),
    );

    const snapshotFingerprint = await fingerprint(snapshot);
    const recoveredFingerprint = await fingerprint(recovered);

    await snapshot.$disconnect();
    await recovered.$disconnect();

    if (snapshotFingerprint.hash !== beforeSnapshot.hash) {
      throw new Error("Snapshot fingerprint differs from pre-mutation rehearsal state");
    }

    if (recoveredFingerprint.hash !== snapshotFingerprint.hash) {
      throw new Error("Recovered database fingerprint does not match snapshot");
    }

    if (recoveredFingerprint.migrations.length !== expected.length) {
      throw new Error("Recovered database migration count mismatch");
    }

    console.log(
      [
        "M8_DB_REHEARSAL_PASS",
        `migrations=${expected.length}`,
        `schema_columns=${recoveredFingerprint.schemaColumnCount}`,
        "synthetic_import=1",
        "mutation_detected=1",
        "snapshot_match=1",
        "recovered_match=1",
        "production_mutation=0",
        `fingerprint=${recoveredFingerprint.hash}`,
      ].join(" "),
    );
  } finally {
    await admin.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "unknown rehearsal failure";
    const safeMessage = message
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-database-url]")
      .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted-token-like-value]");

    console.error(`M8_DB_REHEARSAL_FAIL reason=${safeMessage}`);
    process.exitCode = 1;
  });
}
