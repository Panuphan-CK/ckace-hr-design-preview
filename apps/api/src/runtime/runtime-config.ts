export type RuntimeStage = "local" | "dev" | "test" | "production";

export interface RuntimeConfig {
  stage: RuntimeStage;
  moduleRouting: "LEGACY";
  databaseRequired: boolean;
  serviceRevision: string;
}

const PRODUCTION_DATABASE_NAME = "ckace_hr_prod";
const PRODUCTION_R2_BUCKET_NAME = "ckace-hr-prod-private";
const PRODUCTION_REQUIRED_ENV = [
  "CKACE_LEGACY_BRIDGE_SECRET",
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "LINE_LOGIN_CHANNEL_ID",
] as const;

function readStage(value: string | undefined): RuntimeStage {
  const stage = value?.trim().toLowerCase() || "local";

  if (
    stage === "local" ||
    stage === "dev" ||
    stage === "test" ||
    stage === "production"
  ) {
    return stage;
  }

  throw new Error(
    "CKACE_RUNTIME_STAGE must be local, dev, test, or production.",
  );
}

function readDatabaseName(databaseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  const databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\/+/, "").split("/")[0] ?? "",
  ).trim();

  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return databaseName;
}

function assertProductionIsolation(env: NodeJS.ProcessEnv): void {
  for (const name of PRODUCTION_REQUIRED_ENV) {
    if (!env[name]?.trim()) {
      throw new Error(`Production runtime requires ${name}.`);
    }
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for hosted DEV/TEST/Production runtime readiness.");
  }

  if (readDatabaseName(databaseUrl) !== PRODUCTION_DATABASE_NAME) {
    throw new Error(
      `Production runtime requires the dedicated ${PRODUCTION_DATABASE_NAME} database.`,
    );
  }

  if (env.R2_BUCKET_NAME?.trim() !== PRODUCTION_R2_BUCKET_NAME) {
    throw new Error(
      `Production runtime requires the dedicated ${PRODUCTION_R2_BUCKET_NAME} R2 bucket.`,
    );
  }
}

export function readRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeConfig {
  const stage = readStage(env.CKACE_RUNTIME_STAGE);
  const moduleRouting = (env.CKACE_MODULE_ROUTING ?? "LEGACY")
    .trim()
    .toUpperCase();

  if (moduleRouting !== "LEGACY") {
    throw new Error(
      "Runtime must keep CKACE_MODULE_ROUTING=LEGACY until a later owner-approved module cutover.",
    );
  }

  if (stage !== "local" && !env.DATABASE_URL?.trim()) {
    throw new Error(
      "DATABASE_URL is required for hosted DEV/TEST/Production runtime readiness.",
    );
  }

  if (stage === "production") {
    assertProductionIsolation(env);
  }

  return {
    stage,
    moduleRouting: "LEGACY",
    databaseRequired: stage !== "local",
    serviceRevision:
      env.K_REVISION?.trim() ||
      env.CKACE_SERVICE_REVISION?.trim() ||
      "local",
  };
}
