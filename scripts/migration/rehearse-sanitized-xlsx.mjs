import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import {
  assertDisposableMigrationDatabase,
  createXlsxLegacySourcesFromFiles,
  PrismaMigrationTargetStore,
  runXlsxImport,
  summarizeOutcomes,
} from "@ckace/migration";
import { resolveSnapshotDirectory } from "./snapshot-directory.mjs";
import { evaluateRehearsalDispositions } from "./rehearsal-disposition.mjs";

const requiredEnvironment = {
  CKACE_RUNTIME_STAGE: "dev",
  CKACE_SYSTEM_WRITE_MODE: "READ_ONLY",
  CKACE_MIGRATION_JOB: "YES",
};

for (const [name, expected] of Object.entries(requiredEnvironment)) {
  if (process.env[name] !== expected) {
    throw new Error(`${name} must equal ${expected} for this local rehearsal.`);
  }
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL must be set locally.");
assertDisposableMigrationDatabase(databaseUrl);

const snapshotDirectory = resolveSnapshotDirectory();
const workbookFiles = {
  "CKRR_Requests_sanitized.xlsx": path.join(snapshotDirectory, "CKRR_Requests_sanitized.xlsx"),
  "Data_CKRR_Requests_sanitized.xlsx": path.join(snapshotDirectory, "Data_CKRR_Requests_sanitized.xlsx"),
};
const repoRoot = process.cwd();
const migrationRunId = randomUUID();
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

try {
  const attestation = await prisma.$queryRaw`SELECT current_database() AS database_name`;
  if (attestation[0]?.database_name !== "ckace_hr_dev") {
    throw new Error("Connected database did not attest as ckace_hr_dev.");
  }
  const sources = await createXlsxLegacySourcesFromFiles(workbookFiles);
  const store = new PrismaMigrationTargetStore(prisma, process.env);
  const result = await runXlsxImport({
    sources,
    migrationRunId,
    extractedAt: new Date().toISOString(),
    targetStore: store,
  });

  const summary = {
    rehearsal: "SANITIZED_XLSX_IMPORT",
    migrationRunId,
    database: "ckace_hr_dev",
    sourceWorkbookHashes: result.sourceSnapshots.map((snapshot) => ({
      workbook: snapshot.descriptor.sourceWorkbook,
      sourceTab: snapshot.descriptor.sourceTab,
      rowCount: snapshot.records.length,
      snapshotHash: snapshot.snapshotHash,
    })),
    sourceRowsByTab: result.countsByTab,
    outcomesByTab: result.outcomesByTab,
    totals: {
      imported: result.report.importedCount,
      skipped: result.report.skippedCount,
      rejected: result.report.rejectedCount,
      exceptions: result.report.exceptionCount,
      mismatch: result.report.mismatchCount,
      ambiguousWrites: result.report.ambiguousWriteCount,
      stoppedEarly: result.report.stoppedEarly,
      outcomeCounts: summarizeOutcomes(result.report.outcomes),
    },
    rowAccounting: Object.fromEntries(Object.entries(result.countsByTab).map(([tab, count]) => {
      const outcomeCount = Object.values(result.outcomesByTab[tab] ?? {}).reduce((sum, value) => sum + value, 0);
      return [tab, { sourceRows: count, outcomeRows: outcomeCount, unaccountedRows: count - outcomeCount }];
    })),
    pendingApprovalHandoff: result.pendingApprovalHandoff ?? {
      sourcePendingRequestCount: 0,
      targetPendingRequestCount: 0,
      pendingRequestCountMatches: false,
      reroutedRequestCount: 0,
      changedNextApprovers: [],
      unresolvedApprovers: [],
    },
    namedSourceExceptions: result.report.outcomes
      .filter((outcome) => outcome.status === "IMPORTED" && outcome.code)
      .map((outcome) => ({
        sourceId: outcome.legacyId,
        code: outcome.code,
        disposition: outcome.disposition,
      })),
    evidencePolicy: "Counts, source IDs, hashes and exception codes only; no source row values.",
    completedAt: new Date().toISOString(),
  };
  const dispositionEvaluation = evaluateRehearsalDispositions({
    outcomes: result.outcomeDetails,
    rowAccounting: summary.rowAccounting,
    stoppedEarly: result.report.stoppedEarly,
    ambiguousWriteCount: result.report.ambiguousWriteCount,
    rejectedCount: result.report.rejectedCount,
    pendingApprovalHandoff: summary.pendingApprovalHandoff,
  });
  summary.approvedDispositions = {
    passed: dispositionEvaluation.passed,
    outcomes: dispositionEvaluation.outcomeDispositions,
    pending: dispositionEvaluation.pendingDispositions,
    unapprovedOutcomeCount: dispositionEvaluation.unapprovedOutcomeCount,
    hardGates: dispositionEvaluation.hardGates,
  };
  const evidenceDirectory = path.join(repoRoot, "docs", "migration", "evidence");
  await mkdir(evidenceDirectory, { recursive: true });
  const evidencePath = path.join(evidenceDirectory, `${migrationRunId}-import-summary.json`);
  await writeFile(evidencePath, `${JSON.stringify(summary, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify({ ...summary, evidenceFile: path.relative(repoRoot, evidencePath) }, null, 2)}\n`);
  if (!dispositionEvaluation.passed) process.exitCode = 2;
} finally {
  await prisma.$disconnect();
}
