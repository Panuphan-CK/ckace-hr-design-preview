/** WD-13 TEST-only secret-target guard. Never emit URLs, users, passwords or tokens.
 * Invoke in a permissioned TEST runtime before *any* synthetic account creation.
 * Pure validation of the runtime's DATABASE_URL; no DB/network side effects.
 */
const DEV_HOSTS = new Set([
  "ep-twilight-bread-b32n36nz.c-4.ap-southeast-1.aws.neon.tech",
  "ep-twilight-bread-b32n36nz-pooler.c-4.ap-southeast-1.aws.neon.tech",
]);

const TEST_API_HOST = "ckace-hr-api-test-cjcyhgow2q-as.a.run.app";
const TEST_API_SERVICE = "ckace-hr-api-test";

export type Wd13BoundaryResult = Readonly<{
  verifiedProject: "CKACE_HR_DEV";
  databaseName: "ckace_hr_dev";
  runtimeStage: "test";
  apiScope: "CKACE_HR_TEST_API";
}>;
export type Wd13RuntimeAttestationResult = Wd13BoundaryResult & Readonly<{
  databaseConnection: "verified";
  serviceName: "ckace-hr-api-test";
}>;

/** Non-disclosing live-runtime attestation.
 * Validates the secret-backed URL in memory, the Cloud Run TEST service identity,
 * and the database name returned by the active PostgreSQL connection.
 * Never returns URL/host/user/password.
 */
export function attestWd13TestRuntime(input: {
  databaseUrl?: string | undefined;
  runtimeStage?: string | undefined;
  serviceName?: string | undefined;
  currentDatabase?: string | undefined;
}): Wd13RuntimeAttestationResult {
  if (input.serviceName !== TEST_API_SERVICE) {
    throw new Error("WD13_TEST_ATTESTATION_REJECTED");
  }

  const boundary = assertWd13TestBoundary({
    databaseUrl: input.databaseUrl,
    runtimeStage: input.runtimeStage,
    targetUrl: `https://${TEST_API_HOST}/`,
  });

  if (input.currentDatabase !== boundary.databaseName) {
    throw new Error("WD13_TEST_ATTESTATION_REJECTED");
  }

  return {
    ...boundary,
    databaseConnection: "verified",
    serviceName: TEST_API_SERVICE,
  };
}

export function assertWd13TestBoundary(input: {
  databaseUrl?: string | undefined;
  runtimeStage?: string | undefined;
  targetUrl?: string | undefined;
}): Wd13BoundaryResult {
  if (input.runtimeStage !== "test") {
    throw new Error("WD13_TEST_BOUNDARY_REJECTED");
  }

  let db: URL;
  let target: URL;
  try {
    db = new URL(input.databaseUrl ?? "");
    target = new URL(input.targetUrl ?? "");
  } catch {
    throw new Error("WD13_TEST_BOUNDARY_REJECTED");
  }

  if (
    !["postgres:", "postgresql:"].includes(db.protocol) ||
    !DEV_HOSTS.has(db.hostname.toLowerCase()) ||
    db.port !== "" ||
    decodeURIComponent(db.pathname) !== "/ckace_hr_dev" ||
    !db.username ||
    !db.password ||
    db.hash !== "" ||
    target.protocol !== "https:" ||
    target.hostname.toLowerCase() !== TEST_API_HOST ||
    target.pathname !== "/" ||
    !!target.username ||
    !!target.password ||
    !!target.port ||
    !!target.search ||
    !!target.hash
  ) {
    throw new Error("WD13_TEST_BOUNDARY_REJECTED");
  }

  // Intentionally no connection string, hostname, password, or account value returned.
  return {
    verifiedProject: "CKACE_HR_DEV",
    databaseName: "ckace_hr_dev",
    runtimeStage: "test",
    apiScope: "CKACE_HR_TEST_API",
  };
}
