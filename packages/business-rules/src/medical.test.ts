import { describe, expect, it } from "vitest";

import {
  assertMedicalAnnualLimit,
  assertMedicalCancelable,
  assertMedicalDateNotFuture,
  assertMedicalReceiptMetadata,
  calculateMedicalEntitlement,
  isMedicalAutoApprovalRole,
  normalizeMedicalAmount,
  normalizeMedicalCreate,
  normalizeMedicalDecision,
} from "./medical";

const attachmentA =
  "00000000-0000-4000-8000-000000000101";
const attachmentB =
  "00000000-0000-4000-8000-000000000102";

describe("medical business rules", () => {
  it("preserves the legacy 1,000 per-claim cap transparently", () => {
    expect(
      normalizeMedicalAmount(999.99),
    ).toEqual({
      requestedAmount: 999.99,
      effectiveAmount: 999.99,
      capped: false,
    });

    expect(
      normalizeMedicalAmount(1500),
    ).toEqual({
      requestedAmount: 1500,
      effectiveAmount: 1000,
      capped: true,
    });
  });

  it("rejects invalid amount precision and nonpositive values", () => {
    expect(() =>
      normalizeMedicalAmount(0),
    ).toThrow("positive");
    expect(() =>
      normalizeMedicalAmount(10.001),
    ).toThrow("2 decimals");
  });

  it("rejects future treatment dates", () => {
    expect(() =>
      assertMedicalDateNotFuture({
        sicknessDate: "2026-10-06",
        today: "2026-10-05",
      }),
    ).toThrow("future");

    expect(() =>
      assertMedicalDateNotFuture({
        sicknessDate: "2026-10-05",
        today: "2026-10-05",
      }),
    ).not.toThrow();
  });

  it("normalizes create input with finalized attachment IDs and optional leave linkage", () => {
    expect(
      normalizeMedicalCreate({
        sicknessDate: "2026-10-05",
        amount: 1200,
        description: " receipt ",
        attachmentIds: [
          attachmentA,
          attachmentB,
        ],
        leaveRequestId: null,
        clientKey: "medical-client-0001",
      }),
    ).toEqual({
      sicknessDate: "2026-10-05",
      amount: 1000,
      requestedAmount: 1200,
      capped: true,
      description: "receipt",
      attachmentIds: [
        attachmentA,
        attachmentB,
      ],
      leaveRequestId: null,
      clientKey: "medical-client-0001",
    });
  });

  it("requires 1-3 unique attachment IDs", () => {
    expect(() =>
      normalizeMedicalCreate({
        sicknessDate: "2026-10-05",
        amount: 100,
        description: "receipt",
        attachmentIds: [],
        clientKey: "medical-client-0002",
      }),
    ).toThrow("1 to 3");

    expect(() =>
      normalizeMedicalCreate({
        sicknessDate: "2026-10-05",
        amount: 100,
        description: "receipt",
        attachmentIds: [
          attachmentA,
          attachmentA,
        ],
        clientKey: "medical-client-0003",
      }),
    ).toThrow("unique");
  });

  it("preserves legacy receipt MIME and size boundaries", () => {
    expect(() =>
      assertMedicalReceiptMetadata([
        {
          attachmentId: attachmentA,
          mimeType: "application/pdf",
          sizeBytes: 2 * 1024 * 1024,
        },
        {
          attachmentId: attachmentB,
          mimeType: "image/png",
          sizeBytes: 2 * 1024 * 1024,
        },
      ]),
    ).not.toThrow();

    expect(() =>
      assertMedicalReceiptMetadata([
        {
          attachmentId: attachmentA,
          mimeType: "text/plain",
          sizeBytes: 100,
        },
      ]),
    ).toThrow("JPG, PNG, or PDF");

    expect(() =>
      assertMedicalReceiptMetadata([
        {
          attachmentId: attachmentA,
          mimeType: "application/pdf",
          sizeBytes: 2 * 1024 * 1024 + 1,
        },
      ]),
    ).toThrow("size");
  });

  it("calculates approved/committed entitlement from canonical statuses", () => {
    expect(
      calculateMedicalEntitlement({
        annualLimit: 10_000,
        claims: [
          {
            status: "APPROVED",
            amount: 1000,
          },
          {
            status: "PENDING",
            amount: 500,
          },
          {
            status: "REJECTED",
            amount: 900,
          },
          {
            status: "CANCELLED",
            amount: 800,
          },
        ],
      }),
    ).toEqual({
      annualLimit: 10_000,
      approved: 1000,
      committed: 1500,
      remaining: 8500,
    });
  });

  it("blocks annual committed amount above the limit", () => {
    expect(() =>
      assertMedicalAnnualLimit({
        committedAmount: 9500,
        newAmount: 500,
        annualLimit: 10_000,
      }),
    ).not.toThrow();

    expect(() =>
      assertMedicalAnnualLimit({
        committedAmount: 9500,
        newAmount: 501,
        annualLimit: 10_000,
      }),
    ).toThrow("limit exceeded");
  });

  it("auto-approves only Admin/SuperAdmin roles", () => {
    expect(
      isMedicalAutoApprovalRole([
        "EMPLOYEE",
      ]),
    ).toBe(false);
    expect(
      isMedicalAutoApprovalRole([
        "ADMIN",
      ]),
    ).toBe(true);
    expect(
      isMedicalAutoApprovalRole([
        "SUPERADMIN",
      ]),
    ).toBe(true);
  });

  it("follows the policy's auto-approval roles", () => {
    expect(isMedicalAutoApprovalRole(["ADMIN"], ["SUPERADMIN"])).toBe(false);
    expect(isMedicalAutoApprovalRole(["superuser"], ["SUPERUSER", "ADMIN"])).toBe(true);
    expect(isMedicalAutoApprovalRole(["ADMIN", "SUPERADMIN"], [])).toBe(false);
  });

  it("allows cancellation only while pending", () => {
    expect(() =>
      assertMedicalCancelable("PENDING"),
    ).not.toThrow();
    expect(() =>
      assertMedicalCancelable("APPROVED"),
    ).toThrow("pending");
  });

  it("requires a rejection comment", () => {
    expect(
      normalizeMedicalDecision({
        decision: "APPROVED",
        comment: " ok ",
      }),
    ).toEqual({
      decision: "APPROVED",
      comment: "ok",
    });

    expect(() =>
      normalizeMedicalDecision({
        decision: "REJECTED",
        comment: " ",
      }),
    ).toThrow("requires a comment");
  });

  it("uses a configured per-claim limit instead of the default 1,000", () => {
    expect(normalizeMedicalAmount(1500, 2000)).toMatchObject({ effectiveAmount: 1500, capped: false });
    expect(normalizeMedicalAmount(2500, 2000)).toMatchObject({ effectiveAmount: 2000, capped: true });
    expect(() => normalizeMedicalAmount(100, 0)).toThrow("per-claim limit");
  });
});
