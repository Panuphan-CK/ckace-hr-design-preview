import { describe, expect, it } from "vitest";

import {
  countByStatus,
  hasBlockingReconciliationFailure,
  KNOWN_LEGACY_EXCEPTION,
  validateReconciliationResult,
} from "./index";

describe("migration reconciliation", () => {
  it("keeps explicit migration exceptions separate from failures", () => {
    expect(
      countByStatus([
        {
          entityType: "attendance",
          checkName: "duplicate employee/date",
          status: "EXCEPTION",
          sourceValue: "1",
          targetValue: "1",
          exceptionCode:
            KNOWN_LEGACY_EXCEPTION.ATTENDANCE_DUPLICATE_BUSINESS_DAY.code,
          disposition:
            KNOWN_LEGACY_EXCEPTION.ATTENDANCE_DUPLICATE_BUSINESS_DAY
              .disposition,
        },
        {
          entityType: "leave",
          checkName: "orphan employee",
          status: "PASS",
          sourceValue: "0",
          targetValue: "0",
          exceptionCode: null,
          disposition: null,
        },
      ]),
    ).toEqual({ PASS: 1, EXCEPTION: 1, FAIL: 0 });
  });

  it("requires every exception to carry an explicit disposition", () => {
    expect(() =>
      validateReconciliationResult({
        entityType: "leave_entitlement",
        checkName: "active users missing policy",
        status: "EXCEPTION",
        sourceValue: "2",
        targetValue: "2",
        exceptionCode: "ACTIVE_USER_MISSING_LEAVE_POLICY",
        disposition: null,
      }),
    ).toThrow(
      "Non-PASS reconciliation requires exceptionCode and disposition",
    );
  });

  it("does not permit PASS to hide an exception disposition", () => {
    expect(() =>
      validateReconciliationResult({
        entityType: "approval_step",
        checkName: "downstream pending after rejected",
        status: "PASS",
        sourceValue: "4",
        targetValue: "4",
        exceptionCode: null,
        disposition: "silently normalize",
      }),
    ).toThrow("PASS reconciliation cannot carry exception disposition");
  });

  it("treats FAIL as blocking while explicit exceptions remain non-failures", () => {
    expect(
      hasBlockingReconciliationFailure([
        {
          entityType: "attendance",
          checkName: "duplicate employee/date",
          status: "EXCEPTION",
          sourceValue: "1",
          targetValue: "1",
          exceptionCode: "LEGACY_DUPLICATE_BUSINESS_DAY",
          disposition: "PRESERVE_DISTINCT_RECORDS_AND_REQUIRE_OWNER_REVIEW",
        },
      ]),
    ).toBe(false);

    expect(
      hasBlockingReconciliationFailure([
        {
          entityType: "employee",
          checkName: "orphan identity",
          status: "FAIL",
          sourceValue: "1",
          targetValue: "0",
          exceptionCode: "ORPHAN_IDENTITY",
          disposition: "BLOCK_IMPORT",
        },
      ]),
    ).toBe(true);
  });
});
