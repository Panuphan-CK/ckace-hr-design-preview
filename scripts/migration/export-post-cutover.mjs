import { readFile, writeFile } from "node:fs/promises";

import { PrismaClient } from "@prisma/client";
import { ensureOutsideRepositoryPath, readPostCutoverExport } from "./cutover-export.mjs";

const markerIndex = process.argv.indexOf("--marker");
const outputIndex = process.argv.indexOf("--output");
const markerArgument = markerIndex >= 0 ? process.argv[markerIndex + 1] : undefined;
const outputArgument = outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined;
if (!markerArgument || markerArgument.startsWith("--") || !outputArgument || outputArgument.startsWith("--")) {
  throw new Error("Usage: node scripts/migration/export-post-cutover.mjs --marker <external-marker.json> --output <external-export.json>");
}

const repositoryRoot = process.cwd();
const markerPath = await ensureOutsideRepositoryPath(markerArgument, repositoryRoot);
const outputPath = await ensureOutsideRepositoryPath(outputArgument, repositoryRoot);
const marker = JSON.parse(await readFile(markerPath, "utf8"));
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL must be supplied through the environment; never pass it on the command line.");

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
try {
  const result = await readPostCutoverExport({ prisma, marker, env: process.env });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  process.stdout.write(`${JSON.stringify({
    database: result.database,
    runtimeStage: result.runtimeStage,
    cutoverAt: result.cutoverAt,
    runId: result.runId,
    counts: result.counts,
    exportFile: outputPath,
  }, null, 2)}\n`);
} finally {
  await prisma.$disconnect();
}
