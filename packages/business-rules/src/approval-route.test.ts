import { describe, expect, it } from "vitest";

import {
  buildRouteSteps,
  resolveApprovalRoute,
  validateApprovalSelection,
  type ApprovalRouteStep,
  type RouteEmployee,
  type RouteTeam,
} from "./approval-route";

// Owner's organisation (2026-10-15):
// two companies, two SuperAdmins, one cross-company Admin, two team leads,
// ordinary users, and an administrative clerk who reports to the Admin only.
const ACC = "company-accounting";
const AUD = "company-audit";
const TEAM_A = "team-a";
const TEAM_B = "team-b";

const teams: RouteTeam[] = [
  { id: TEAM_A, companyId: ACC },
  { id: TEAM_B, companyId: AUD },
];

function person(
  id: string,
  overrides: Partial<RouteEmployee> = {},
): RouteEmployee {
  return {
    id,
    displayName: id,
    active: true,
    teamId: null,
    managerId: null,
    assignments: [],
    ...overrides,
  };
}

const superAdminAcc = person("sa-acc", {
  teamId: TEAM_A,
  assignments: [
    { roleKey: "SUPER_ADMIN", scope: { type: "COMPANY", companyId: ACC } },
  ],
});
const superAdminAud = person("sa-aud", {
  teamId: TEAM_B,
  assignments: [
    { roleKey: "SUPER_ADMIN", scope: { type: "COMPANY", companyId: AUD } },
  ],
});
const admin = person("admin", {
  teamId: TEAM_A,
  assignments: [
    {
      roleKey: "ADMIN",
      scope: { type: "TEAM_SET", teamIds: [TEAM_A, TEAM_B] },
    },
  ],
});
const leadA = person("lead-a", {
  teamId: TEAM_A,
  assignments: [
    { roleKey: "SUPER_USER", scope: { type: "TEAM_SET", teamIds: [TEAM_A] } },
  ],
});
const leadB = person("lead-b", {
  teamId: TEAM_B,
  assignments: [
    { roleKey: "SUPER_USER", scope: { type: "TEAM_SET", teamIds: [TEAM_B] } },
  ],
});
const userA = person("user-a", { teamId: TEAM_A, managerId: "lead-a" });
const userB = person("user-b", { teamId: TEAM_B, managerId: "lead-b" });
const clerk = person("clerk", { teamId: TEAM_A, managerId: "admin" });

const everyone = [
  superAdminAcc,
  superAdminAud,
  admin,
  leadA,
  leadB,
  userA,
  userB,
  clerk,
];

const standardChain: ApprovalRouteStep[] = [
  { kind: "ROLE", roleKey: "SUPER_USER" },
  { kind: "ROLE", roleKey: "ADMIN" },
  { kind: "ROLE", roleKey: "SUPER_ADMIN", peerFallback: true },
];

function route(requester: RouteEmployee, steps: ApprovalRouteStep[]) {
  return resolveApprovalRoute({
    requester,
    employees: everyone,
    teams,
    steps,
  });
}

describe("approval route for the Owner's organisation", () => {
  it("routes an accounting user to team lead, Admin, then own company's SuperAdmin", () => {
    const result = route(userA, standardChain);

    expect(result.steps.map((step) => step.candidateIds)).toEqual([
      ["lead-a"],
      ["admin"],
      ["sa-acc"],
    ]);
    expect(result.skipped).toEqual([]);
  });

  it("never sends an audit user to the other company's SuperAdmin or lead", () => {
    const result = route(userB, standardChain);

    expect(result.steps.map((step) => step.candidateIds)).toEqual([
      ["lead-b"],
      ["admin"],
      ["sa-aud"],
    ]);
  });

  it("routes the clerk straight to the Admin, skipping the team lead", () => {
    const result = route(clerk, [
      { kind: "DIRECT_MANAGER" },
      { kind: "ROLE", roleKey: "SUPER_ADMIN", peerFallback: true },
    ]);

    expect(result.steps.map((step) => step.candidateIds)).toEqual([
      ["admin"],
      ["sa-acc"],
    ]);
  });

  it("lets either SuperAdmin approve the cross-company Admin", () => {
    const result = route(admin, [
      { kind: "ROLE", roleKey: "SUPER_ADMIN", peerFallback: true },
    ]);

    expect(result.steps[0]?.candidateIds).toEqual(["sa-acc", "sa-aud"]);
    expect(result.steps[0]?.selectedId).toBeNull();
  });

  it("sends a SuperAdmin's own request to the other SuperAdmin only", () => {
    const result = route(superAdminAcc, [
      { kind: "ROLE", roleKey: "SUPER_ADMIN", peerFallback: true },
    ]);

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.candidateIds).toEqual(["sa-aud"]);
    expect(result.steps[0]?.viaPeerFallback).toBe(true);
    expect(result.steps[0]?.selectedId).toBe("sa-aud");
  });

  it("skips a step that has nobody and records why", () => {
    const withoutLeadB = everyone.filter((item) => item.id !== "lead-b");
    const result = resolveApprovalRoute({
      requester: userB,
      employees: withoutLeadB,
      teams,
      steps: standardChain,
    });

    expect(result.steps.map((step) => step.candidateIds)).toEqual([
      ["admin"],
      ["sa-aud"],
    ]);
    expect(result.skipped).toEqual([
      {
        policyStepIndex: 0,
        source: standardChain[0],
        reason: "NO_ELIGIBLE_APPROVER",
      },
    ]);
  });

  it("ignores inactive people and the requester", () => {
    const inactiveLead = { ...leadA, active: false };
    const result = resolveApprovalRoute({
      requester: userA,
      employees: everyone.map((item) =>
        item.id === "lead-a" ? inactiveLead : item,
      ),
      teams,
      steps: standardChain,
    });

    expect(result.steps[0]?.candidateIds).toEqual(["admin"]);
  });

  it("lets the system pick the first approver when configured (medical style)", () => {
    const twoAdmins = [
      ...everyone,
      person("admin-2", {
        displayName: "zzz",
        teamId: TEAM_A,
        assignments: [
          { roleKey: "ADMIN", scope: { type: "TEAM_SET", teamIds: [TEAM_A] } },
        ],
      }),
    ];
    const result = resolveApprovalRoute({
      requester: userA,
      employees: twoAdmins,
      teams,
      steps: [{ kind: "ROLE", roleKey: "ADMIN", selection: "SYSTEM_PICKS_FIRST" }],
    });

    expect(result.steps[0]?.candidateIds).toEqual(["admin", "admin-2"]);
    expect(result.steps[0]?.selectedId).toBe("admin");
  });

  it("validates the requester's picks", () => {
    const twoAdmins = [
      ...everyone,
      person("admin-2", {
        displayName: "zzz",
        teamId: TEAM_A,
        assignments: [
          { roleKey: "ADMIN", scope: { type: "TEAM_SET", teamIds: [TEAM_A] } },
        ],
      }),
    ];
    const resolved = resolveApprovalRoute({
      requester: userA,
      employees: twoAdmins,
      teams,
      steps: standardChain,
    });

    // lead-a and sa-acc are fixed (single candidate); only Admin is open
    expect(
      validateApprovalSelection(resolved, userA.id, ["admin-2"]),
    ).toEqual({
      ok: true,
      approverIds: ["lead-a", "admin-2", "sa-acc"],
    });
    expect(validateApprovalSelection(resolved, userA.id, [])).toEqual({
      ok: false,
      error: "INCOMPLETE",
    });
    expect(
      validateApprovalSelection(resolved, userA.id, ["lead-b"]),
    ).toEqual({ ok: false, error: "NOT_A_CANDIDATE" });
  });
});

describe("per-employee route mode", () => {
  const policy: ApprovalRouteStep[] = [
    { kind: "ROLE", roleKey: "SUPER_USER" },
    { kind: "ROLE", roleKey: "ADMIN" },
    { kind: "ROLE", roleKey: "SUPER_ADMIN", peerFallback: true },
  ];

  it("keeps the standard steps for STANDARD or when there is no manager", () => {
    expect(
      buildRouteSteps({
        policySteps: policy,
        mode: "STANDARD",
        managerRoleKeys: ["ADMIN"],
      }),
    ).toEqual(policy);
    expect(
      buildRouteSteps({
        policySteps: policy,
        mode: "MANAGER_FIRST",
        managerRoleKeys: null,
      }),
    ).toEqual(policy);
  });

  it("sends a manager-first employee to the manager, then only higher levels", () => {
    expect(
      buildRouteSteps({
        policySteps: policy,
        mode: "MANAGER_FIRST",
        managerRoleKeys: ["ADMIN"],
      }),
    ).toEqual([{ kind: "DIRECT_MANAGER" }, policy[2]]);
  });

  it("keeps every policy step when the manager holds none of the roles", () => {
    expect(
      buildRouteSteps({
        policySteps: policy,
        mode: "MANAGER_FIRST",
        managerRoleKeys: ["COORDINATOR"],
      }),
    ).toEqual([{ kind: "DIRECT_MANAGER" }, ...policy]);
  });

  it("resolves the clerk through the Admin and the company SuperAdmin", () => {
    const steps = buildRouteSteps({
      policySteps: policy,
      mode: "MANAGER_FIRST",
      managerRoleKeys: ["ADMIN"],
    });
    const result = route(clerk, [...steps]);

    expect(result.steps.map((step) => step.candidateIds)).toEqual([
      ["admin"],
      ["sa-acc"],
    ]);
  });
});
