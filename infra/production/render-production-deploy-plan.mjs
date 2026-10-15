import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(path.join(here, "release-manifest.json"), "utf8"),
);

function assertDigestRef(value, name) {
  if (!/@sha256:[0-9a-f]{64}$/.test(value)) {
    throw new Error(name + " must use an immutable sha256 digest reference");
  }
}

if (manifest.productionMutationAuthorized !== false) {
  throw new Error("Release manifest unexpectedly authorizes Production mutation");
}
if (manifest.deploymentPolicy.ownerApprovalRequired !== true) {
  throw new Error("Owner approval gate is missing");
}

assertDigestRef(manifest.deploymentPolicy.apiImage, "API image");
assertDigestRef(manifest.deploymentPolicy.webImage, "Web image");

const p = manifest.productionConfig;
const requiredOwnerConfig = [p.r2AccountId, p.lineLoginChannelId];
if (
  requiredOwnerConfig.some(
    (config) =>
      config.status !== "OWNER_GATED_REQUIRED_BEFORE_DEPLOY" ||
      config.valueEmbedded !== false,
  )
) {
  throw new Error("Owner-gated Production configuration state is invalid");
}

const plan = {
  mode: "PLAN_ONLY_NON_EXECUTABLE",
  ownerApprovalRequired: true,
  productionMutationExecuted: false,
  blockedUntilResolved: [
    "R2_ACCOUNT_ID",
    "LINE_LOGIN_CHANNEL_ID",
    "Production provisioning/deploy approval",
  ],
  services: [
    {
      kind: "CLOUD_RUN_SERVICE",
      service: p.apiService,
      projectId: p.projectId,
      region: p.region,
      image: manifest.deploymentPolicy.apiImage,
      serviceAccount: p.runtimeServiceAccount,
      env: {
        CKACE_RUNTIME_STAGE: "production",
        CKACE_MODULE_ROUTING: "LEGACY",
        R2_ACCOUNT_ID: p.r2AccountId.placeholder,
        R2_BUCKET_NAME: p.r2Bucket,
        LINE_LOGIN_CHANNEL_ID: p.lineLoginChannelId.placeholder,
      },
      secretRefs: {
        DATABASE_URL: p.secretRefs.databaseUrl,
        CKACE_LEGACY_BRIDGE_SECRET: p.secretRefs.legacyBridgeSecret,
        R2_ACCESS_KEY_ID: p.secretRefs.r2AccessKeyId,
        R2_SECRET_ACCESS_KEY: p.secretRefs.r2SecretAccessKey,
      },
    },
    {
      kind: "CLOUD_RUN_SERVICE",
      service: p.webService,
      projectId: p.projectId,
      region: p.region,
      image: manifest.deploymentPolicy.webImage,
      serviceAccount: p.runtimeServiceAccount,
    },
  ],
};

console.log(JSON.stringify(plan, null, 2));
