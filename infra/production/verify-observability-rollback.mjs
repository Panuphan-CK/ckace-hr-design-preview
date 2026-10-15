import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const release = JSON.parse(readFileSync(path.join(here, "release-manifest.json"), "utf8"));
const manifest = JSON.parse(readFileSync(path.join(here, "observability-rollback-manifest.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function verify(input) {
  assert(input.mode === "READINESS_ONLY", "M8.5 must be readiness-only");
  assert(input.productionMutationAuthorized === false, "M8.5 cannot authorize Production mutation");

  assert(input.releaseAnchor.releaseId === release.releaseId, "Release ID drift");
  assert(input.releaseAnchor.apiImage === release.artifacts.api.immutableRef, "API release anchor drift");
  assert(input.releaseAnchor.webImage === release.artifacts.web.immutableRef, "Web release anchor drift");
  assert(input.releaseAnchor.sourceSha256 === release.source.artifactInputSha256, "Source fingerprint drift");
  assert(input.releaseAnchor.migrationSetSha256 === release.schema.migrationSetSha256, "Migration fingerprint drift");

  for (const artifact of [input.releaseAnchor.apiImage, input.releaseAnchor.webImage]) {
    assert(/@sha256:[0-9a-f]{64}$/.test(artifact), "Release anchor must be immutable digest");
  }

  assert(input.observability.health.testStatus === 200, "Health evidence missing");
  assert(input.observability.readiness.testStatus === 200, "Readiness evidence missing");
  assert(input.observability.platformLogs.testEvidence === true, "Request log evidence missing");
  assert(input.observability.alerts.length >= 5, "Observability alert contract is incomplete");
  assert(input.observability.productionPoliciesProvisioned === false, "M8.5 must not claim Production alert provisioning");

  for (const component of [input.rollbackRehearsal.api, input.rollbackRehearsal.web]) {
    assert(component.private === true, "Rollback rehearsal service must remain private");
    assert(component.service.endsWith("-rollback-rehearsal-test"), "Rollback rehearsal must be isolated TEST");
    assert(component.result === "PASS", "Rollback rehearsal component not PASS");
    assert(component.candidateReady === true, "Release candidate revision is not Ready");
    assert(component.forwardTrafficPercent === 100, "Candidate traffic rehearsal incomplete");
    assert(component.rollbackTrafficPercent === 100, "Rollback traffic rehearsal incomplete");
    assert(component.finalRevision === component.baselineRevision, "Rehearsal did not finish on baseline");
    assert(/@sha256:[0-9a-f]{64}$/.test(component.candidateImage), "Candidate image must be immutable");
  }

  assert(input.backupRecovery.database.result === "PASS", "Database recovery evidence missing");
  assert(input.backupRecovery.database.snapshotMatch === true, "Database snapshot match missing");
  assert(input.backupRecovery.database.recoveredMatch === true, "Database recovery match missing");

  const r2 = input.backupRecovery.objectStorage;
  assert(r2.result === "PASS", "R2 recovery evidence missing");
  assert(r2.backupMatch && r2.mutationDetected && r2.restoreMatch, "R2 restore proof incomplete");
  assert(r2.sameFaultDomainRehearsal === true, "R2 rehearsal fault-domain disclosure missing");
  assert(r2.productionRequirement.independentPrivateBackupRequired === true, "Production R2 independent backup must be mandatory");
  assert(r2.productionRequirement.provisioned === false, "M8.5 must not claim Production backup provisioning");
  assert(r2.productionRequirement.ownerApprovalRequired === true, "Production backup provisioning must be Owner-gated");

  assert(input.productionGates.rollbackMutationOwnerApprovalRequired === true, "Production rollback Owner gate missing");
  assert(input.productionGates.routingRemains === "LEGACY", "Routing must remain LEGACY");
  assert(input.evidenceResidue.destructiveCleanupPerformed === false, "M8.5 must not claim destructive cleanup");

  const serialized = JSON.stringify(input);
  assert(!serialized.includes("postgresql://"), "Database credential leaked");
  assert(!serialized.includes("R2_SECRET_ACCESS_KEY="), "R2 secret leaked");

  return {
    releaseId: input.releaseAnchor.releaseId,
    apiRollback: input.rollbackRehearsal.api.result,
    webRollback: input.rollbackRehearsal.web.result,
    databaseRecovery: input.backupRecovery.database.result,
    r2Recovery: input.backupRecovery.objectStorage.result,
    alerts: input.observability.alerts.length,
  };
}

const result = verify(manifest);

if (process.argv.includes("--self-test")) {
  const invalid = structuredClone(manifest);
  invalid.rollbackRehearsal.api.candidateImage = invalid.releaseAnchor.apiImage.replace("@sha256:", ":tag-");
  let rejected = false;
  try {
    verify(invalid);
  } catch {
    rejected = true;
  }
  assert(rejected, "Negative self-test failed to reject mutable rollback candidate");
}

console.log(
  [
    "M8_OBSERVABILITY_ROLLBACK_VERIFY_PASS",
    `release=${result.releaseId}`,
    `api_rollback=${result.apiRollback}`,
    `web_rollback=${result.webRollback}`,
    `db_recovery=${result.databaseRecovery}`,
    `r2_recovery=${result.r2Recovery}`,
    `alerts=${result.alerts}`,
  ].join(" "),
);
