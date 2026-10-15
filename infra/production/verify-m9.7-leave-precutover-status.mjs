import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const s = JSON.parse(
  readFileSync(
    path.join(here, "m9.7-leave-precutover-status.json"),
    "utf8",
  ),
);
const m96 = JSON.parse(
  readFileSync(
    path.join(here, "m9.6-provisioning-status.json"),
    "utf8",
  ),
);

function a(condition, message) {
  if (!condition) throw new Error(message);
}

a(s.schemaVersion === "m9.7-v1", "schema drift");
a(
  s.mode === "PRE_CUTOVER_PREPARATION_ONLY",
  "M9.7 must stay preparation-only",
);
a(
  s.productionMutationAuthorized === false,
  "M9.7 must not authorize Production mutation",
);
a(s.module === "LEAVE", "named module drift");
a(
  s.decision ===
    "PASS_PRECUTOVER_PREP_OWNER_GATE_REQUIRED_NO_CUTOVER",
  "decision drift",
);

for (const key of ["read", "write", "sourceOfTruth", "moduleRouting"]) {
  a(s.authority[key] === "LEGACY", `${key} authority drift`);
}

a(
  s.legacyBaseline.quietWindow.status === "PASS" &&
    s.legacyBaseline.quietWindow.errorEntries === 0 &&
    s.legacyBaseline.quietWindow.lookbackMinutes === 30,
  "Legacy quiet-window gate failed",
);
a(
  s.legacyBaseline.quietWindow.mustRecheckImmediatelyBeforeFreeze ===
    true,
  "quiet-window recheck requirement missing",
);

const sourceKeys = new Set(
  s.sourceContract.sources.map(
    (source) =>
      `${source.workbook}::${source.tab}::${source.period}`,
  ),
);
for (const required of [
  "CK&RR_Requests::UserPolicies::CURRENT",
  "Data_CK&RR_Requests::LeaveRequests::CURRENT",
  "Data_CK&RR_Requests::LeaveRequests_2025::2025",
  "Data_CK&RR_Requests::ApprovalSteps::CURRENT",
  "Data_CK&RR_Requests::Attachments::CURRENT",
]) {
  a(sourceKeys.has(required), `missing LEAVE source ${required}`);
}
a(
  s.sourceContract.readOnlyExtractionRequired === true &&
    s.sourceContract.sameDescriptorSetRequiredForFinalDelta ===
      true &&
    s.sourceContract.sourceQualifiedProvenanceRequired === true,
  "source extraction contract drift",
);

a(
  s.migrationCoverage.attachmentTransformer ===
    "leave-attachment-v1",
  "LEAVE attachment migration coverage missing",
);
a(
  s.migrationCoverage.attachmentPolicy.privacyClass ===
    "EMPLOYEE_PRIVATE",
  "LEAVE attachment privacy drift",
);
a(
  s.migrationCoverage.attachmentPolicy.archiveAssociationRule ===
    "CURRENT_REQUEST_ONLY_DO_NOT_INFER_ARCHIVE_HISTORY_BY_LEAVE_ID",
  "unsafe archive attachment association",
);

for (const check of [
  "request_count",
  "request_status_counts",
  "leave_type_counts",
  "duration_counts",
  "entitlement_count",
  "quota_total",
  "attachment_count",
]) {
  a(
    s.reconciliationGate.leaveChecks.includes(check),
    `missing LEAVE reconciliation check ${check}`,
  );
}

a(
  s.executionWindowPlan
    .ownerApprovalRequiredBeforeProductionSchemaOrDataWrite ===
    true,
  "Production schema/data Owner gate missing",
);
a(
  s.executionWindowPlan.ownerApprovalRequiredBeforeWriteFreezeActivation ===
    true,
  "write-freeze Owner gate missing",
);
a(
  s.executionWindowPlan.ownerApprovalRequiredBeforeAuthoritySwitch ===
    true,
  "authority-switch Owner gate missing",
);

for (const key of [
  "productionBusinessDataImported",
  "productionSchemaAppliedForModuleCutover",
  "moduleAuthorityChanged",
  "dnsChanged",
  "lineChanged",
  "gasChanged",
  "legacyRetired",
]) {
  a(s.productionSafety[key] === false, `${key} must remain false`);
}

a(
  s.verification.targetedTests.filesPassed === 2 &&
    s.verification.targetedTests.testsPassed === 19 &&
    s.verification.migrationPackageTypecheck === "PASS" &&
    s.verification.repositoryQa.lint === "PASS" &&
    s.verification.repositoryQa.typecheck === "PASS" &&
    s.verification.repositoryQa.testFilesPassed === 54 &&
    s.verification.repositoryQa.testsPassed === 355 &&
    s.verification.repositoryQa.build === "PASS",
  "M9.7 code verification drift",
);

a(
  m96.currentDecision ===
    "PASS_CLOSED_PROVISIONED_AND_STAGED_NO_CUTOVER",
  "M9.6 landing-zone prerequisite drift",
);
a(
  m96.safety.sourceOfTruth === "LEGACY" &&
    m96.safety.moduleRouting === "LEGACY" &&
    m96.safety.productionBusinessDataImported === false &&
    m96.safety.moduleAuthorityChanged === false,
  "M9.6 safety prerequisite drift",
);

console.log(
  "M9_7_LEAVE_PRECUTOVER_VERIFY_PASS quiet30m=PASS sources=5 attachments=COVERED targeted=19 full=355 lint=PASS typecheck=PASS build=PASS authority=LEGACY cutover=0 ownerGate=REQUIRED",
);
