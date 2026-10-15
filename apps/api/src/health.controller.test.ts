import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { HealthController } from "./health.controller";
import type { RuntimeReadinessService } from "./runtime/runtime-readiness.service";

function fakeReadiness(stage: "test" | "production") {
  return {
    getRuntimeConfig: () => ({
      stage,
      moduleRouting: "LEGACY" as const,
      databaseRequired: true,
      serviceRevision: "test-revision",
    }),
    attestWd13TestDatabase: vi.fn().mockResolvedValue({
      ok: true,
      attestation: "VERIFIED",
      verifiedProject: "CKACE_HR_DEV",
      databaseName: "ckace_hr_dev",
      runtimeStage: "test",
      apiScope: "CKACE_HR_TEST_API",
      databaseConnection: "verified",
      serviceName: "ckace-hr-api-test",
      serviceRevision: "test-revision",
    }),
  } as unknown as RuntimeReadinessService;
}

describe("HealthController WD-13 non-disclosing TEST database attestation", () => {
  it("returns only safe attestation metadata in TEST", async () => {
    const readiness = fakeReadiness("test");
    const result = await new HealthController(readiness).getTestDatabaseAttestation();

    expect(result).toMatchObject({
      ok: true,
      attestation: "VERIFIED",
      verifiedProject: "CKACE_HR_DEV",
      databaseName: "ckace_hr_dev",
      runtimeStage: "test",
      databaseConnection: "verified",
      serviceName: "ckace-hr-api-test",
    });
    const serialized = JSON.stringify(result);
    for (const forbidden of ["postgresql:", "neon.tech", "password", "DATABASE_URL"]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("does not expose the endpoint outside TEST", async () => {
    const readiness = fakeReadiness("production");
    await expect(
      new HealthController(readiness).getTestDatabaseAttestation(),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("fails closed without leaking internal attestation errors", async () => {
    const readiness = fakeReadiness("test");
    vi.mocked(readiness.attestWd13TestDatabase).mockRejectedValueOnce(
      new Error("sensitive runtime detail"),
    );

    await expect(
      new HealthController(readiness).getTestDatabaseAttestation(),
    ).rejects.toMatchObject({
      constructor: ServiceUnavailableException,
      response: { ok: false, attestation: "FAILED" },
    });
  });
});
