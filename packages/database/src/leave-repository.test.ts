import { describe, expect, it } from "vitest";

import { buildLeaveApproverScopeWhere } from "./leave-repository";

describe("leave approver scope guards", () => {
  it("returns no organization filter for GLOBAL scope", () => {
    expect(
      buildLeaveApproverScopeWhere("GLOBAL", {
        agencyId: null,
        departmentId: null,
      }),
    ).toEqual({});
  });

  it("binds SAME_AGENCY to the requester agency", () => {
    expect(
      buildLeaveApproverScopeWhere("SAME_AGENCY", {
        agencyId: "00000000-0000-4000-8000-000000000001",
        departmentId: null,
      }),
    ).toEqual({
      agencyId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("fails closed when SAME_AGENCY has no requester agency", () => {
    expect(() =>
      buildLeaveApproverScopeWhere("SAME_AGENCY", {
        agencyId: null,
        departmentId: null,
      }),
    ).toThrow("requires requester agency");
  });

  it("binds SAME_DEPARTMENT to the requester department", () => {
    expect(
      buildLeaveApproverScopeWhere("SAME_DEPARTMENT", {
        agencyId: null,
        departmentId:
          "00000000-0000-4000-8000-000000000002",
      }),
    ).toEqual({
      departmentId:
        "00000000-0000-4000-8000-000000000002",
    });
  });

  it("fails closed when SAME_DEPARTMENT has no requester department", () => {
    expect(() =>
      buildLeaveApproverScopeWhere("SAME_DEPARTMENT", {
        agencyId: null,
        departmentId: null,
      }),
    ).toThrow("requires requester department");
  });
});
