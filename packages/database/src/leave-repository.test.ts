import { describe, expect, it } from "vitest";

import {
  buildLeaveApproverScopeWhere,
  QUOTA_RESERVING_STATUSES,
  summarizeEntitlementUsage,
} from "./leave-repository";

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

describe("leave entitlement usage", () => {
  const rows = [
    { entitlementId: "e1", status: "APPROVED", days: 2 },
    { entitlementId: "e1", status: "PENDING", days: 1.5 },
    { entitlementId: "e1", status: "REVISION_REQUESTED", days: 1 },
    { entitlementId: "e1", status: "REJECTED", days: 3 },
    { entitlementId: "e1", status: "CANCELLED", days: 3 },
    { entitlementId: "e2", status: "PENDING", days: 5 },
  ];

  it("counts open requests as reserved so they cannot exceed the quota together", () => {
    expect(summarizeEntitlementUsage(rows, "e1", 6, (row) => row.days)).toEqual({
      used: 2,
      pending: 2.5,
      remaining: 1.5,
    });
  });

  it("never reports negative remaining days", () => {
    expect(summarizeEntitlementUsage(rows, "e1", 3, (row) => row.days).remaining).toBe(0);
  });

  it("reserves pending and sent-back requests when a new request is checked", () => {
    expect(QUOTA_RESERVING_STATUSES).toEqual(["APPROVED", "PENDING", "REVISION_REQUESTED"]);
  });
});
