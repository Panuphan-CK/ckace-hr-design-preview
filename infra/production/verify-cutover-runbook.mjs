import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const runbook = JSON.parse(readFileSync(path.join(here, "cutover-runbook-manifest.json"), "utf8"));
const release = JSON.parse(readFileSync(path.join(here, "release-manifest.json"), "utf8"));
const rollback = JSON.parse(readFileSync(path.join(here, "observability-rollback-manifest.json"), "utf8"));
const readiness = JSON.parse(readFileSync(path.join(here, "readiness-manifest.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(runbook.mode === "RUNBOOK_ONLY", "M8.6 must be runbook-only");
assert(runbook.productionMutationAuthorized === false, "M8.6 must not authorize Production mutation");
assert(runbook.evidence.productionMutation === "NONE", "M8.6 must record zero Production mutation");

assert(runbook.releaseAnchor.releaseId === release.releaseId, "Release ID drift");
assert(runbook.releaseAnchor.apiImage === release.artifacts.api.immutableRef, "API release digest drift");
assert(runbook.releaseAnchor.webImage === release.artifacts.web.immutableRef, "Web release digest drift");
assert(runbook.releaseAnchor.sourceSha256 === release.source.artifactInputSha256, "Source fingerprint drift");
assert(runbook.releaseAnchor.migrationSetSha256 === release.schema.migrationSetSha256, "Migration fingerprint drift");

assert(runbook.rollbackAnchor.observabilityContract === rollback.schemaVersion, "M8.5 contract drift");
for (const key of ["apiRollback", "webRollback", "databaseRecovery", "objectRecovery"]) {
  assert(runbook.rollbackAnchor[key] === "PASS", key + " must be PASS");
}

const current = runbook.currentState;
assert(current.legacyProduction.revision === "ckrr-line-gateway-readretry-20261006a", "Legacy canonical revision drift");
assert(current.legacyProduction.trafficPercent === 100, "Legacy gateway must remain 100% at M8.6 capture");
assert(current.legacyProduction.gasVersion === "v38", "Accepted GAS version drift");
assert(current.legacyProduction.gasHistoricalRollbackVersion === "v37", "GAS rollback version drift");
assert(current.line.productionLiffId === "2011403971-rHQJIrOx", "Production LIFF ID drift");
assert(current.line.currentEndpoint === current.legacyProduction.canonicalLiffEndpoint, "Current LIFF endpoint must map to legacy gateway");
assert(current.line.richMenus.length === 3, "Expected exactly three current Rich Menu roles");
assert(new Set(current.line.richMenus.map((item) => item.alias)).size === 3, "Rich Menu aliases must be unique");
assert(current.projectB.productionServicesPresent === false, "M8.6 captured Production services as absent");
assert(current.projectB.productionDomainDnsState === "NXDOMAIN", "M8.6 captured production domain as NXDOMAIN");
assert(current.projectB.moduleRoutingPlaneImplemented === false, "Do not claim module routing is implemented");
assert(current.projectB.writeFreezeControlImplemented === false, "Do not claim write-freeze is implemented");

assert(runbook.targetState.productionLiffId === current.line.productionLiffId, "Target must preserve existing Production LIFF ID");
assert(runbook.targetState.liffEndpoint === "https://hr.ckaceaccount.com/liff", "Target LIFF endpoint drift");
assert(runbook.targetState.firebaseSite === readiness.firebase.productionSite, "Firebase site drift");
assert(runbook.targetState.cloudRunApiService === readiness.gcp.apiService, "API service target drift");
assert(runbook.targetState.cloudRunWebService === readiness.gcp.webService, "Web service target drift");
assert(runbook.targetState.databaseName === readiness.runtime.databaseName, "Production DB target drift");
assert(runbook.targetState.r2PrimaryBucket === readiness.runtime.r2Bucket, "Production R2 target drift");

assert(runbook.authorityPolicy.noIndefiniteDualWrite === true, "Indefinite dual-write must be forbidden");
assert(runbook.authorityPolicy.pairedAuthoritySwitchRequired === true, "Read/write authority switch must be paired");
assert(runbook.authorityPolicy.sourceOfTruthSwitchRequiresOwnerApproval === true, "Source-of-truth switch must be Owner-gated");

const prereq = Object.fromEntries(runbook.executionPrerequisites.map((item) => [item.id, item]));
for (const id of [
  "M8_7_PRODUCTION_LIKE_UAT",
  "M8_8_FINAL_GO_NO_GO",
  "OWNER_PRODUCTION_PROVISIONING_APPROVAL",
  "PRODUCTION_LANDING_ZONE",
  "SERVER_SIDE_MODULE_ROUTING_PLANE",
  "MODULE_WRITE_FREEZE_CONTROL",
  "ROUTING_CONTRACT_FULL_MODULE_COVERAGE",
]) {
  assert(prereq[id]?.blockingForExecution === true, id + " must block execution until satisfied");
}
assert(prereq.M8_4_IMMUTABLE_RELEASE.status === "PASS", "M8.4 prerequisite must remain PASS");
assert(prereq.M8_5_OBSERVABILITY_ROLLBACK.status === "PASS", "M8.5 prerequisite must remain PASS");

assert(runbook.routingGap.runtimeBehavior === "CKACE_MODULE_ROUTING_CURRENTLY_ACCEPTS_LEGACY_ONLY", "Routing runtime gap must be explicit");
for (const surface of ["BENEFITS", "REQUEST_STATUS", "ATTACHMENTS", "ONBOARDING"]) {
  assert(runbook.routingGap.unrepresentedM7Surfaces.includes(surface), surface + " route coverage gap must be explicit");
}

const phaseIds = runbook.cutoverPhases.map((phase) => phase.id);
assert(JSON.stringify(phaseIds) === JSON.stringify([
  "P0_FREEZE_RUNBOOK",
  "P1_PROVISION_PROJECT_B_PRODUCTION",
  "P2_ESTABLISH_DOMAIN_BEFORE_LINE_SWITCH",
  "P3_CONTROLLED_MODULE_CUTOVERS_M9",
  "P4_DIRECT_PROJECT_B_LIFF_ENTRY",
  "P5_STABILIZE_AND_DEFER_GAS_RETIREMENT",
]), "Cutover phase order drift");

const linePhase = runbook.cutoverPhases.find((phase) => phase.id === "P4_DIRECT_PROJECT_B_LIFF_ENTRY");
assert(linePhase.preconditions.includes("REQUIRED_USER_VISIBLE_MODULES_ARE_NEW_AND_STABLE"), "LINE endpoint switch is too early");
assert(linePhase.actions.includes("DO_NOT_RECREATE_RICH_MENUS_IF_ALIASES_AND_LIFF_URI_TARGETS_ARE_UNCHANGED"), "Rich Menu preservation rule missing");

assert(runbook.dnsLineRollback.line.rollbackEndpoint === current.line.currentEndpoint, "LINE rollback endpoint must restore current legacy endpoint");
assert(runbook.targetState.gasRetirementPhase === "M11", "GAS retirement must stay M11");

const serialized = JSON.stringify(runbook);
assert(!serialized.includes("LINE_CHANNEL_SECRET"), "LINE secret name/value must not leak into runbook");
assert(!serialized.includes("LINE_CHANNEL_ACCESS_TOKEN"), "LINE token must not leak into runbook");
assert(!serialized.includes("GATEWAY_SHARED_SECRET"), "Gateway secret must not leak into runbook");
assert(!serialized.includes("script.google.com/macros/s/"), "GAS deployment URL must not be embedded in M8.6 runbook");

console.log(
  "M8_CUTOVER_RUNBOOK_VERIFY_PASS " +
    "release=" + runbook.releaseAnchor.releaseId +
    " legacy=" + current.legacyProduction.revision +
    " phases=" + runbook.cutoverPhases.length +
    " owner_gates=" + runbook.ownerGates.length +
    " production_mutation=0"
);
