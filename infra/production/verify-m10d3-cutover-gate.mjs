import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const delta = JSON.parse(readFileSync(path.join(here, "m10d3-leave-live-delta.json"), "utf8"));
const status = JSON.parse(readFileSync(path.join(here, "m10d3-cutover-gate-status.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(delta.schemaVersion === "m10d3-leave-live-delta-v1", "delta schema drift");
assert(status.schemaVersion === "m10d3-cutover-gate-v1", "status schema drift");
assert(status.decision === "GATE_PASS_EXECUTION_NO_GO", "cutover gate decision drift");
assert(status.sourceOfTruth === "LEGACY", "source-of-truth must remain LEGACY");

assert(delta.totals.baselineRows === 576, "baseline row count drift");
assert(delta.totals.liveRows === 576, "live row count drift");
assert(delta.totals.added === 0, "unexpected added records");
assert(delta.totals.removed === 0, "unexpected removed records");
assert(delta.totals.changed === 27, "raw changed-record count drift");

assert(delta.semanticClassification.actionableCanonicalChanges.count === 6, "actionable delta count drift");
assert(delta.semanticClassification.sourceInconsistency.count === 1, "source inconsistency count drift");
assert(delta.semanticClassification.representationOrExpectedModelDrift.count === 20, "representation/model drift count drift");
assert(
  6 + 1 + 20 === delta.totals.changed,
  "semantic classification does not cover all raw changed records",
);

const actionable = new Set(
  delta.semanticClassification.actionableCanonicalChanges.records.map(
    (record) => record.sourceTab + "/" + record.legacyId,
  ),
);
for (const expected of [
  "LeaveRequests/LEV-0103",
  "LeaveRequests/LEV-0104",
  "LeaveRequests/LEV-0108",
  "ApprovalSteps/LEV-0103-STEP3",
  "ApprovalSteps/LEV-0104-STEP3",
  "ApprovalSteps/LEV-0108-STEP1",
]) {
  assert(actionable.has(expected), "missing actionable delta " + expected);
}

assert(
  delta.semanticClassification.sourceInconsistency.records[0]?.legacyId === "LEV-0106",
  "LEV-0106 source inconsistency missing",
);
assert(delta.privacy.leaveDescriptionsPersisted === false, "private leave descriptions must not be persisted");
assert(delta.privacy.employeeNamesPersisted === false, "employee names must not be persisted");
assert(delta.privacy.sourceRowsPersisted === false, "raw source rows must not be persisted");
assert(delta.privacy.onlySourceQualifiedIdsAndHashes === true, "delta evidence must remain source-qualified/hash-only");

assert(status.legacyRuntime.trafficPercent === 100, "Legacy gateway traffic drift");
assert(status.legacyRuntime.backendAuthority === "GAS", "Legacy backend authority drift");
assert(status.legacyRuntime.smoke.root === 200, "Legacy root smoke failed");
assert(status.legacyRuntime.smoke.liff === 200, "Legacy LIFF smoke failed");
assert(status.legacyRuntime.smoke.health === 200, "Legacy health smoke failed");
assert(status.legacyRuntime.errorLookbackMinutes === 30, "quiet-window evidence drift");
assert(status.legacyRuntime.errorCount === 0, "Legacy quiet window is not clean");

assert(status.projectBProduction.baseline.apiTrafficPercent === 100, "Project B API baseline traffic drift");
assert(status.projectBProduction.baseline.webTrafficPercent === 100, "Project B Web baseline traffic drift");
assert(status.projectBProduction.candidate.apiTrafficPercent === 0, "Project B API candidate must remain 0%");
assert(status.projectBProduction.candidate.webTrafficPercent === 0, "Project B Web candidate must remain 0%");
assert(status.projectBProduction.currentAuthority === "LEGACY", "Project B authority drift");

assert(status.delta.rawChangedRecords === 27, "status raw delta count drift");
assert(status.delta.actionableCanonicalChanges === 6, "status actionable delta drift");
assert(status.delta.sourceInconsistencies === 1, "status source inconsistency drift");
assert(status.delta.representationOrExpectedModelDrift === 20, "status representation drift");
assert(status.delta.requiresBoundedDeltaImport === true, "bounded delta import gate missing");
assert(status.delta.deltaImportedByM10D3 === false, "M10D.3 must not import Production delta");

assert(status.identity.activeAccounts === 20, "active account count drift");
assert(status.identity.lineLinkedActiveAccounts === 19, "LINE-linked active count drift");
assert(status.identity.desktopActivatedAccounts === 0, "Desktop activated count drift");
assert(status.identity.activeUnlinkedExceptions === 1, "identity exception count drift");

for (const prohibited of [
  "PRODUCTION_WRITE_FREEZE",
  "PRODUCTION_DELTA_IMPORT",
  "PRODUCTION_TRAFFIC_SWITCH",
  "PRODUCTION_MODULE_AUTHORITY_SWITCH",
  "SOURCE_OF_TRUTH_SWITCH",
]) {
  assert(status.prohibitedWithoutNextApproval.includes(prohibited), "missing safety gate " + prohibited);
}

assert(status.nextAction.phase === "M10D.4_LEAVE_EXECUTION_WINDOW", "next phase drift");
assert(status.nextAction.ownerApprovalRequired === true, "next execution window must require Owner approval");

console.log([
  "M10D3_CUTOVER_GATE_VERIFY_PASS",
  "decision=GATE_PASS_EXECUTION_NO_GO",
  "baseline_rows=576",
  "live_rows=576",
  "raw_changed=27",
  "actionable=6",
  "source_exception=1",
  "representation_drift=20",
  "legacy_quiet_errors=0",
  "legacy_traffic=100",
  "candidate_traffic=0",
  "active_unlinked_identity=1",
  "source_of_truth=LEGACY",
].join(" "));
