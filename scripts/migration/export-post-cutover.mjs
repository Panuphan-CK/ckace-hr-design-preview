import { lstat, open, readFile, unlink } from "node:fs/promises";

import { PrismaClient } from "@prisma/client";
import { ensureOutsideRepositoryPath, readPostCutoverBundle } from "./cutover-export.mjs";
import { buildPostCutoverHrWorkbookBuffer, hrWorkbookPathForJson } from "./cutover-hr-workbook.mjs";

const markerIndex = process.argv.indexOf("--marker");
const outputIndex = process.argv.indexOf("--output");
const markerArgument = markerIndex >= 0 ? process.argv[markerIndex + 1] : undefined;
const outputArgument = outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined;
if (!markerArgument || markerArgument.startsWith("--") || !outputArgument || outputArgument.startsWith("--")) {
  throw new Error("Usage: node scripts/migration/export-post-cutover.mjs --marker <external-marker.json> --output <external-export.json>");
}

async function writeExclusive(filePath, content, options) {
  const handle = await open(filePath, "wx", 0o600);
  try {
    await handle.writeFile(content, options);
    await handle.close();
  } catch (error) {
    await handle.close().catch(() => {});
    await unlink(filePath).catch(() => {});
    throw error;
  }
}

async function writeExportPair(jsonPath, jsonContent, workbookPath, workbookContent) {
  const created = [];
  try {
    await writeExclusive(jsonPath, jsonContent, { encoding: "utf8" });
    created.push(jsonPath);
    await writeExclusive(workbookPath, workbookContent);
    created.push(workbookPath);
  } catch (error) {
    await Promise.all(created.map((filePath) => unlink(filePath).catch(() => {})));
    throw error;
  }
}

const repositoryRoot = process.cwd();
const markerPath = await ensureOutsideRepositoryPath(markerArgument, repositoryRoot);
const outputPath = await ensureOutsideRepositoryPath(outputArgument, repositoryRoot);
const hrOutputPath = await ensureOutsideRepositoryPath(hrWorkbookPathForJson(outputPath), repositoryRoot);
for (const candidate of [outputPath, hrOutputPath]) {
  try {
    await lstat(candidate);
    throw new Error(`Refusing to overwrite an existing export file: ${candidate}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
const marker = JSON.parse(await readFile(markerPath, "utf8"));
const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL must be supplied through the environment; never pass it on the command line.");

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
try {
  const { jsonExport, hrWorkbook } = await readPostCutoverBundle({ prisma, marker, env: process.env });
  const workbookBuffer = await buildPostCutoverHrWorkbookBuffer(hrWorkbook);
  await writeExportPair(
    outputPath,
    `${JSON.stringify(jsonExport, null, 2)}\n`,
    hrOutputPath,
    workbookBuffer,
  );
  process.stdout.write(`${JSON.stringify({
    database: jsonExport.database,
    runtimeStage: jsonExport.runtimeStage,
    cutoverAt: jsonExport.cutoverAt,
    runId: jsonExport.runId,
    counts: jsonExport.counts,
    exportFile: outputPath,
    hrWorkbookFile: hrOutputPath,
  }, null, 2)}\n`);
} finally {
  await prisma.$disconnect();
}
