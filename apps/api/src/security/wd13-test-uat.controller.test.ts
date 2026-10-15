import { NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";

import { assertTask30UatRuntime } from "./wd13-test-uat.controller";

const KEYS = [
  "CKACE_RUNTIME_STAGE",
  "K_SERVICE",
  "K_REVISION",
] as const;

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
});

describe("TASK-30 TEST-only UAT runtime gate", () => {
  it("accepts only the dedicated TASK-30 TEST API revision", () => {
    process.env.CKACE_RUNTIME_STAGE = "test";
    process.env.K_SERVICE = "ckace-hr-api-test";
    process.env.K_REVISION = "ckace-hr-api-test-task30uat-20261008a";
    expect(() => assertTask30UatRuntime()).not.toThrow();
  });

  it.each([
    ["production", "ckace-hr-api-test", "ckace-hr-api-test-task30uat-20261008a"],
    ["test", "ckace-hr-api-prod", "ckace-hr-api-test-task30uat-20261008a"],
    ["test", "ckace-hr-api-test", "ckace-hr-api-test-m9d15d"],
    ["test", "ckace-hr-api-test", "ckace-hr-api-test-task30uatx-20261008a"],
  ])("fails closed outside the exact UAT boundary", (stage, service, revision) => {
    process.env.CKACE_RUNTIME_STAGE = stage;
    process.env.K_SERVICE = service;
    process.env.K_REVISION = revision;
    expect(() => assertTask30UatRuntime()).toThrow(NotFoundException);
  });
});
