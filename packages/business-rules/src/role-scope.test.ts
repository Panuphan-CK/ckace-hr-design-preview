import { describe, expect, it } from "vitest";

import {
  assertValidManager,
  normalizeRoleScope,
} from "./role-scope";

describe("role scope normalization", () => {
  it("accepts each scope kind in its valid shape", () => {
    expect(normalizeRoleScope({ scopeType: "PLATFORM" })).toEqual({
      scopeType: "PLATFORM",
      scopeCompanyId: null,
      scopeAgencyIds: [],
    });
    expect(
      normalizeRoleScope({ scopeType: "COMPANY", scopeCompanyId: "c1" }),
    ).toEqual({
      scopeType: "COMPANY",
      scopeCompanyId: "c1",
      scopeAgencyIds: [],
    });
    expect(
      normalizeRoleScope({
        scopeType: "TEAM_SET",
        scopeAgencyIds: ["a", "b", "a"],
      }),
    ).toEqual({
      scopeType: "TEAM_SET",
      scopeCompanyId: null,
      scopeAgencyIds: ["a", "b"],
    });
  });

  it("rejects incomplete or contradictory scopes", () => {
    expect(() => normalizeRoleScope({ scopeType: "COMPANY" })).toThrow(
      "COMPANY",
    );
    expect(() =>
      normalizeRoleScope({ scopeType: "TEAM_SET", scopeAgencyIds: [] }),
    ).toThrow("TEAM_SET");
    expect(() =>
      normalizeRoleScope({
        scopeType: "PLATFORM",
        scopeCompanyId: "c1",
      }),
    ).toThrow("PLATFORM");
    expect(() =>
      normalizeRoleScope({
        scopeType: "NOPE" as unknown as "SELF",
      }),
    ).toThrow("not supported");
  });
});

describe("manager hierarchy", () => {
  const managers: Record<string, string | null> = {
    clerk: "admin",
    admin: null,
    lead: "admin",
  };
  const managerOf = (id: string) => managers[id] ?? null;

  it("allows a normal manager and clearing the manager", () => {
    expect(() =>
      assertValidManager({ employeeId: "clerk", managerId: "admin", managerOf }),
    ).not.toThrow();
    expect(() =>
      assertValidManager({ employeeId: "clerk", managerId: null, managerOf }),
    ).not.toThrow();
  });

  it("rejects self and loops", () => {
    expect(() =>
      assertValidManager({ employeeId: "admin", managerId: "admin", managerOf }),
    ).toThrow("own manager");
    expect(() =>
      assertValidManager({ employeeId: "admin", managerId: "clerk", managerOf }),
    ).toThrow("loop");
  });
});
