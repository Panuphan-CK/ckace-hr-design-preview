import { describe, expect, it } from "vitest";

import { readRuntimeConfig } from "./runtime-config";

const productionEnv = {
  CKACE_RUNTIME_STAGE: "production",
  DATABASE_URL: "postgresql://synthetic.invalid/ckace_hr_prod",
  CKACE_LEGACY_BRIDGE_SECRET: "synthetic-bridge-secret",
  R2_ACCOUNT_ID: "synthetic-account",
  R2_BUCKET_NAME: "ckace-hr-prod-private",
  R2_ACCESS_KEY_ID: "synthetic-access-key",
  R2_SECRET_ACCESS_KEY: "synthetic-secret-key",
  LINE_LOGIN_CHANNEL_ID: "synthetic-channel",
};

describe("readRuntimeConfig", () => {
  it("defaults local runtime to LEGACY without requiring a database", () => {
    expect(readRuntimeConfig({})).toEqual({
      stage: "local",
      databaseRequired: false,
      serviceRevision: "local",
    });
  });

  it("requires DATABASE_URL for hosted TEST", () => {
    expect(() =>
      readRuntimeConfig({
        CKACE_RUNTIME_STAGE: "test",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("accepts hosted TEST without exposing the connection string", () => {
    const config = readRuntimeConfig({
      CKACE_RUNTIME_STAGE: "test",
      DATABASE_URL: "postgresql://synthetic.invalid/ckace_hr_dev",
      K_REVISION: "ckace-hr-api-test-00001",
    });

    expect(config).toEqual({
      stage: "test",
      databaseRequired: true,
      serviceRevision: "ckace-hr-api-test-00001",
    });
    expect(JSON.stringify(config)).not.toContain("postgresql://");
  });

  it("requires DATABASE_URL for Production", () => {
    expect(() =>
      readRuntimeConfig({
        CKACE_RUNTIME_STAGE: "production",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("requires all Production runtime dependencies", () => {
    expect(() =>
      readRuntimeConfig({
        ...productionEnv,
        R2_ACCESS_KEY_ID: "",
      }),
    ).toThrow(/R2_ACCESS_KEY_ID/);
  });

  it("rejects a DEV database in Production", () => {
    expect(() =>
      readRuntimeConfig({
        ...productionEnv,
        DATABASE_URL: "postgresql://synthetic.invalid/ckace_hr_dev",
      }),
    ).toThrow(/ckace_hr_prod/);
  });

  it("rejects the TEST R2 bucket in Production", () => {
    expect(() =>
      readRuntimeConfig({
        ...productionEnv,
        R2_BUCKET_NAME: "ckace-hr-test-private",
      }),
    ).toThrow(/ckace-hr-prod-private/);
  });

  it("accepts Production readiness without a duplicate single-value routing flag", () => {
    const config = readRuntimeConfig({
      ...productionEnv,
      K_REVISION: "ckace-hr-api-prod-00001",
    });

    expect(config).toEqual({
      stage: "production",
      databaseRequired: true,
      serviceRevision: "ckace-hr-api-prod-00001",
    });
    expect(JSON.stringify(config)).not.toContain("postgresql://");
  });

});
