import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const release = JSON.parse(readFileSync(path.join(here, "m10d2-release-manifest.json"), "utf8"));
const status = JSON.parse(readFileSync(path.join(here, "m10d2-production-staging-status.json"), "utf8"));
const rbac = JSON.parse(readFileSync(path.join(here, "m10d2-rbac-manifest.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function collect(target) {
  const stat = statSync(target);
  if (!stat.isDirectory()) return [target];
  return readdirSync(target).sort().flatMap((name) => collect(path.join(target, name)));
}

const files = [
  ...["package.json", "package-lock.json", "tsconfig.base.json"].map((file) => path.join(root, file)),
  ...["apps", "packages"].flatMap((dir) => collect(path.join(root, dir))),
]
  .filter((file) =>
    !file.includes(path.sep + "dist" + path.sep) &&
    !file.includes(path.sep + ".next" + path.sep) &&
    !file.includes(path.sep + "node_modules" + path.sep),
  )
  .sort();

const entries = files.map((file) =>
  path.relative(root, file).replaceAll("\\", "/") +
  "\0" +
  createHash("sha256").update(readFileSync(file)).digest("hex"),
);
const sourceSha = createHash("sha256").update(entries.join("\n")).digest("hex");

assert(release.schemaVersion === "m10d2-release-v1", "release schema drift");
assert(status.schemaVersion === "m10d2-v1", "status schema drift");
assert(release.source.artifactInputFileCount === files.length, "source file count drift");
assert(release.source.artifactInputSha256 === sourceSha, "source digest drift");
assert(release.qa.targetedCredentialActivation.status === "PASS", "credential activation targeted QA missing");
assert(release.qa.targetedCredentialActivation.tests === 8, "credential activation test count drift");
assert(release.qa.fullRepository.lint === "PASS", "lint gate missing");
assert(release.qa.fullRepository.typecheck === "PASS", "typecheck gate missing");
assert(release.qa.fullRepository.testFiles === 67, "test file count drift");
assert(release.qa.fullRepository.tests === 402, "test count drift");
assert(release.qa.fullRepository.build === "PASS", "build gate missing");

for (const [name, artifact] of Object.entries(release.artifacts)) {
  assert(artifact.buildStatus === "SUCCESS", name + " build not SUCCESS");
  assert(artifact.registryDigestVerified === true, name + " registry digest not verified");
  assert(/^sha256:[0-9a-f]{64}$/.test(artifact.digest), name + " digest invalid");
  assert(artifact.immutableRef.endsWith("@" + artifact.digest), name + " immutable ref mismatch");
}

assert(status.decision === "PASS_WITH_EXPLICIT_IDENTITY_EXCEPTION", "M10D.2 decision drift");
assert(status.sourceOfTruth === "LEGACY", "source-of-truth drift");
assert(status.productionTrafficSwitchAuthorized === false, "traffic switch must remain unauthorized");
assert(status.productionAuthoritySwitchAuthorized === false, "authority switch must remain unauthorized");

assert(status.reconciliation.passRows === 11, "reconciliation PASS count drift");
assert(status.reconciliation.exceptionRows === 1, "reconciliation EXCEPTION count drift");
assert(status.reconciliation.historicalMismatchCount === 86, "historical mismatch count drift");
assert(status.reconciliation.rowLevelMismatchDetailFabricated === false, "fabricated mismatch detail prohibited");
assert(status.schemaBaseline.productionSchemaMutation === false, "schema mutation must remain false");
assert(status.schemaBaseline.schemaDiffFromProduction === "NONE", "schema baseline diff drift");

assert(status.rbac.permissionCatalog === 42, "permission catalog drift");
for (const [role, count] of Object.entries({EMPLOYEE:20,SUPERUSER:27,ADMIN:38,SUPERADMIN:38})) {
  assert(status.rbac.grants[role] === count, role + " grant count drift");
  assert(rbac.counts[role] === count, role + " RBAC manifest mismatch");
}
assert(rbac.counts.catalog === 42, "RBAC permission catalog mismatch");
assert(status.rbac.roleNameAloneIsAuthority === false, "role name must not be authority");
assert(status.rbac.explicitPermissionRequired === true, "explicit permission requirement missing");

assert(status.credentialBootstrap.strategy === "ONE_TIME_VERIFIED_EXISTING_LINE_IDENTITY", "credential strategy drift");
assert(status.credentialBootstrap.activeAccounts === 20, "active account count drift");
assert(status.credentialBootstrap.activeLineLinkedEligible === 19, "eligible activation count drift");
assert(status.credentialBootstrap.activeUnlinkedException === 1, "identity exception count drift");
assert(status.credentialBootstrap.realEmployeeModernPasswordHashesAfterM10D2 === 0, "admin-populated password hash claim drift");
assert(status.credentialBootstrap.adminAssignedPasswords === false, "admin password assignment prohibited");

assert(status.sessionSecret.enabledVersions === 1, "session secret version evidence drift");
assert(status.sessionSecret.boundOnCandidateApi === true, "candidate secret binding missing");
assert(status.sessionSecret.secretValueExposed === false, "secret exposure claim drift");

assert(status.staging.baselineTraffic.apiPercent === 100, "baseline API traffic drift");
assert(status.staging.baselineTraffic.webPercent === 100, "baseline Web traffic drift");
assert(status.staging.candidate.apiPercent === 0, "candidate API must remain 0%");
assert(status.staging.candidate.webPercent === 0, "candidate Web must remain 0%");
assert(status.staging.candidate.apiDigest === release.artifacts.api.digest, "candidate API digest mismatch");
assert(status.staging.candidate.webDigest === release.artifacts.web.digest, "candidate Web digest mismatch");
assert(status.staging.apiSmoke.health === 200, "candidate API health evidence missing");
assert(status.staging.apiSmoke.ready === 200, "candidate API readiness evidence missing");
assert(status.staging.apiSmoke.signedOutSession === 401, "candidate API auth guard drift");
assert(Object.values(status.staging.webSmoke).every((value) => value === 200), "candidate Web route smoke failed");

assert(status.productionUat.status === "PASS", "Production UAT missing");
assert(status.productionUat.apiDigest === release.artifacts.api.digest, "UAT image digest mismatch");
assert(status.productionUat.login === 200, "UAT login failed");
assert(status.productionUat.session === 200, "UAT session failed");
assert(status.productionUat.profile === 200, "UAT profile failed");
assert(status.productionUat.criticalReads === 16, "UAT critical read count drift");
assert(status.productionUat.forgedIdentityHeadersIgnored === true, "forged identity protection missing");
assert(status.productionUat.clientRoleAuthority === false, "client role authority regression");
assert(status.productionUat.logout === 200, "UAT logout failed");
assert(status.productionUat.syntheticCleanup.employees === 0, "synthetic employee cleanup failed");
assert(status.productionUat.syntheticCleanup.roles === 0, "synthetic role cleanup failed");
assert(status.productionUat.syntheticCleanup.benefitPolicies === 0, "synthetic benefit policy cleanup failed");

assert(status.safety.productionTrafficChanged === false, "Production traffic changed");
assert(status.safety.productionAuthorityChanged === false, "Production authority changed");
assert(status.safety.sourceOfTruth === "LEGACY", "safety source-of-truth drift");
assert(status.safety.dnsChanged === false, "DNS changed");
assert(status.safety.lineConfigurationChanged === false, "LINE changed");
assert(status.safety.gasChanged === false, "GAS changed");
assert(status.safety.realEmployeePasswordAssignedByAdmin === false, "real employee password assigned by admin");
assert(status.safety.syntheticDataCleanupVerified === true, "synthetic cleanup evidence missing");

const serialized = JSON.stringify({ release, status, rbac });
for (const forbidden of ["postgresql://","postgres://","BEGIN PRIVATE KEY","CKACE_DESKTOP_SESSION_SECRET=","R2_SECRET_ACCESS_KEY="]) {
  assert(!serialized.includes(forbidden), "evidence leaked secret material: " + forbidden);
}

console.log([
  "M10D2_PRODUCTION_STAGING_VERIFY_PASS",
  "decision=PASS_WITH_EXPLICIT_IDENTITY_EXCEPTION",
  "source=" + sourceSha,
  "api=" + release.artifacts.api.digest,
  "web=" + release.artifacts.web.digest,
  "tests=402",
  "reconciliation=11_PASS_1_EXCEPTION",
  "rbac=42",
  "active_line_eligible=19",
  "active_identity_exception=1",
  "candidate_traffic=0",
  "baseline_traffic=100",
  "uat=PASS",
  "source_of_truth=LEGACY"
].join(" "));
