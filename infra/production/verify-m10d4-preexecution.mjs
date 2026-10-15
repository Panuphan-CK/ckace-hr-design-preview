import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export function verifyM10D4Preexecution(record, previous, delta) {
  assert.equal(record.schemaVersion, "m10d4-preexecution-readiness-v1");
  assert.equal(record.phase, "M10D.4_PREEXECUTION_READINESS_ONLY");
  assert.equal(record.ownerApprovalScope, "PREEXECUTION_READINESS_ONLY");
  assert.equal(record.decision, "EXECUTION_NO_GO");
  assert.equal(record.sourceOfTruth, "LEGACY");

  assert.equal(previous.decision, "GATE_PASS_EXECUTION_NO_GO");
  assert.equal(previous.sourceOfTruth, "LEGACY");
  const baseline = record.immutableBaseline;
  for (const [field, actual] of Object.entries({
    baselineRows: delta.totals.baselineRows,
    liveRows: delta.totals.liveRows,
    rawChanged: delta.totals.changed,
    added: delta.totals.added,
    removed: delta.totals.removed,
    actionable: delta.semanticClassification.actionableCanonicalChanges.count,
    sourceInconsistency: delta.semanticClassification.sourceInconsistency.count,
    representationDrift: delta.semanticClassification.representationOrExpectedModelDrift.count,
  })) {
    assert.equal(baseline[field], actual, "M10D.3 baseline drift: " + field);
  }
  assert.equal(previous.delta.deltaImportedByM10D3, false);
  assert.equal(previous.identity.activeUnlinkedExceptions, 1);

  const requiredPaths = [
    "desktop-create", "desktop-edit", "desktop-delete", "desktop-cancel",
    "desktop-approve", "desktop-revise", "desktop-resubmit",
    "gas-liff-create", "gas-liff-decision",
    "gateway-liff-create", "gateway-liff-decision",
  ];
  assert.equal(record.legacyWritePaths.length, requiredPaths.length, "Legacy write path coverage count changed");
  const indexed = new Map(record.legacyWritePaths.map((item) => [item.id, item]));
  assert.equal(indexed.size, requiredPaths.length, "Legacy write paths duplicate");
  for (const id of requiredPaths) {
    assert.ok(indexed.has(id), "Missing Legacy LEAVE write path " + id);
    const item = indexed.get(id);
    assert.ok(typeof item.entry === "string" && item.entry.length > 12);
    if (id.startsWith("gateway-")) {
      assert.equal(item.freezeCoverage, "LOCAL_GUARD_PRESENT_PRODUCTION_NOT_VERIFIED");
    } else {
      assert.equal(item.freezeCoverage, "NOT_PROVEN");
    }
  }

  const gates = record.preexecutionGates;
  assert.equal(gates.globalLegacyFreezeCoverage, "BLOCKED_DIRECT_GAS_WRITES_NOT_GUARDED");
  assert.equal(gates.gatewayProductionRevisionBridgeParity, "UNVERIFIED_PREVIOUS_BRIDGE_GOAL_CANCELLED");
  assert.equal(gates.legacyQuietWindowAndBackups, "RECHECK_REQUIRED");
  assert.equal(gates.finalFiveSourceSnapshotAfterFreeze, "NOT_STARTED");
  assert.equal(gates.lev0106Disposition, "UNRESOLVED_DO_NOT_BLINDLY_IMPORT");
  assert.equal(gates.deltaImportAndModuleReconciliation, "NOT_STARTED");
  assert.equal(gates.ownerVerifiedUnlinkedIdentity, "UNRESOLVED_FAIL_CLOSED");
  assert.equal(gates.pairedLeaveAuthorityApproval, "NOT_GRANTED");
  assert.equal(gates.rollbackDrill, "NOT_VERIFIED_FOR_LIVE_EXECUTION");

  for (const value of Object.values(record.noProductionMutation)) {
    assert.equal(value, false, "Production mutation must not be represented as authorized or completed");
  }
  for (const required of [
    "PRODUCTION_LEAVE_WRITE_FREEZE",
    "PRODUCTION_LEAVE_DELTA_IMPORT",
    "PRODUCTION_TRAFFIC_SWITCH",
    "PAIRED_LEAVE_READ_WRITE_AUTHORITY_SWITCH",
    "PRODUCTION_SOURCE_OF_TRUTH_CHANGE",
  ]) {
    assert.ok(record.ownerApprovalRequiredBefore.includes(required), "Missing owner gate: " + required);
  }
  assert.equal(record.cutoverSafety.requireBothLeaveAuthoritiesSwitchTogether, true);
  assert.equal(record.cutoverSafety.doNotAssumeGatewayFlagFreezesDirectGAS, true);
  assert.equal(record.cutoverSafety.noIndefiniteDualWrite, true);
  assert.match(record.cutoverSafety.afterFirstNewWrite, /NO_BLIND_ROLLBACK/);
  return {
    decision: record.decision,
    writePaths: indexed.size,
    freezeCoverage: gates.globalLegacyFreezeCoverage,
    identity: gates.ownerVerifiedUnlinkedIdentity,
    sourceException: gates.lev0106Disposition,
  };
}

export function verifyM10D4PreexecutionFiles() {
  const read = (name) => JSON.parse(readFileSync(path.join(here, name), "utf8"));
  return verifyM10D4Preexecution(
    read("m10d4-preexecution-readiness.json"),
    read("m10d3-cutover-gate-status.json"),
    read("m10d3-leave-live-delta.json"),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyM10D4PreexecutionFiles();
  console.log(
    "M10D4_PREEXECUTION_EVIDENCE_PASS execution=" + result.decision +
    " legacy_write_paths=" + result.writePaths +
    " global_freeze=" + result.freezeCoverage +
    " identity=" + result.identity +
    " source_exception=" + result.sourceException,
  );
}
