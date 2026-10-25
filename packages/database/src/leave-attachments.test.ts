import { describe, expect, it } from "vitest";

import {
  validateLeaveAttachments,
  type LeaveAttachmentRow,
} from "./leave-attachments";

const EMP = "00000000-0000-4000-8000-000000000001";
const ID = "00000000-0000-4000-8000-0000000000a1";

function row(over: Partial<LeaveAttachmentRow> = {}): LeaveAttachmentRow {
  return {
    id: ID,
    ownerEmployeeId: EMP,
    privacyClass: "MEDICAL_PRIVATE",
    storageProvider: "R2",
    storageKey: "private/a1",
    mimeType: "application/pdf",
    sizeBytes: 1024n,
    checksumSha256: "a".repeat(64),
    finalizedAt: new Date("2026-10-01T00:00:00Z"),
    leaveLink: null,
    overtimeLink: null,
    medicalLink: null,
    announcementLink: null,
    employeeMedia: null,
    ...over,
  };
}

function check(over: Partial<LeaveAttachmentRow> = {}, extra: object = {}) {
  validateLeaveAttachments({
    employeeId: EMP,
    leaveTypeKey: "SICK",
    requestedIds: [ID],
    rows: [row(over)],
    ...extra,
  });
}

describe("validateLeaveAttachments", () => {
  it("accepts nothing requested for any leave type", () => {
    expect(() =>
      validateLeaveAttachments({ employeeId: EMP, leaveTypeKey: "ANNUAL", requestedIds: [], rows: [] }),
    ).not.toThrow();
  });

  it("accepts an owned, finalized, unlinked JPG/PNG/PDF on sick leave", () => {
    expect(() => check()).not.toThrow();
    expect(() => check({ mimeType: "image/png" })).not.toThrow();
    expect(() => check({ mimeType: "image/jpeg" })).not.toThrow();
  });

  it("rejects attachments on non-sick leave", () => {
    expect(() =>
      validateLeaveAttachments({ employeeId: EMP, leaveTypeKey: "ANNUAL", requestedIds: [ID], rows: [row()] }),
    ).toThrow(/only allowed for sick leave/);
  });

  it("fails closed on ownership, class, finalization, type, size and linkage", () => {
    expect(() => check({ ownerEmployeeId: "someone-else" })).toThrow(/owner mismatch/);
    expect(() => check({ privacyClass: "EMPLOYEE_PRIVATE" })).toThrow(/MEDICAL_PRIVATE/);
    expect(() => check({ finalizedAt: null })).toThrow(/finalized/);
    expect(() => check({ storageKey: null })).toThrow(/finalized/);
    expect(() => check({ checksumSha256: "zz" })).toThrow(/metadata/);
    expect(() => check({ mimeType: "text/html" })).toThrow(/JPG, PNG, or PDF/);
    expect(() => check({ sizeBytes: BigInt(2 * 1024 * 1024 + 1) })).toThrow(/size/);
    expect(() => check({ leaveLink: { attachmentId: ID } })).toThrow(/already linked/);
    expect(() => check({ medicalLink: { attachmentId: ID } })).toThrow(/already linked/);
  });

  it("rejects missing rows, duplicates and more than 3 files in total", () => {
    expect(() =>
      validateLeaveAttachments({ employeeId: EMP, leaveTypeKey: "SICK", requestedIds: [ID], rows: [] }),
    ).toThrow(/incomplete/);
    expect(() =>
      validateLeaveAttachments({ employeeId: EMP, leaveTypeKey: "SICK", requestedIds: [ID, ID], rows: [row(), row()] }),
    ).toThrow(/unique/);
    expect(() => check({}, { existingCount: 3 })).toThrow(/at most 3/);
  });
});
