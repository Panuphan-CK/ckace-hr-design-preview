import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const manifestPath = path.join(here, "release-manifest.json");

function sha256File(relativePath) {
  return createHash("sha256")
    .update(readFileSync(path.join(root, relativePath)))
    .digest("hex");
}

function collectFiles(target) {
  const stat = statSync(target);
  if (!stat.isDirectory()) return [target];

  return readdirSync(target)
    .sort()
    .flatMap((name) => collectFiles(path.join(target, name)));
}

function artifactInput() {
  const rootFiles = ["package.json", "package-lock.json", "tsconfig.base.json"];
  const files = [
    ...rootFiles.map((file) => path.join(root, file)),
    ...["apps", "packages"].flatMap((dir) => collectFiles(path.join(root, dir))),
  ]
    .filter(
      (file) =>
        !file.includes(path.sep + "dist" + path.sep) &&
        !file.includes(path.sep + ".next" + path.sep) &&
        !file.includes(path.sep + "node_modules" + path.sep),
    )
    .sort();

  const entries = files.map((file) => {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    const hash = createHash("sha256").update(readFileSync(file)).digest("hex");
    return relative + "\0" + hash;
  });

  return {
    fileCount: files.length,
    sha256: createHash("sha256").update(entries.join("\n")).digest("hex"),
  };
}

function migrationEvidence() {
  const migrationsDir = path.join(root, "packages", "database", "prisma", "migrations");
  const migrations = readdirSync(migrationsDir)
    .filter((name) => statSync(path.join(migrationsDir, name)).isDirectory())
    .sort();

  const entries = migrations.map((name) => {
    const sql = readFileSync(path.join(migrationsDir, name, "migration.sql"));
    const hash = createHash("sha256").update(sql).digest("hex");
    return name + "\0" + hash;
  });

  return {
    migrations,
    sha256: createHash("sha256").update(entries.join("\n")).digest("hex"),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function verifyManifest(manifest) {
  assert(manifest.mode === "READINESS_ONLY", "Manifest must be readiness-only");
  assert(
    manifest.productionMutationAuthorized === false,
    "Manifest must not authorize Production mutation",
  );

  const input = artifactInput();
  assert(
    input.fileCount === manifest.source.artifactInputFileCount,
    "Artifact input file count drift",
  );
  assert(
    input.sha256 === manifest.source.artifactInputSha256,
    "Artifact source digest drift",
  );
  assert(
    sha256File("package-lock.json") === manifest.source.packageLockSha256,
    "package-lock digest drift",
  );

  const migration = migrationEvidence();
  assert(
    JSON.stringify(migration.migrations) ===
      JSON.stringify(manifest.schema.migrations),
    "Migration list drift",
  );
  assert(
    migration.migrations.length === manifest.schema.migrationCount,
    "Migration count drift",
  );
  assert(
    migration.sha256 === manifest.schema.migrationSetSha256,
    "Migration set digest drift",
  );
  assert(
    sha256File("packages/database/prisma/schema.prisma") ===
      manifest.schema.prismaSchemaSha256,
    "Prisma schema digest drift",
  );

  for (const [name, artifact] of Object.entries(manifest.artifacts)) {
    assert(artifact.buildStatus === "SUCCESS", name + " build is not SUCCESS");
    assert(
      artifact.registryDigestVerified === true,
      name + " registry digest was not verified",
    );
    assert(
      artifact.digest.startsWith("sha256:") && artifact.digest.length === 71,
      name + " digest is invalid",
    );
    assert(
      artifact.immutableRef.endsWith("@" + artifact.digest),
      name + " immutable reference does not match digest",
    );
    assert(
      !artifact.immutableRef.includes(":m8-rc-"),
      name + " immutable reference must not use a tag",
    );
    assert(
      sha256File(artifact.dockerfile) === artifact.dockerfileSha256,
      name + " Dockerfile digest drift",
    );
    assert(
      sha256File(artifact.cloudBuildConfig) === artifact.cloudBuildConfigSha256,
      name + " Cloud Build config digest drift",
    );
  }

  assert(
    manifest.deploymentPolicy.imageAuthority === "IMMUTABLE_DIGEST_ONLY",
    "Deployment image authority must be immutable digest only",
  );
  assert(
    manifest.deploymentPolicy.apiImage === manifest.artifacts.api.immutableRef,
    "Deployment API image must equal pinned immutable API ref",
  );
  assert(
    manifest.deploymentPolicy.webImage === manifest.artifacts.web.immutableRef,
    "Deployment Web image must equal pinned immutable Web ref",
  );
  assert(
    manifest.deploymentPolicy.tagOnlyDeployForbidden === true &&
      manifest.deploymentPolicy.sourceTreeDeployForbidden === true &&
      manifest.deploymentPolicy.ownerApprovalRequired === true,
    "Deployment safety policy is incomplete",
  );

  assert(
    sha256File("firebase.prod.json") ===
      manifest.productionConfig.firebaseProdSha256,
    "Firebase Production config digest drift",
  );
  assert(
    sha256File("infra/production/readiness-manifest.json") ===
      manifest.productionConfig.readinessManifestSha256,
    "Production readiness manifest digest drift",
  );
  assert(
    manifest.productionConfig.moduleRouting === "LEGACY",
    "Release manifest must preserve LEGACY routing",
  );
  for (const [name, config] of Object.entries({
    R2_ACCOUNT_ID: manifest.productionConfig.r2AccountId,
    LINE_LOGIN_CHANNEL_ID: manifest.productionConfig.lineLoginChannelId,
  })) {
    assert(
      config.status === "OWNER_GATED_REQUIRED_BEFORE_DEPLOY",
      name + " must remain explicitly Owner-gated before deploy",
    );
    assert(config.valueEmbedded === false, name + " value must not be embedded");
    assert(
      /^<OWNER_APPROVED_[A-Z0-9_]+>$/.test(config.placeholder),
      name + " must carry an explicit owner-approved placeholder",
    );
  }

  const serialized = JSON.stringify(manifest);
  assert(!serialized.includes("postgresql://"), "Database URL leaked into manifest");
  assert(!serialized.includes("postgres://"), "Database URL leaked into manifest");

  return {
    releaseId: manifest.releaseId,
    artifactInputSha256: input.sha256,
    migrationSetSha256: migration.sha256,
    apiImage: manifest.artifacts.api.immutableRef,
    webImage: manifest.artifacts.web.immutableRef,
  };
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const result = verifyManifest(manifest);

if (process.argv.includes("--self-test")) {
  const invalid = structuredClone(manifest);
  invalid.deploymentPolicy.apiImage = invalid.artifacts.api.tag;
  let rejected = false;
  try {
    verifyManifest(invalid);
  } catch {
    rejected = true;
  }
  assert(rejected, "Negative self-test did not reject tag-only deployment authority");
}

console.log(
  "M8_RELEASE_MANIFEST_VERIFY_PASS " +
    "release=" +
    result.releaseId +
    " source=" +
    result.artifactInputSha256 +
    " migrations=" +
    result.migrationSetSha256,
);
