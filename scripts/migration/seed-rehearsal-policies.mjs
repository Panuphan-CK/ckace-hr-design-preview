import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { seedRehearsalPolicyBaseline } from "@ckace/migration";

function requiredEnvironment(name, expected) {
  if (process.env[name] !== expected) {
    throw new Error(`${name} must equal ${expected} for local policy seeding.`);
  }
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

requiredEnvironment("CKACE_RUNTIME_STAGE", "dev");
requiredEnvironment("CKACE_SYSTEM_WRITE_MODE", "READ_ONLY");
requiredEnvironment("CKACE_MIGRATION_JOB", "YES");

const baselineArgumentIndex = process.argv.indexOf("--policy-baseline");
const suppliedBaselinePath = baselineArgumentIndex >= 0
  ? process.argv[baselineArgumentIndex + 1]
  : process.env.CKACE_TESTM74_POLICY_BASELINE;
if (!suppliedBaselinePath || suppliedBaselinePath.startsWith("--")) {
  throw new Error("Provide --policy-baseline <external JSON path> or CKACE_TESTM74_POLICY_BASELINE.");
}

const baselinePath = path.resolve(suppliedBaselinePath);
const repositoryRoot = path.resolve(process.cwd());
if (isInside(repositoryRoot, baselinePath)) {
  throw new Error("Keep the TESTm74 policy baseline outside the repository.");
}
const rawBaseline = await readFile(baselinePath, "utf8");
const baselineHash = createHash("sha256").update(rawBaseline, "utf8").digest("hex");
let baseline;
try {
  baseline = JSON.parse(rawBaseline);
} catch {
  throw new Error("TESTm74 policy baseline is not valid JSON.");
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL must point to loopback ckace_hr_dev.");
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
try {
  const result = await seedRehearsalPolicyBaseline({ prisma, env: process.env, baseline });
  process.stdout.write(`${JSON.stringify({
    source: "TESTm74",
    sourceRevision: baseline.sourceRevision,
    baselineSha256: baselineHash,
    ...result,
  }, null, 2)}\n`);
} finally {
  await prisma.$disconnect();
}
