import { describe, expect, it } from "vitest";

import type { MedicalSelfOverview } from "@ckace/contracts";

import {
  formatMedicalBytes,
  medicalMetrics,
  shouldCleanupUnlinkedReceipts,
  medicalStatusLabel,
  validateReceiptCandidates,
} from "./medical-view";

const overview: MedicalSelfOverview = {
  entitlement: {
    annualLimit: 10_000,
    approved: 1_200,
    committed: 1_700,
    remaining: 8_300,
  },
  claims: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      employeeId:
        "00000000-0000-4000-8000-000000000002",
      leaveRequestId: null,
      benefitPolicyId: null,
      sicknessDate: "2026-10-01",
      amount: 500,
      description: "พบแพทย์",
      status: "PENDING",
      decisionReason: null,
      submittedAt: "2026-10-01T08:00:00.000Z",
      attachments: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      employeeId:
        "00000000-0000-4000-8000-000000000002",
      leaveRequestId: null,
      benefitPolicyId: null,
      sicknessDate: "2026-09-01",
      amount: 1_200,
      description: "ค่ารักษา",
      status: "APPROVED",
      decisionReason: null,
      submittedAt: "2026-09-01T08:00:00.000Z",
      attachments: [],
    },
  ],
};

describe("Desktop Medical view helpers", () => {
  it("preserves receipts on an ambiguous claim commit but cleans on prewrite/definite rejection", () => {
    expect(shouldCleanupUnlinkedReceipts(false, false)).toBe(true);
    expect(shouldCleanupUnlinkedReceipts(true, true)).toBe(true);
    expect(shouldCleanupUnlinkedReceipts(true, false)).toBe(false);
  });
  it("derives entitlement and claim metrics from server data", () => {
    expect(medicalMetrics(overview)).toEqual({
      totalClaims: 2,
      pendingClaims: 1,
      approvedClaims: 1,
      rejectedClaims: 0,
      committedAmount: 1_700,
      remainingAmount: 8_300,
    });
  });

  it("validates receipt count, type and size bounds", () => {
    expect(
      validateReceiptCandidates([
        {
          name: "receipt.pdf",
          type: "application/pdf",
          size: 1024,
        },
      ]),
    ).toBeNull();

    expect(validateReceiptCandidates([])).toMatch(
      /1–3/,
    );
    expect(
      validateReceiptCandidates([
        {
          name: "receipt.txt",
          type: "text/plain",
          size: 1024,
        },
      ]),
    ).toMatch(/JPG, PNG/);
    expect(
      validateReceiptCandidates([
        {
          name: "a.pdf",
          type: "application/pdf",
          size: 2 * 1024 * 1024,
        },
        {
          name: "b.pdf",
          type: "application/pdf",
          size: 2 * 1024 * 1024,
        },
        {
          name: "c.pdf",
          type: "application/pdf",
          size: 1,
        },
      ]),
    ).toMatch(/รวม/);
  });

  it("formats medical status and attachment size", () => {
    expect(medicalStatusLabel("REJECTED")).toBe(
      "ไม่อนุมัติ",
    );
    expect(formatMedicalBytes(1024)).toBe("1.0 KiB");
    expect(formatMedicalBytes(null)).toBe("ไม่ทราบขนาด");
  });
});
