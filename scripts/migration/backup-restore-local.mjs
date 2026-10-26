import { execFile } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { performance } from "node:perf_hooks";

import { assertDisposableMigrationDatabase } from "@ckace/migration";

const execFileAsync = promisify(execFile);
const action = process.argv[2];
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL must be set locally.");
assertDisposableMigrationDatabase(databaseUrl);
if (process.env.CKACE_RUNTIME_STAGE !== "dev") throw new Error("CKACE_RUNTIME_STAGE must equal dev.");
if (process.env.CKACE_MIGRATION_REHEARSAL !== "YES") {
  throw new Error("Set CKACE_MIGRATION_REHEARSAL=YES after verifying this is a disposable database.");
}

const parsed = new URL(databaseUrl);
const databaseName = "ckace_hr_dev";
const pgEnvironment = {
  ...process.env,
  PGHOST: parsed.hostname.replace(/^\[|\]$/g, ""),
  PGPORT: parsed.port || "5432",
  PGDATABASE: databaseName,
  PGUSER: decodeURIComponent(parsed.username),
  PGPASSWORD: decodeURIComponent(parsed.password),
  ...(parsed.searchParams.get("sslmode") ? { PGSSLMODE: parsed.searchParams.get("sslmode") } : {}),
};
const repoRoot = process.cwd();
const evidenceDirectory = path.join(repoRoot, "docs", "migration", "evidence");

function requireConfirmation() {
  if (process.env.CKACE_REHEARSAL_CONFIRM !== "YES") {
    throw new Error("Set CKACE_REHEARSAL_CONFIRM=YES only for the disposable ckace_hr_dev rehearsal.");
  }
}

async function runPgCommand(command, args) {
  const started = performance.now();
  try {
    await execFileAsync(command, args, { env: pgEnvironment, windowsHide: true, maxBuffer: 1024 * 1024 });
  } catch {
    throw new Error(`${command} failed. Check local PostgreSQL client installation and local database logs.`);
  }
  return Math.round((performance.now() - started) / 10) / 100;
}

async function outsideRepo(filePath) {
  const absolute = path.resolve(filePath);
  const relative = path.relative(repoRoot, absolute);
  if (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative)) {
    throw new Error("Database dump files must be stored outside the repository.");
  }
  return absolute;
}

let result;
if (action === "backup") {
  requireConfirmation();
  const backupPath = await outsideRepo(process.argv[3] ?? path.join(os.tmpdir(), `ckace-hr-dev-${Date.now()}.dump`));
  const existingBackup = await stat(backupPath).catch(() => null);
  if (existingBackup) throw new Error("Backup path already exists; choose a new file to avoid overwriting an earlier rehearsal dump.");
  await mkdir(path.dirname(backupPath), { recursive: true });
  const seconds = await runPgCommand("pg_dump", ["--format=custom", "--no-owner", "--file", backupPath]);
  result = { action, database: databaseName, seconds, backupFile: backupPath };
} else if (action === "restore" || action === "reset") {
  requireConfirmation();
  const backupPath = await outsideRepo(process.argv[3] ?? "");
  const backup = await stat(backupPath).catch(() => null);
  if (!backup?.isFile()) throw new Error("A readable baseline dump outside the repository is required.");
  const seconds = await runPgCommand("pg_restore", ["--clean", "--if-exists", "--exit-on-error", "--single-transaction", "--no-owner", "--dbname", databaseName, backupPath]);
  result = { action, database: databaseName, seconds, restoredFrom: backupPath };
} else {
  throw new Error("Usage: node scripts/migration/backup-restore-local.mjs backup [path] | restore <baseline-dump> | reset <baseline-dump>");
}

await mkdir(evidenceDirectory, { recursive: true });
const evidencePath = path.join(evidenceDirectory, `database-${action}-${Date.now()}.json`);
await writeFile(evidencePath, `${JSON.stringify({ ...result, completedAt: new Date().toISOString() }, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
process.stdout.write(`${JSON.stringify({ ...result, evidenceFile: path.relative(repoRoot, evidencePath) }, null, 2)}\n`);
