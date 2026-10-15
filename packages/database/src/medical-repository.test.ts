import { describe, expect, it } from "vitest";

import {
  buildMedicalApproverScopeWhere,
  medicalCalendarYearRange,
  validateFinalizedMedicalAttachments,
} from "./medical-repository";

const employeeId =
  "00000000-0000-4000-8000-000000000001";
const attachmentA =
  "00000000-0000-4000-8000-000000000101";
const attachmentB =
  "00000000-0000-4000-8000-000000000102";

function finalizedAttachment(
  overrides: Partial<{
    id: string;
    ownerEmployeeId: string | null;
    privacyClass:
      | "INTERNAL"
      | "EMPLOYEE_PRIVATE"
      | "MEDICAL_PRIVATE"
      | "ADMIN_PRIVATE";
    storageProvider:
      | "LEGACY_DRIVE"
      | "R2";
    storageKey: string | null;
    originalFilename: string | null;
    mimeType: string | null;
    sizeBytes: bigint | null;
    checksumSha256: string | null;
    finalizedAt: Date | null;
    leaveLink: { attachmentId: string } | null;
    overtimeLink: { attachmentId: string } | null;
    medicalLink: { attachmentId: string } | null;
    announcementLink: { attachmentId: string } | null;
    employeeMedia: { id: string } | null;
  }> = {},
) {
  return {
    id: attachmentA,
    ownerEmployeeId: employeeId,
    privacyClass:
      "MEDICAL_PRIVATE" as const,
    storageProvider: "R2" as const,
    storageKey:
      "medical/private/2026/receipt",
    originalFilename: "receipt.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024n,
    checksumSha256: "a".repeat(64),
    finalizedAt: new Date("2026-10-05T10:00:00.000Z"),
    leaveLink: null,
    overtimeLink: null,
    medicalLink: null,
    announcementLink: null,
    employeeMedia: null,
    ...overrides,
  };
}

describe("medical repository guards", () => {
  it("returns no organization filter for GLOBAL scope", () => {
    expect(
      buildMedicalApproverScopeWhere(
        "GLOBAL",
        {
          agencyId: null,
          departmentId: null,
        },
      ),
    ).toEqual({});
  });

  it("binds SAME_AGENCY and fails closed without requester agency", () => {
    expect(
      buildMedicalApproverScopeWhere(
        "SAME_AGENCY",
        {
          agencyId:
            "00000000-0000-4000-8000-000000000010",
          departmentId: null,
        },
      ),
    ).toEqual({
      agencyId:
        "00000000-0000-4000-8000-000000000010",
    });

    expect(() =>
      buildMedicalApproverScopeWhere(
        "SAME_AGENCY",
        {
          agencyId: null,
          departmentId: null,
        },
      ),
    ).toThrow("requires requester agency");
  });

  it("binds SAME_DEPARTMENT and fails closed without requester department", () => {
    expect(
      buildMedicalApproverScopeWhere(
        "SAME_DEPARTMENT",
        {
          agencyId: null,
          departmentId:
            "00000000-0000-4000-8000-000000000011",
        },
      ),
    ).toEqual({
      departmentId:
        "00000000-0000-4000-8000-000000000011",
    });

    expect(() =>
      buildMedicalApproverScopeWhere(
        "SAME_DEPARTMENT",
        {
          agencyId: null,
          departmentId: null,
        },
      ),
    ).toThrow(
      "requires requester department",
    );
  });

  it("derives an exact calendar-year range", () => {
    expect(
      medicalCalendarYearRange(
        "2026-10-05",
      ),
    ).toEqual({
      start: new Date(
        "2026-01-01T00:00:00.000Z",
      ),
      endExclusive: new Date(
        "2027-01-01T00:00:00.000Z",
      ),
    });
  });

  it("accepts actor-owned finalized MEDICAL_PRIVATE R2 receipts", () => {
    expect(() =>
      validateFinalizedMedicalAttachments({
        employeeId,
        requestedIds: [
          attachmentA,
          attachmentB,
        ],
        rows: [
          finalizedAttachment(),
          finalizedAttachment({
            id: attachmentB,
            storageKey:
              "medical/private/2026/receipt-2",
            mimeType: "image/png",
            sizeBytes: 2048n,
            checksumSha256:
              "b".repeat(64),
          }),
        ],
      }),
    ).not.toThrow();
  });

  it("rejects missing, duplicate, foreign-owner, or non-medical attachment sets", () => {
    expect(() =>
      validateFinalizedMedicalAttachments({
        employeeId,
        requestedIds: [
          attachmentA,
          attachmentB,
        ],
        rows: [
          finalizedAttachment(),
        ],
      }),
    ).toThrow("set is incomplete");

    expect(() =>
      validateFinalizedMedicalAttachments({
        employeeId,
        requestedIds: [
          attachmentA,
          attachmentA,
        ],
        rows: [
          finalizedAttachment(),
          finalizedAttachment(),
        ],
      }),
    ).toThrow("must be unique");

    expect(() =>
      validateFinalizedMedicalAttachments({
        employeeId,
        requestedIds: [
          attachmentA,
        ],
        rows: [
          finalizedAttachment({
            ownerEmployeeId:
              "00000000-0000-4000-8000-000000000099",
          }),
        ],
      }),
    ).toThrow("owner mismatch");

    expect(() =>
      validateFinalizedMedicalAttachments({
        employeeId,
        requestedIds: [
          attachmentA,
        ],
        rows: [
          finalizedAttachment({
            privacyClass:
              "EMPLOYEE_PRIVATE",
          }),
        ],
      }),
    ).toThrow("MEDICAL_PRIVATE");
  });

  it("rejects non-R2, incomplete checksum metadata, or already-linked receipts", () => {
    expect(() =>
      validateFinalizedMedicalAttachments({
        employeeId,
        requestedIds: [
          attachmentA,
        ],
        rows: [
          finalizedAttachment({
            storageProvider:
              "LEGACY_DRIVE",
          }),
        ],
      }),
    ).toThrow("finalized in R2");

    expect(() =>
      validateFinalizedMedicalAttachments({
        employeeId,
        requestedIds: [
          attachmentA,
        ],
        rows: [
          finalizedAttachment({
            checksumSha256: null,
          }),
        ],
      }),
    ).toThrow(
      "finalization metadata is incomplete",
    );

    expect(() =>
      validateFinalizedMedicalAttachments({
        employeeId,
        requestedIds: [
          attachmentA,
        ],
        rows: [
          finalizedAttachment({
            medicalLink: {
              attachmentId:
                attachmentA,
            },
          }),
        ],
      }),
    ).toThrow("already linked");
  });

  it("preserves receipt MIME and byte limits through business-rule validation", () => {
    expect(() =>
      validateFinalizedMedicalAttachments({
        employeeId,
        requestedIds: [
          attachmentA,
        ],
        rows: [
          finalizedAttachment({
            mimeType: "text/plain",
          }),
        ],
      }),
    ).toThrow("JPG, PNG, or PDF");

    expect(() =>
      validateFinalizedMedicalAttachments({
        employeeId,
        requestedIds: [
          attachmentA,
        ],
        rows: [
          finalizedAttachment({
            sizeBytes:
              BigInt(
                2 * 1024 * 1024 + 1,
              ),
          }),
        ],
      }),
    ).toThrow("size is invalid");
  });
});
