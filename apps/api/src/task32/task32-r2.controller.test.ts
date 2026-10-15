import { NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";

import {
  assertTask32Runtime,
  mergeTask32CorsRules,
  TASK32_RECEIPT_TEXT,
  Task32R2Controller,
} from "./task32-r2.controller";

const KEYS = ["CKACE_RUNTIME_STAGE","K_SERVICE","K_REVISION"] as const;
afterEach(() => { for (const key of KEYS) delete process.env[key]; });

describe("TASK-32 exact TEST-only R2 harness boundary", () => {
  it("accepts only the dedicated task32r2 TEST API revision", () => {
    process.env.CKACE_RUNTIME_STAGE = "test";
    process.env.K_SERVICE = "ckace-hr-api-test";
    process.env.K_REVISION = "ckace-hr-api-test-task32r2-20261008b";
    expect(() => assertTask32Runtime()).not.toThrow();
    expect(new Task32R2Controller().receipt()).toMatchObject({
      text: TASK32_RECEIPT_TEXT,
      mimeType: "application/pdf",
    });
  });

  it("merges the exact TEST browser CORS rule without removing unrelated rules", () => {
    const existing = [{
      ID: "keep-me",
      AllowedOrigins: ["https://existing.example"],
      AllowedMethods: ["GET"],
    }];
    const merged = mergeTask32CorsRules(existing);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.ID).toBe("keep-me");
    expect(merged[1]).toMatchObject({
      ID: "task32-medical-private-browser",
      AllowedOrigins: [
        "https://task32-r2---ckace-hr-api-test-cjcyhgow2q-as.a.run.app",
        "https://wd13-retry---ckace-hr-web-test-cjcyhgow2q-as.a.run.app",
      ],
      AllowedMethods: ["PUT", "GET", "HEAD"],
      AllowedHeaders: ["content-type"],
    });
  });

  it.each([
    ["production","ckace-hr-api-test","ckace-hr-api-test-task32r2-20261008b"],
    ["test","ckace-hr-api-prod","ckace-hr-api-test-task32r2-20261008b"],
    ["test","ckace-hr-api-test","ckace-hr-api-test-m9d15d"],
    ["test","ckace-hr-api-test","ckace-hr-api-test-task32r2x-20261008b"],
  ])("fails closed outside the exact TASK-32 boundary", (stage,service,revision) => {
    process.env.CKACE_RUNTIME_STAGE=stage;
    process.env.K_SERVICE=service;
    process.env.K_REVISION=revision;
    expect(() => assertTask32Runtime()).toThrow(NotFoundException);
  });
});
