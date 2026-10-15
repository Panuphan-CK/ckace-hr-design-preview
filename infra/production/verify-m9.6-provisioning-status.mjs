import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const s = JSON.parse(readFileSync(path.join(here, "m9.6-provisioning-status.json"), "utf8"));
const release = JSON.parse(readFileSync(path.join(here, "m9-release-manifest.json"), "utf8"));

function a(condition, message) {
  if (!condition) throw new Error(message);
}

a(s.schemaVersion === "m9.6-v1", "schema drift");
a(s.ownerApproval.recorded === true, "Owner approval missing");
a(s.release.releaseId === release.releaseId, "release id drift");
a(s.release.apiImmutableRef === release.artifacts.api.immutableRef, "API immutable ref drift");
a(s.release.webImmutableRef === release.artifacts.web.immutableRef, "Web immutable ref drift");

const p1 = s.phases.P1_IDENTITY_AND_SECRET_CONTAINERS;
a(p1.status === "PASS", "P1 not PASS");
a(p1.runtimeServiceAccount.created === true, "runtime SA missing");
a(p1.runtimeServiceAccount.projectWideRolesAdded.length === 0, "project-wide runtime IAM forbidden");
a(p1.secretContainers.length === 4, "expected four secret containers");
a(p1.iam.role === "roles/secretmanager.secretAccessor", "secret role drift");
a(p1.iam.scope === "EACH_SECRET_ONLY", "secret IAM must remain per-secret");

const p2 = s.phases.P2_DATABASE_AND_PRIVATE_OBJECT_STORAGE;
a(p2.status === "PASS", "P2 not PASS");
a(p2.neon.devReuseAllowed === false, "DEV Neon reuse must stay forbidden");
a(p2.neon.productionDatabaseCreated === true, "Production Neon missing");
a(p2.neon.applicationTablesAtClose === 0, "M9.6 must not import/migrate business schema/data");
a(p2.neon.productionBusinessDataImported === false, "Production business data import forbidden in M9.6");
a(p2.neon.restoreProof.status === "PASS", "Neon restore proof missing");
a(p2.neon.restoreProof.productionBranchUnchanged === true, "Neon production branch must remain unchanged by restore proof");
a(p2.r2.bucketsCreated === true, "Production R2 buckets missing");
a(p2.r2.publicAccessEnabled === false, "Production R2 must stay private");
a(p2.r2.runtimeCredential.backupBucketExcluded === true, "runtime token must not access backup bucket");
a(p2.r2.recoveryProof.status === "PASS", "R2 recovery proof missing");
a(p2.r2.recoveryProof.finalPrimaryBackupHashMatch === true, "R2 recovery hash mismatch");
a(p2.r2.temporaryRecoveryTokensRevoked === true, "temporary R2 proof tokens must be revoked");
a(p2.productionSecretVersionsStored === true, "Production secret versions missing");
a(p2.productionSecretVersionsEnabled === 4, "expected four enabled Production secret versions");

const p4 = s.phases.P4_CLOUD_RUN_AND_FIREBASE;
a(p4.status === "PASS", "P4 not PASS");
a(p4.servicesCreated === true, "Production Cloud Run services missing");
a(p4.api.immutableRef === release.artifacts.api.immutableRef, "API deployed digest drift");
a(p4.web.immutableRef === release.artifacts.web.immutableRef, "Web deployed digest drift");
a(p4.healthStatus === 200, "health failed");
a(p4.readinessStatus === 200, "readiness failed");
a(p4.webStatus === 200, "web failed");
a(p4.signedOutProfileStatus === 401, "auth guard regression");
a(p4.readinessDatabase === "connected", "Production DB readiness failed");
a(p4.moduleRouting === "LEGACY", "Production routing drift");

const p5 = s.phases.P5_OBSERVABILITY_AND_RECOVERY;
a(p5.status === "PASS", "P5 not PASS");
a(p5.uptimeChecks.length === 4, "expected four uptime checks");
a(p5.alertPoliciesCreated === 7, "expected seven alert policies");
a(p5.cloudRunErrorLogEntriesAtFinalCheck === 0, "Production staging has ERROR logs");
a(p5.neonRecoveryProof === "PASS", "Neon recovery proof drift");
a(p5.r2RecoveryProof === "PASS", "R2 recovery proof drift");

const p6 = s.phases.P6_DOMAIN_STAGING;
a(p6.status === "PASS_HELD_SEPARATE_OWNER_GATE", "P6 hold state drift");
a(p6.dnsState === "NXDOMAIN", "DNS state drift");
a(p6.dnsChanged === false && p6.customDomainChanged === false, "DNS/custom-domain must remain unchanged");

a(s.finalVerification.fullRepositoryTaskId === "56dd6aa8-cac8-4f67-a171-83a418ba69ff", "final QA task drift");
a(s.finalVerification.testFilesPassed === 54 && s.finalVerification.testsPassed === 353, "test count drift");
a(s.finalVerification.lint === "PASS" && s.finalVerification.typecheck === "PASS" && s.finalVerification.build === "PASS", "repository QA failed");
a(s.finalVerification.cloudRunErrorLogEntries === 0, "error-log gate failed");

for (const key of ["productionBusinessDataImported", "lineChanged", "gasChanged", "dnsChanged", "moduleAuthorityChanged"]) {
  a(s.safety[key] === false, key + " must remain false");
}
a(s.safety.sourceOfTruth === "LEGACY", "source-of-truth drift");
a(s.safety.moduleRouting === "LEGACY", "module-routing drift");
a(s.currentDecision === "PASS_CLOSED_PROVISIONED_AND_STAGED_NO_CUTOVER", "final decision drift");

console.log(
  "M9_6_PROVISIONING_STATUS_VERIFY_PASS p1=PASS p2=PASS p4=PASS p5=PASS p6=HELD_BY_GATE qa=PASS routing=LEGACY source=LEGACY cutover=0",
);
