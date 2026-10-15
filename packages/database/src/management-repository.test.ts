import { describe, expect, it, vi } from "vitest";

import { PrismaManagementRepository } from "./management-repository";

const EMPLOYEE = "11111111-1111-4111-8111-111111111111";
const ACTOR = "22222222-2222-4222-8222-222222222222";
const ROLE = "33333333-3333-4333-8333-333333333333";
const COMPANY = "44444444-4444-4444-8444-444444444444";
const TEAM = "55555555-5555-4555-8555-555555555555";

function managedRow() {
  return {
    id: EMPLOYEE,
    fullName: "Test",
    agencyId: TEAM,
    departmentId: null,
    companyId: null,
    managerEmployeeId: null,
    agency: { name: "Team", companyId: COMPANY, company: { name: "Co" } },
    department: null,
    company: null,
    manager: null,
    userAccount: {
      loginName: "t",
      state: "ACTIVE",
      roles: [
        {
          scopeType: "TEAM_SET",
          scopeCompanyId: null,
          scopeAgencyIds: [TEAM],
          role: { id: ROLE, key: "ADMIN", name: "Admin" },
        },
      ],
    },
  };
}

function repository(overrides: Record<string, unknown> = {}) {
  const tx = {
    userAccount: {
      findUnique: vi.fn().mockResolvedValue({ id: "acct" }),
      update: vi.fn(),
    },
    role: {
      findMany: vi.fn().mockResolvedValue([{ id: ROLE, key: "ADMIN" }]),
    },
    company: {
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue({ id: COMPANY }),
    },
    agency: { count: vi.fn().mockResolvedValue(1) },
    userRole: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    employee: {
      findUnique: vi.fn().mockResolvedValue(managedRow()),
      findMany: vi.fn().mockResolvedValue([
        { id: EMPLOYEE, managerEmployeeId: null },
        { id: ACTOR, managerEmployeeId: EMPLOYEE },
      ]),
      update: vi.fn().mockResolvedValue({ id: EMPLOYEE }),
    },
    auditLog: { create: vi.fn() },
    ...overrides,
  };
  const prisma = {
    $transaction: async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
  };

  return {
    tx,
    repository: new PrismaManagementRepository(prisma as never),
  };
}

describe("management repository: scoped roles and managers", () => {
  it("stores validated role scopes and audits them", async () => {
    const { tx, repository: repo } = repository();

    const result = await repo.setEmployeeRoleAssignments(
      EMPLOYEE,
      [{ roleId: ROLE, scopeType: "TEAM_SET", scopeAgencyIds: [TEAM] }],
      ACTOR,
    );

    expect(tx.userRole.createMany).toHaveBeenCalledWith({
      data: [
        {
          userAccountId: "acct",
          roleId: ROLE,
          scopeType: "TEAM_SET",
          scopeCompanyId: null,
          scopeAgencyIds: [TEAM],
        },
      ],
    });
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(result.roleAssignments[0]).toMatchObject({
      roleKey: "ADMIN",
      scopeType: "TEAM_SET",
      scopeAgencyIds: [TEAM],
    });
    expect(result.companyId).toBe(COMPANY);
  });

  it("refuses unknown companies, duplicate roles and broken scopes", async () => {
    const unknownCompany = repository({
      company: { count: vi.fn().mockResolvedValue(0) },
    });
    await expect(
      unknownCompany.repository.setEmployeeRoleAssignments(
        EMPLOYEE,
        [{ roleId: ROLE, scopeType: "COMPANY", scopeCompanyId: COMPANY }],
        ACTOR,
      ),
    ).rejects.toThrow("Unknown company");

    const { repository: repo } = repository();
    await expect(
      repo.setEmployeeRoleAssignments(
        EMPLOYEE,
        [
          { roleId: ROLE, scopeType: "PLATFORM" },
          { roleId: ROLE, scopeType: "SELF" },
        ],
        ACTOR,
      ),
    ).rejects.toThrow("once per user");
    await expect(
      repo.setEmployeeRoleAssignments(
        EMPLOYEE,
        [{ roleId: ROLE, scopeType: "TEAM_SET", scopeAgencyIds: [] }],
        ACTOR,
      ),
    ).rejects.toThrow("TEAM_SET");
  });

  it("keeps the legacy role endpoint at platform scope", async () => {
    const { tx, repository: repo } = repository();

    await repo.setEmployeeRoles(EMPLOYEE, [ROLE], ACTOR);

    expect(tx.userRole.createMany).toHaveBeenCalledWith({
      data: [
        {
          userAccountId: "acct",
          roleId: ROLE,
          scopeType: "PLATFORM",
          scopeCompanyId: null,
          scopeAgencyIds: [],
        },
      ],
    });
  });

  it("refuses a manager loop and accepts a valid manager", async () => {
    const { tx, repository: repo } = repository();

    // ACTOR already reports to EMPLOYEE, so EMPLOYEE cannot report to ACTOR.
    await expect(
      repo.updateEmployee(EMPLOYEE, { managerEmployeeId: ACTOR }, ACTOR),
    ).rejects.toThrow("loop");
    await expect(
      repo.updateEmployee(EMPLOYEE, { managerEmployeeId: EMPLOYEE }, ACTOR),
    ).rejects.toThrow("own manager");

    tx.employee.findMany.mockResolvedValue([
      { id: EMPLOYEE, managerEmployeeId: null },
    ]);
    await repo.updateEmployee(EMPLOYEE, { managerEmployeeId: ACTOR }, ACTOR);
    expect(tx.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { managerEmployeeId: ACTOR },
      }),
    );
  });
});
