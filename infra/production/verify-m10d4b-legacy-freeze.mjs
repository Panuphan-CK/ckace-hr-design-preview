import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
export function verifyM10D4B(record, previous) {
  assert.equal(record.schemaVersion, "m10d4b-legacy-leave-freeze-preparation-v1");
  assert.equal(record.phase, "M10D.4B_LOCAL_TEST_HARDENING");
  assert.equal(record.scope, "PROJECT_B_READINESS_ARTIFACT_ONLY_DUE_PROJECT_A_MUTEX");
  assert.equal(record.decision, "IMPLEMENTATION_BLOCKED_WORKSPACE_MUTATION_OWNER");
  assert.equal(previous.decision, "EXECUTION_NO_GO");
  assert.equal(record.projectB.sourceOfTruth, "LEGACY");
  assert.equal(record.sourceInventory.count, 15);
  assert.equal(record.sourceInventory.paths.length, record.sourceInventory.count);
  assert.equal(new Set(record.sourceInventory.paths.map(p => p.id)).size, 15);
  assert.equal(new Set(record.sourceInventory.paths.map(p => p.entry)).size, 15);
  const count = channel => record.sourceInventory.paths.filter(p => p.channel === channel).length;
  assert.equal(count("DIRECT_GAS_DESKTOP"), 10);
  assert.equal(count("GAS_LIFF"), 2);
  assert.equal(count("GATEWAY_LIFF"), 2);
  assert.equal(count("USER_ACTIVATION"), 1);
  for (const p of record.sourceInventory.paths) {
    assert.match(p.file, /^(Gs\/|line-gateway\/)/);
    assert.ok(p.required.length > 15);
  }
  assert.equal(record.guardContract.property, "CKACE_LEAVE_WRITE_FREEZE");
  assert.equal(record.guardContract.noClientSetter, true);
  assert.equal(record.guardContract.scriptLockRecheck, true);
  assert.equal(record.guardContract.readsRemainAvailable, true);
  assert.equal(record.guardContract.unrelatedWritesRemainAvailable, true);
  assert.equal(record.guardContract.noLivePropertyChangeAuthorized, true);
  assert.equal(record.gates.sourceEdits, "BLOCKED_BY_PROJECT_A_MUTATION_OWNER");
  assert.equal(record.gates.isolatedGASBehaviorTests, "NOT_RUN");
  assert.equal(record.gates.productionDeployedParity, "NOT_VERIFIED");
  assert.equal(record.gates.productionExecutionApproval, "NOT_GRANTED");
  assert.equal(record.gates.cutoverAuthority, "LEGACY");
  assert.equal(record.productionMutationsPerformed, false);
  assert.ok(record.cleanupExceptions.every(c => c.includes("rollback")));
  return { decision: record.decision, pathCount: record.sourceInventory.count };
}

export function verifyM10D4BFiles() {
  const read = f => JSON.parse(readFileSync(path.join(dir, f), "utf8"));
  return verifyM10D4B(read("m10d4b-legacy-freeze-preparation.json"), read("m10d4-preexecution-readiness.json"));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyM10D4BFiles();
  console.log("M10D4B_PREPARATION_EVIDENCE_PASS source_code=" + result.decision + " mutation_paths=" + result.pathCount + " production=UNCHANGED");
}
