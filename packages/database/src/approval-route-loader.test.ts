import { describe, expect, it } from "vitest";

import {
  resolveCompanyApprovalRoute,
  toRoleScope,
  type ApprovalRouteReader,
} from "./approval-route-loader";

const ACC = "11111111-1111-4111-8111-111111111111";
const TEAM_A = "22222222-2222-4222-8222-222222222222";

function person(
  id: string,
  agencyId: string | null,
  roles: {
    key: string;
    scopeType: "PLATFORM" | "COMPANY" | "TEAM_SET" | "SELF";
    scopeCompanyId?: string | null;
    scopeAgencyIds?: string[];
  }[],
  managerEmployeeId: string | null = null,
) {
  return {
    id,
    fullName: id,
    agencyId,
    managerEmployeeId,
    userAccount: {
      state: "ACTIVE",
      roles: roles.map((role) => ({
        scopeType: role.scopeType,
        scopeCompanyId: role.scopeCompanyId ?? null,
        scopeAgencyIds: role.scopeAgencyIds ?? [],
        role: { key: role.key },
      })),
    },
  };
}

function reader(
  agencyCompany: string | null,
  people: ReturnType<typeof person>[],
): ApprovalRouteReader {
  return {
    employee: {
      findUnique: async () => ({
        agency: agencyCompany ? { companyId: agencyCompany } : null,
      }),
      findMany: async () => people,
    },
    agency: {
      findMany: async () => [{ id: TEAM_A, companyId: ACC }],
    },
  } as unknown as ApprovalRouteReader;
}

describe("company approval route loader", () => {
  it("returns null for teams that are not attached to a company (legacy path)", async () => {
    const result = await resolveCompanyApprovalRoute(
      reader(null, []),
      "u1",
      [{ kind: "ROLE", roleKey: "ADMIN" }],
    );

    expect(result).toBeNull();
  });

  it("resolves approvers by role scope from database rows", async () => {
    const people = [
      person("u1", TEAM_A, []),
      person("lead", TEAM_A, [
        { key: "SUPER_USER", scopeType: "TEAM_SET", scopeAgencyIds: [TEAM_A] },
      ]),
      person("boss", TEAM_A, [
        { key: "SUPER_ADMIN", scopeType: "COMPANY", scopeCompanyId: ACC },
      ]),
    ];
    const result = await resolveCompanyApprovalRoute(
      reader(ACC, people),
      "u1",
      [
        { kind: "ROLE", roleKey: "SUPER_USER" },
        { kind: "ROLE", roleKey: "SUPER_ADMIN" },
      ],
    );

    expect(result?.route.steps.map((step) => step.candidateIds)).toEqual([
      ["lead"],
      ["boss"],
    ]);
    expect(result?.displayNames.get("lead")).toBe("lead");
  });

  it("fails closed when a company scope has no company id", () => {
    expect(
      toRoleScope({
        scopeType: "COMPANY",
        scopeCompanyId: null,
        scopeAgencyIds: null,
        role: { key: "SUPER_ADMIN" },
      }),
    ).toEqual({ type: "SELF" });
  });
});
