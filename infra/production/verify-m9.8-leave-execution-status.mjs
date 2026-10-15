import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const s = JSON.parse(
  readFileSync(
    path.join(here, "m9.8-leave-execution-status.json"),
    "utf8",
  ),
);

function a(condition, message) {
  if (!condition) throw new Error(message);
}

a(s.schemaVersion === "m9.8-v1", "schema drift");
a(
  s.mode === "OWNER_APPROVED_LEAVE_PRODUCTION_EXECUTION",
  "Owner execution approval missing",
);
a(
  s.phase === "PREFLIGHT_BLOCKED",
  "M9.8 must remain preflight-blocked until gateway compatibility approval",
);
a(
  s.decision ===
    "BLOCKED_BOUNDED_LEGACY_GATEWAY_COMPATIBILITY_APPROVAL_REQUIRED",
  "M9.8 blocker decision drift",
);

for (const key of [
  "leaveReadAuthority",
  "leaveWriteAuthority",
  "sourceOfTruth",
  "moduleRouting",
]) {
  a(s.productionSafety[key] === "LEGACY", `${key} drift`);
}

for (const key of [
  "leaveWriteFreezeActive",
  "productionSchemaApplied",
  "productionBusinessDataImported",
  "moduleAuthorityChanged",
  "dnsChanged",
  "lineChanged",
  "gasChanged",
  "legacyRetired",
]) {
  a(s.productionSafety[key] === false, `${key} must remain false`);
}

a(
  s.preflight.legacy.quietWindowStatus === "PASS" &&
    s.preflight.legacy.errorEntries === 0,
  "Legacy quiet window failed",
);
a(
  s.preflight.legacy.projectBBridgePresentInDeployedGateway ===
    false,
  "unexpected Legacy gateway bridge state",
);
a(
  s.preflight.projectBApi.productionNewAuthorityCurrentlyAllowedByCode ===
    false,
  "Project B Production route lock evidence drift",
);
a(
  s.preflight.database.applicationTables === 0 &&
    s.preflight.database.preStageSnapshotPresent === true,
  "Production DB preflight drift",
);
a(
  s.requiredApprovalToContinue.scope ===
    "BOUNDED_PROJECT_A_LEGACY_GATEWAY_COMPATIBILITY_CHANGE_FOR_LEAVE_ONLY",
  "required approval scope drift",
);

console.log(
  "M9_8_LEAVE_EXECUTION_PREFLIGHT_BLOCKED_PASS quiet30m=PASS dbTables=0 authority=LEGACY freeze=OFF import=0 cutover=0 blocker=LEGACY_GATEWAY_BRIDGE_APPROVAL_REQUIRED",
);
