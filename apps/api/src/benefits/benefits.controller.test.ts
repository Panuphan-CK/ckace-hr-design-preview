import type {
  MedicalRepository,
  OvertimeRepository,
} from "@ckace/database";
import { describe, expect, it } from "vitest";

import {
  REQUIRE_PERMISSION_KEY,
  SELF_AUTHORIZATION_TARGET_KEY,
} from "../security/require-permission.decorator";
import { BenefitsController } from "./benefits.controller";
import { BenefitsService } from "./benefits.service";

const employeeId = "00000000-0000-4000-8000-000000000001";

const overtime = {
  async getSelfOverview() {
    return {
      requests: [{
        id: "00000000-0000-4000-8000-000000000011",
        employeeId,
        reason: "Close month",
        status: "APPROVED" as const,
        decisionReason: null,
        submittedAt: "2026-10-05T10:00:00.000Z",
        segments: [{
          id: "00000000-0000-4000-8000-000000000012",
          workDate: "2026-10-05",
          startTime: "18:00",
          endTime: "20:00",
          requestedMinutes: 120,
          attendanceRecordId: null,
        }],
      }],
    };
  },
} as unknown as OvertimeRepository;

const medical = {
  async getSelfOverview() {
    return {
      entitlement: { annualLimit: 10000, approved: 1000, committed: 1500, remaining: 8500 },
      claims: [{
        id: "00000000-0000-4000-8000-000000000021",
        employeeId,
        leaveRequestId: null,
        benefitPolicyId: null,
        sicknessDate: "2026-10-04",
        amount: 500,
        description: "Clinic",
        status: "PENDING" as const,
        decisionReason: null,
        submittedAt: "2026-10-04T10:00:00.000Z",
        attachments: [{ attachmentId: "00000000-0000-4000-8000-000000000022", fileName: "receipt.pdf", mimeType: "application/pdf", sizeBytes: 100 }],
      }],
    };
  },
} as unknown as MedicalRepository;

describe("Benefits projection", () => {
  it("combines canonical OT and Medical without new write logic", async () => {
    const result = await new BenefitsService(overtime, medical).getSelfOverview(employeeId);
    expect(result.medicalEntitlement.remaining).toBe(8500);
    expect(result.requests).toHaveLength(2);
    expect(result.requests[0]).toMatchObject({ kind: "OVERTIME", value: 2 });
    expect(result.requests[1]).toMatchObject({ kind: "MEDICAL", value: 500 });
  });

  it("requires explicit SELF permission", () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, BenefitsController.prototype.getSelf))
      .toEqual({ permission: "benefits.self.read", scope: "SELF" });
    expect(Reflect.getMetadata(SELF_AUTHORIZATION_TARGET_KEY, BenefitsController.prototype.getSelf)).toBe(true);
  });
});
