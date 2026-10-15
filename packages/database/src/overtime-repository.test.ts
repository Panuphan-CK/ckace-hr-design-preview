import { describe, expect, it } from "vitest";

import {
  buildOvertimeApproverScopeWhere,
  deriveOvertimeRequestId,
  enumerateOvertimeDates,
} from "./overtime-repository";

describe("overtime repository helpers", () => {
  it("expands inclusive date ranges deterministically", () => {
    expect(
      enumerateOvertimeDates(
        "2026-10-05",
        "2026-10-07",
      ),
    ).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ]);
  });

  it("derives stable UUID request IDs per batch/date", () => {
    const first = deriveOvertimeRequestId(
      "00000000-0000-4000-8000-000000000001",
      "2026-10-05",
    );
    const replay = deriveOvertimeRequestId(
      "00000000-0000-4000-8000-000000000001",
      "2026-10-05",
    );
    const nextDay = deriveOvertimeRequestId(
      "00000000-0000-4000-8000-000000000001",
      "2026-10-06",
    );

    expect(first).toBe(replay);
    expect(first).not.toBe(nextDay);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("binds SAME_AGENCY to requester agency and fails closed without one", () => {
    expect(
      buildOvertimeApproverScopeWhere(
        "SAME_AGENCY",
        {
          agencyId:
            "00000000-0000-4000-8000-000000000001",
          departmentId: null,
        },
      ),
    ).toEqual({
      agencyId:
        "00000000-0000-4000-8000-000000000001",
    });

    expect(() =>
      buildOvertimeApproverScopeWhere(
        "SAME_AGENCY",
        {
          agencyId: null,
          departmentId: null,
        },
      ),
    ).toThrow("requires requester agency");
  });

  it("binds SAME_DEPARTMENT and leaves GLOBAL unfiltered", () => {
    expect(
      buildOvertimeApproverScopeWhere(
        "SAME_DEPARTMENT",
        {
          agencyId: null,
          departmentId:
            "00000000-0000-4000-8000-000000000002",
        },
      ),
    ).toEqual({
      departmentId:
        "00000000-0000-4000-8000-000000000002",
    });

    expect(
      buildOvertimeApproverScopeWhere(
        "GLOBAL",
        {
          agencyId: null,
          departmentId: null,
        },
      ),
    ).toEqual({});
  });
});
