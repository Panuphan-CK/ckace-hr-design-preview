import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const release = JSON.parse(
  readFileSync(path.join(here, "m10d1-release-manifest.json"), "utf8"),
);
const readiness = JSON.parse(
  readFileSync(path.join(here, "m10d1-desktop-readiness-status.json"), "utf8"),
);
const m9 = JSON.parse(
  readFileSync(path.join(here, "m9-release-manifest.json"), "utf8"),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha(relative) {
  return createHash("sha256")
    .update(readFileSync(path.join(root, relative)))
    .digest("hex");
}

function collect(target) {
  const stat = statSync(target);
  if (!stat.isDirectory()) return [target];
  return readdirSync(target)
    .sort()
    .flatMap((name) => collect(path.join(target, name)));
}

function artifactInput() {
  const files = [
    ...["package.json", "package-lock.json", "tsconfig.base.json"].map((file) =>
      path.join(root, file),
    ),
    ...["apps", "packages"].flatMap((dir) => collect(path.join(root, dir))),
  ]
    .filter(
      (file) =>
        !file.includes(path.sep + "dist" + path.sep) &&
        !file.includes(path.sep + ".next" + path.sep) &&
        !file.includes(path.sep + "node_modules" + path.sep),
    )
    .sort();

  const entries = files.map(
    (file) =>
      path.relative(root, file).replaceAll("\\", "/") +
      "\0" +
      createHash("sha256").update(readFileSync(file)).digest("hex"),
  );

  return {
    fileCount: files.length,
    sha256: createHash("sha256").update(entries.join("\n")).digest("hex"),
  };
}

function migrationEvidence() {
  const dir = path.join(root, "packages", "database", "prisma", "migrations");
  const migrations = readdirSync(dir)
    .filter((name) => statSync(path.join(dir, name)).isDirectory())
    .sort();
  const entries = migrations.map(
    (name) =>
      name +
      "\0" +
      createHash("sha256")
        .update(readFileSync(path.join(dir, name, "migration.sql")))
        .digest("hex"),
  );
  return {
    migrations,
    sha256: createHash("sha256").update(entries.join("\n")).digest("hex"),
  };
}

assert(release.schemaVersion === "m10d1-release-v1", "release schema drift");
assert(
  release.mode === "NON_PRODUCTION_RELEASE_CANDIDATE_BUILD_ONLY",
  "release mode drift",
);
assert(release.productionMutationAuthorized === false, "release must not authorize Production mutation");
assert(release.productionDeployAuthorized === false, "release must not authorize Production deploy");

const input = artifactInput();
assert(input.fileCount === release.source.artifactInputFileCount, "artifact input count drift");
assert(input.sha256 === release.source.artifactInputSha256, "artifact input digest drift");
assert(sha("package-lock.json") === release.source.packageLockSha256, "package-lock digest drift");

const migration = migrationEvidence();
assert(
  JSON.stringify(migration.migrations) === JSON.stringify(release.schema.migrations),
  "migration list drift",
);
assert(migration.migrations.length === release.schema.migrationCount, "migration count drift");
assert(migration.sha256 === release.schema.migrationSetSha256, "migration set digest drift");
assert(
  sha("packages/database/prisma/schema.prisma") === release.schema.prismaSchemaSha256,
  "Prisma schema digest drift",
);
assert(release.schema.changedSinceM9_5 === false, "Desktop phase must not claim schema drift");
assert(
  release.schema.prismaSchemaSha256 === m9.schema.prismaSchemaSha256,
  "Prisma schema changed since M9.5",
);
assert(
  release.schema.migrationSetSha256 === m9.schema.migrationSetSha256,
  "migration set changed since M9.5",
);
assert(
  release.source.artifactInputSha256 !== m9.source.artifactInputSha256,
  "fresh Desktop release source must differ from M9.5",
);

for (const [name, artifact] of Object.entries(release.artifacts)) {
  assert(artifact.buildStatus === "SUCCESS", name + " build not SUCCESS");
  assert(artifact.registryDigestVerified === true, name + " registry digest not verified");
  assert(/^sha256:[0-9a-f]{64}$/.test(artifact.digest), name + " digest invalid");
  assert(
    artifact.immutableRef.endsWith("@" + artifact.digest),
    name + " immutable ref mismatch",
  );
  assert(!artifact.immutableRef.includes(":m10d1-rc-"), name + " immutable authority must not use tag");
  assert(sha(artifact.dockerfile) === artifact.dockerfileSha256, name + " Dockerfile drift");
  assert(
    sha(artifact.cloudBuildConfig) === artifact.cloudBuildConfigSha256,
    name + " Cloud Build config drift",
  );
}

assert(release.deploymentPolicy.imageAuthority === "IMMUTABLE_DIGEST_ONLY", "image authority drift");
assert(
  release.deploymentPolicy.apiImage === release.artifacts.api.immutableRef,
  "API deployment authority mismatch",
);
assert(
  release.deploymentPolicy.webImage === release.artifacts.web.immutableRef,
  "Web deployment authority mismatch",
);
assert(release.deploymentPolicy.tagOnlyDeployForbidden === true, "tag-only deploy must remain forbidden");
assert(release.deploymentPolicy.sourceTreeDeployForbidden === true, "source-tree deploy must remain forbidden");
assert(release.deploymentPolicy.productionDeployAuthorized === false, "Production deploy must remain unauthorized");
assert(
  release.deploymentPolicy.ownerApprovalRequiredBeforeProductionDeploy === true,
  "Owner Production deploy gate missing",
);
assert(release.productionTarget.moduleRouting === "LEGACY", "Production routing target must remain LEGACY");
assert(sha("firebase.prod.json") === release.productionTarget.firebaseProdSha256, "Firebase Production config drift");

assert(readiness.schemaVersion === "m10d1-v1", "readiness schema drift");
assert(readiness.mode === "READINESS_ONLY_NO_PRODUCTION_DEPLOY", "readiness mode drift");
assert(readiness.productionMutationAuthorized === false, "readiness must not authorize Production mutation");
assert(readiness.productionDeployAuthorized === false, "readiness must not authorize Production deploy");
assert(readiness.productionAuthoritySwitchAuthorized === false, "authority switch must remain unauthorized");
assert(
  readiness.decision === "NO_GO_PRODUCTION_DESKTOP_DEPLOY_OR_CUTOVER",
  "M10D.1 decision must remain NO-GO",
);
assert(readiness.liveProductionRuntime.sourceOfTruth === "LEGACY", "source of truth drift");
assert(readiness.liveProductionRuntime.moduleRouting === "LEGACY", "module routing drift");
assert(readiness.liveProductionRuntime.api.desktopSessionSecretBound === false, "Desktop session secret must not be claimed bound");
assert(readiness.liveProductionRuntime.firebase.healthStatus === 200, "Production health evidence missing");
assert(readiness.liveProductionRuntime.firebase.readinessStatus === 200, "Production readiness evidence missing");
assert(readiness.liveProductionRuntime.firebase.signedOutSessionStatus === 401, "signed-out auth guard drift");
assert(readiness.liveProductionRuntime.firebase.loginRouteStatus === 404, "historical Production Web unexpectedly exposes /login");
assert(readiness.liveProductionRuntime.firebase.desktopRouteStatus === 404, "historical Production Web unexpectedly exposes /desktop");
assert(readiness.liveProductionRuntime.monitoring.alertPoliciesVerified === 7, "expected seven Production alert policies");
assert(readiness.liveProductionRuntime.monitoring.uptimeChecksVerified === 4, "expected four Production uptime checks");

assert(readiness.liveProductionDatabase.applicationTables === 41, "live Production table count evidence drift");
assert(readiness.liveProductionDatabase.prismaMigrationTablePresent === false, "Production migration-history claim drift");
assert(readiness.liveProductionDatabase.counts.userAccounts === 25, "Production account count evidence drift");
assert(readiness.liveProductionDatabase.counts.modernPasswordHashes === 0, "Production modern password readiness claim drift");
assert(readiness.liveProductionDatabase.counts.legacyPasswordHashes === 0, "Production legacy password readiness claim drift");
assert(readiness.liveProductionDatabase.counts.permissions === 0, "Production permission seed readiness claim drift");
assert(readiness.liveProductionDatabase.counts.rolePermissions === 0, "Production role-permission readiness claim drift");
assert(readiness.liveProductionDatabase.migrationRun.importedCount === 654, "Production migration imported-count evidence drift");
assert(readiness.liveProductionDatabase.migrationRun.mismatchCount === 86, "Production migration mismatch-count evidence drift");
assert(
  readiness.liveProductionDatabase.counts.migrationReconciliationResults === 0,
  "Production reconciliation-result evidence drift",
);
assert(readiness.liveProductionDatabase.historicalDrift.liveStateOverridesHistoricalManifest === true, "historical/live drift must stay explicit");

assert(readiness.freshDesktopRelease.releaseId === release.releaseId, "readiness/release ID mismatch");
assert(readiness.freshDesktopRelease.sourceSha256 === release.source.artifactInputSha256, "readiness source digest mismatch");
assert(readiness.freshDesktopRelease.apiDigest === release.artifacts.api.digest, "readiness API digest mismatch");
assert(readiness.freshDesktopRelease.webDigest === release.artifacts.web.digest, "readiness Web digest mismatch");
assert(readiness.freshDesktopRelease.productionDeployed === false, "M10D.1 must not claim Production deployment");

const blockerIds = new Set(readiness.blockers.map((item) => item.id));
for (const id of [
  "LIVE_PRODUCTION_DATA_STATE_DRIFT_REQUIRES_RECONCILIATION_EVIDENCE",
  "PRODUCTION_SCHEMA_PROVENANCE_NOT_TRACKED_BY_PRISMA_MIGRATIONS",
  "PRODUCTION_DESKTOP_AUTH_CREDENTIAL_STATE_NOT_READY",
  "PRODUCTION_DESKTOP_RBAC_NOT_READY",
  "PRODUCTION_DESKTOP_SESSION_SECRET_NOT_BOUND",
  "CURRENT_PRODUCTION_IMAGES_PRE_M9D_DESKTOP",
  "PRODUCTION_CUSTOM_DOMAIN_NOT_ACTIVE",
]) {
  assert(blockerIds.has(id), id + " blocker missing");
}

assert(
  readiness.requiredNextAction.phase === "M10D.2_PRODUCTION_IDENTITY_RBAC_DATA_RECONCILIATION",
  "next phase drift",
);
assert(readiness.requiredNextAction.ownerApprovalRequired === true, "M10D.2 Owner gate missing");

for (const value of Object.values(readiness.safety)) {
  if (typeof value === "boolean") assert(value === false, "M10D.1 Production mutation safety flag drift");
}
assert(readiness.safety.sourceOfTruth === "LEGACY", "M10D.1 source-of-truth safety drift");

const serialized = JSON.stringify({ release, readiness });
for (const forbidden of [
  "postgresql://",
  "postgres://",
  "BEGIN PRIVATE KEY",
  "R2_SECRET_ACCESS_KEY=",
  "CKACE_DESKTOP_SESSION_SECRET=",
]) {
  assert(!serialized.includes(forbidden), "M10D.1 evidence leaked secret material: " + forbidden);
}

console.log(
  [
    "M10D1_DESKTOP_READINESS_VERIFY_PASS",
    "decision=NO_GO",
    "source=" + release.source.artifactInputSha256,
    "api=" + release.artifacts.api.digest,
    "web=" + release.artifacts.web.digest,
    "tests=400",
    "prod_tables=41",
    "prod_accounts=25",
    "prod_permissions=0",
    "prod_password_hashes=0",
    "migration_mismatches=86",
    "production_mutation=0",
  ].join(" "),
);
