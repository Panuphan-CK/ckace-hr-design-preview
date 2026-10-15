import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(
  join(process.cwd(), "packages/database/prisma/schema.prisma"),
  "utf8",
);

function modelBlock(modelName: string): string {
  const match = schema.match(
    new RegExp("model\\s+" + modelName + "\\s+\\{([\\s\\S]*?)\\n\\}"),
  );

  if (!match?.[1]) {
    throw new Error("Missing Prisma model: " + modelName);
  }

  return match[1];
}

describe("M2 schema migration guards", () => {
  it("source-qualifies legacy provenance instead of trusting legacy_id globally", () => {
    const legacyRecord = modelBlock("LegacyRecord");

    expect(legacyRecord).toContain("sourcePeriod");
    expect(legacyRecord).toContain(
      "@@unique([sourceSystem, sourceWorkbook, sourceTab, sourcePeriod, legacyId])",
    );
  });

  it("does not enforce unique employee/date attendance because M0 found a real duplicate day", () => {
    const attendance = modelBlock("AttendanceRecord");

    expect(attendance).toContain("@@index([employeeId, workDate])");
    expect(attendance).not.toContain("@@unique([employeeId, workDate])");
  });

  it("normalizes approval policy stages into ordered rows", () => {
    const policyStep = modelBlock("ApprovalPolicyStep");

    expect(policyStep).toContain("@@unique([policyId, stepOrder])");
    expect(policyStep).toContain("scope");
    expect(policyStep).toContain("requiredRoleId");
  });

  it("uses verified hourly leave semantics instead of the old half-day label", () => {
    expect(schema).toContain("enum LeaveDurationCode");
    expect(schema).toContain("HOURLY");
    expect(schema).not.toContain("HALF_DAY");
  });

  it("preserves raw historical approval-step status for reconciliation", () => {
    expect(modelBlock("ApprovalStep")).toContain("legacyRawStatus");
  });

  it("contains the required M2 domain boundaries", () => {
    for (const model of [
      "Employee",
      "UserAccount",
      "LineAccount",
      "LeaveRequest",
      "AttendanceRecord",
      "TimeCorrectionRequest",
      "OvertimeRequest",
      "MedicalClaim",
      "Attachment",
      "AuditLog",
      "IdempotencyKey",
      "MigrationRun",
      "MigrationReconciliationResult",
    ]) {
      expect(schema).toContain("model " + model + " {");
    }
  });
});
