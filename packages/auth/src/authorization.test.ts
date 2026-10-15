import { describe, expect, it } from "vitest";

import {
  AuthorizationDeniedError,
  assertAuthorized,
  isAuthorized,
  type InternalActorContext,
} from "./index";

const actor: InternalActorContext = {
  employeeId: "employee-1",
  legacyUid: "UID-1",
  roles: ["Employee"],
  permissions: ["leave.self.read", "leave.agency.approve"],
  agencyId: "agency-1",
  departmentId: "department-1",
  authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
  correlationId: "corr-1",
};

describe("authorization", () => {
  it("allows self scope only for the same employee", () => {
    expect(
      isAuthorized(
        actor,
        { permission: "leave.self.read", scope: "SELF" },
        { employeeId: "employee-1" },
      ),
    ).toBe(true);

    expect(
      isAuthorized(
        actor,
        { permission: "leave.self.read", scope: "SELF" },
        { employeeId: "employee-2" },
      ),
    ).toBe(false);
  });

  it("fails closed when target scope data is absent", () => {
    expect(
      isAuthorized(
        actor,
        { permission: "leave.agency.approve", scope: "AGENCY" },
        {},
      ),
    ).toBe(false);
  });

  it("does not grant access based on role name alone", () => {
    const privilegedRoleWithoutPermission: InternalActorContext = {
      ...actor,
      roles: ["SuperAdmin"],
      permissions: [],
    };

    expect(
      isAuthorized(
        privilegedRoleWithoutPermission,
        { permission: "admin.users.write", scope: "GLOBAL" },
      ),
    ).toBe(false);
  });

  it("throws a generic authorization error without leaking policy detail", () => {
    expect(() =>
      assertAuthorized(
        actor,
        { permission: "medical.global.read", scope: "GLOBAL" },
      ),
    ).toThrow(AuthorizationDeniedError);
  });
});
