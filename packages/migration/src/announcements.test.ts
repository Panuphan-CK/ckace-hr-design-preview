import { describe, expect, it } from "vitest";
import {
  announcementTransformer,
  reconcileAnnouncements,
  countByStatus,
} from "./index";
import type { LegacyExtractedRecord } from "./migration-contracts";

function row(scope = "SameAgency"): LegacyExtractedRecord {
  return {
    rowNumber: 2,
    provenance: {
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "Data_CK&RR_Requests",
      sourceTab: "ManagerDB",
      sourcePeriod: "CURRENT",
      legacyId: "ANN-001",
      rowFingerprint: "a".repeat(64),
      migrationRunId: "m7-ann-test",
    },
    values: {
      CodeID: "ANN-001",
      UserID: "USER-001",
      Data1: "Office announcement",
      Date: "05/10/2026",
      FileURL: "https://drive.google.com/legacy",
      Scope: scope,
    },
    payloadHash: "b".repeat(64),
  };
}

describe("announcement migration", () => {
  it("maps SameAgency without exposing legacy file as runtime URL", () => {
    expect(announcementTransformer.transform(row())).toMatchObject({
      action: "IMPORT",
      payload: {
        legacyAnnouncementId: "ANN-001",
        scope: "AGENCY",
        ownerEmployeeLegacyId: "USER-001",
        hasLegacyAttachment: true,
        attachmentMigrationAuthority: "REFERENCE_ONLY_UNTIL_PRIVATE_R2_COPY",
        agencyResolution: "RESOLVE_FROM_OWNER_EMPLOYEE",
      },
    });
  });

  it("maps blank/global scope and rejects unsupported scope", () => {
    expect(announcementTransformer.transform(row("Global"))).toMatchObject({
      action: "IMPORT",
      payload: { scope: "GLOBAL" },
    });
    expect(announcementTransformer.transform(row("DepartmentOnly"))).toMatchObject({
      action: "REJECT",
      code: "ANNOUNCEMENT_INVALID_SOURCE",
    });
  });

  it("makes count/scope/attachment drift blocking", () => {
    const source = { count: 1, scopeCounts: { AGENCY: 1 }, attachmentReferenceCount: 1 };
    expect(countByStatus(reconcileAnnouncements(source, source))).toEqual({
      PASS: 3, EXCEPTION: 0, FAIL: 0,
    });
    expect(countByStatus(reconcileAnnouncements(source, { ...source, count: 0 }))).toEqual({
      PASS: 2, EXCEPTION: 0, FAIL: 1,
    });
  });
});
