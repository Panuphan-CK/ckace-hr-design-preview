import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(here, "observability-rollback-manifest.json"), "utf8"));

if (manifest.productionMutationAuthorized !== false) throw new Error("Production mutation unexpectedly authorized");
if (manifest.productionGates.rollbackMutationOwnerApprovalRequired !== true) throw new Error("Owner rollback gate missing");

const plan = {
  mode: "PLAN_ONLY_NON_EXECUTABLE",
  productionMutationExecuted: false,
  ownerApprovalRequired: true,
  releaseAnchor: manifest.releaseAnchor,
  preTrafficGates: [
    "VERIFY_RELEASE_MANIFEST_AND_DIGESTS",
    "VERIFY_REVISION_READY",
    "VERIFY_DATABASE_AND_R2_BACKUP_EVIDENCE",
    "VERIFY_HEALTH_AND_READINESS",
    "VERIFY_ABORT_MONITORING_ACTIVE",
  ],
  rollbackTriggers: manifest.abortConditions,
  rollbackSequence: [
    "OWNER_APPROVES_PRODUCTION_ROLLBACK",
    "ROUTE_API_AND_WEB_TO_LAST_KNOWN_GOOD_IMMUTABLE_REVISIONS",
    "VERIFY_HEALTH_READINESS_AND_AUTH",
    "IF_DATA_ROLLBACK_REQUIRED_STOP_PROJECT_B_WRITES",
    ...manifest.backupRecovery.coordinatedRestoreOrder,
    "RUN_CORE_HR_UAT_AND_RECONCILIATION",
    "OWNER_APPROVES_TRAFFIC_RESUME",
  ],
  unresolvedProductionRequirements: [
    "PRODUCTION_ALERT_POLICIES_NOT_PROVISIONED",
    "PRODUCTION_DATABASE_BACKUP_RESOURCE_NOT_PROVISIONED",
    "PRODUCTION_R2_INDEPENDENT_BACKUP_NOT_PROVISIONED",
    "PRODUCTION_RUNTIME_NOT_DEPLOYED",
  ],
};

console.log(JSON.stringify(plan, null, 2));
