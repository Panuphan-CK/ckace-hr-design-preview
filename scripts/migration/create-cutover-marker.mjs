import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

import { createCutoverMarker, ensureOutsideRepositoryPath } from "./cutover-export.mjs";

if (process.env.CKACE_CUTOVER_MARKER_CONFIRM !== "YES") {
  throw new Error("Set CKACE_CUTOVER_MARKER_CONFIRM=YES only at the Owner-approved full-system opening.");
}
if (process.env.CKACE_SYSTEM_WRITE_MODE !== "READ_ONLY") {
  throw new Error("Create the cutover marker while CKACE_SYSTEM_WRITE_MODE=READ_ONLY, before opening writes.");
}

const outputIndex = process.argv.indexOf("--output");
const suppliedPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined;
if (!suppliedPath || suppliedPath.startsWith("--")) {
  throw new Error("Usage: node scripts/migration/create-cutover-marker.mjs --output <external-marker.json>");
}

const repositoryRoot = process.cwd();
const outputPath = await ensureOutsideRepositoryPath(suppliedPath, repositoryRoot);
const marker = createCutoverMarker({ now: new Date(), runId: randomUUID() });
await writeFile(outputPath, `${JSON.stringify(marker, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o600,
});
process.stdout.write(`${JSON.stringify({ cutoverAt: marker.cutoverAt, runId: marker.runId, markerFile: outputPath })}\n`);
