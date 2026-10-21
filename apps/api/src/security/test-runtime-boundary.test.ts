import { describe, expect, it } from "vitest";
import { assertTestRuntimeBoundary, attestTestRuntime } from "./test-runtime-boundary";

const dev = "postgresql://synthetic:synthetic@ep-twilight-bread-b32n36nz.c-4.ap-southeast-1.aws.neon.tech/ckace_hr_dev?sslmode=require";
const testApi = "https://ckace-hr-api-test-cjcyhgow2q-as.a.run.app/";


describe("non-disclosing live TEST runtime attestation", () => {
  it("accepts only the approved TEST service plus the connected DEV database", () => {
    expect(attestTestRuntime({
      databaseUrl: dev,
      runtimeStage: "test",
      serviceName: "ckace-hr-api-test",
      currentDatabase: "ckace_hr_dev",
    })).toEqual({
      verifiedProject: "CKACE_HR_DEV",
      databaseName: "ckace_hr_dev",
      runtimeStage: "test",
      apiScope: "CKACE_HR_TEST_API",
      databaseConnection: "verified",
      serviceName: "ckace-hr-api-test",
    });
  });

  it.each([
    { serviceName: "ckace-hr-api-prod", currentDatabase: "ckace_hr_dev" },
    { serviceName: "ckace-hr-api-test", currentDatabase: "ckace_hr_prod" },
    { serviceName: "", currentDatabase: "ckace_hr_dev" },
  ])("fails closed for mismatched runtime identity %#", value => {
    expect(() => attestTestRuntime({
      databaseUrl: dev,
      runtimeStage: "test",
      ...value,
    })).toThrow("TEST_RUNTIME_ATTESTATION_REJECTED");
  });

  it("never returns connection URL, host, user, password, or endpoint", () => {
    const result = JSON.stringify(attestTestRuntime({
      databaseUrl: dev,
      runtimeStage: "test",
      serviceName: "ckace-hr-api-test",
      currentDatabase: "ckace_hr_dev",
    }));
    for (const secretOrEndpoint of [
      "postgresql:",
      "synthetic",
      "ep-twilight",
      "neon.tech",
      "@",
    ]) expect(result).not.toContain(secretOrEndpoint);
  });
});

describe("fail-closed TEST runtime and connection target guard", () => {
  it("accepts only the known CKACE HR DEV endpoint and TEST API origin", () => {
    expect(assertTestRuntimeBoundary({ databaseUrl: dev, runtimeStage: "test", targetUrl: testApi }))
      .toEqual({ verifiedProject: "CKACE_HR_DEV", databaseName: "ckace_hr_dev", runtimeStage: "test", apiScope: "CKACE_HR_TEST_API" });
  });

  it("accepts the DEV transaction pooler hostname", () => {
    expect(assertTestRuntimeBoundary({ databaseUrl: dev.replace(".c-4.", "-pooler.c-4."), runtimeStage: "test", targetUrl: testApi }).databaseName)
      .toBe("ckace_hr_dev");
  });

  it.each(["production", "dev", "", undefined])("refuses non-TEST runtime stage %s", stage => {
    expect(() => assertTestRuntimeBoundary({ databaseUrl: dev, ...(stage === undefined ? {} : { runtimeStage: stage }), targetUrl: testApi })).toThrow("TEST_RUNTIME_BOUNDARY_REJECTED");
  });

  it.each([
    "ep-shiny-math-b38swy2r.c-4.ap-southeast-1.aws.neon.tech",
    "ep-twilight-bread-b32n36nz.c-4.ap-southeast-1.aws.neon.tech.attacker.invalid",
    "example.neon.tech",
  ])("rejects unknown or Production DB host %s", host => {
    expect(() => assertTestRuntimeBoundary({ databaseUrl: dev.replace("ep-twilight-bread-b32n36nz.c-4.ap-southeast-1.aws.neon.tech", host), runtimeStage: "test", targetUrl: testApi })).toThrow("TEST_RUNTIME_BOUNDARY_REJECTED");
  });

  it("refuses a different database, missing credential, invalid scheme or unexpected port", () => {
    for (const url of [
      dev.replace("/ckace_hr_dev", "/ckace_hr_prod"),
      dev.replace("synthetic:synthetic@", "synthetic@"),
      dev.replace("postgresql:", "https:"),
      dev.replace("/ckace_hr_dev", ":5432/ckace_hr_dev"),
      "",
    ]) expect(() => assertTestRuntimeBoundary({ databaseUrl: url, runtimeStage: "test", targetUrl: testApi })).toThrow("TEST_RUNTIME_BOUNDARY_REJECTED");
  });

  it.each([
    "https://hr.ckaceaccount.com/",
    "https://ckace-hr-api-test-cjcyhgow2q-as.a.run.app.evil.invalid/",
    "http://ckace-hr-api-test-cjcyhgow2q-as.a.run.app/",
    "https://ckace-hr-api-test-cjcyhgow2q-as.a.run.app/desktop",
    "https://ckace-hr-api-test-cjcyhgow2q-as.a.run.app/?sensitive=1",
  ])("refuses unknown, Production or malformed API target %s", targetUrl => {
    expect(() => assertTestRuntimeBoundary({ databaseUrl: dev, runtimeStage: "test", targetUrl })).toThrow("TEST_RUNTIME_BOUNDARY_REJECTED");
  });

  it("never returns connection strings or secrets in successful output", () => {
    const result = JSON.stringify(assertTestRuntimeBoundary({ databaseUrl: dev, runtimeStage: "test", targetUrl: testApi }));
    expect(result).not.toContain("synthetic");
    expect(result).not.toContain("ep-twilight");
    expect(result).not.toContain("postgresql:");
  });
});
