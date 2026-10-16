import "reflect-metadata";

import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { MODULE_ROUTE_KEY_METADATA } from "../routing/module-route.decorator";
import { REQUIRE_PERMISSION_KEY } from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { ManagementController } from "./management.controller";
import type { ManagementService } from "./management.service";

const EMPLOYEE_ID = "11111111-1111-4111-8111-111111111111";
const ROLE_ID = "22222222-2222-4222-8222-222222222222";

function createService() {
  return {
    calendar: vi.fn(),
    reports: vi.fn(),
    employees: vi.fn(),
    updateEmployee: vi.fn(),
    setEmployeeRoles: vi.fn(),
    setEmployeeRoleAssignments: vi.fn(),
    companies: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
    agencies: vi.fn(),
    createAgency: vi.fn(),
    updateAgency: vi.fn(),
    departments: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    entitlements: vi.fn(),
    entitlementOptions: vi.fn(),
    upsertEntitlement: vi.fn(),
    generateVacationEntitlements: vi.fn(),
    overtimeReport: vi.fn(),
    professionalRoles: vi.fn(),
    approvalPolicies: vi.fn(),
    saveApprovalPolicy: vi.fn(),
    createProfessionalRole: vi.fn(),
    updateProfessionalRole: vi.fn(),
    setEmployeeProfessionalRoles: vi.fn(),
    workCalendar: vi.fn(),
    upsertHoliday: vi.fn(),
    setWeeklyWorkday: vi.fn(),
    rbac: vi.fn(),
    setRolePermissions: vi.fn(),
  };
}

function controller() {
  const service = createService();
  return {
    service,
    controller: new ManagementController(
      service as unknown as ManagementService,
    ),
  };
}

function actorRequest(): SecurityRequest {
  return {
    actor: {
      employeeId: EMPLOYEE_ID,
      legacyUid: null,
      roles: ["SUPERADMIN"],
      permissions: [
        "calendar.leave.read",
        "reports.management.read",
        "users.admin.read",
        "users.admin.write",
        "organization.admin.read",
        "organization.admin.write",
        "leave.entitlements.admin.read",
        "leave.entitlements.admin.write",
        "work_calendar.admin.read",
        "work_calendar.admin.write",
        "rbac.admin.read",
        "rbac.admin.write",
      ],
      agencyId: null,
      departmentId: null,
      authenticatedBy: "PROJECT_B_WEB",
      correlationId: "task39-5-management-test",
    },
  };
}

describe("ManagementController", () => {
  it.each([
    ["calendar", "calendar.leave.read", "ADMIN_READ"],
    ["reports", "reports.management.read", "ADMIN_READ"],
    ["users", "users.admin.read", "ADMIN_READ"],
    ["updateUser", "users.admin.write", "ADMIN_WRITE"],
    ["setUserRoles", "rbac.admin.write", "ADMIN_WRITE"],
    ["setUserRoleAssignments", "rbac.admin.write", "ADMIN_WRITE"],
    ["companies", "organization.admin.read", "ADMIN_READ"],
    ["createCompany", "organization.admin.write", "ADMIN_WRITE"],
    ["updateCompany", "organization.admin.write", "ADMIN_WRITE"],
    ["agencies", "organization.admin.read", "ADMIN_READ"],
    ["createAgency", "organization.admin.write", "ADMIN_WRITE"],
    ["updateAgency", "organization.admin.write", "ADMIN_WRITE"],
    ["departments", "organization.admin.read", "ADMIN_READ"],
    ["createDepartment", "organization.admin.write", "ADMIN_WRITE"],
    ["updateDepartment", "organization.admin.write", "ADMIN_WRITE"],
    ["entitlements", "leave.entitlements.admin.read", "ADMIN_READ"],
    [
      "entitlementOptions",
      "leave.entitlements.admin.read",
      "ADMIN_READ",
    ],
    [
      "upsertEntitlement",
      "leave.entitlements.admin.write",
      "ADMIN_WRITE",
    ],
    ["overtimeReport", "reports.management.read", "ADMIN_READ"],
    ["professionalRoles", "users.admin.read", "ADMIN_READ"],
    ["approvalPolicies", "rbac.admin.read", "ADMIN_READ"],
    ["saveApprovalPolicy", "rbac.admin.write", "ADMIN_WRITE"],
    ["createProfessionalRole", "users.admin.write", "ADMIN_WRITE"],
    ["updateProfessionalRole", "users.admin.write", "ADMIN_WRITE"],
    ["setUserProfessionalRoles", "users.admin.write", "ADMIN_WRITE"],
    [
      "generateVacationEntitlements",
      "leave.entitlements.admin.write",
      "ADMIN_WRITE",
    ],
    ["workCalendar", "work_calendar.admin.read", "ADMIN_READ"],
    ["upsertHoliday", "work_calendar.admin.write", "ADMIN_WRITE"],
    [
      "setWeeklyWorkday",
      "work_calendar.admin.write",
      "ADMIN_WRITE",
    ],
    ["rbac", "rbac.admin.read", "ADMIN_READ"],
    ["setRolePermissions", "rbac.admin.write", "ADMIN_WRITE"],
  ] as const)(
    "%s keeps narrow permission %s on %s",
    (method, permission, routeKey) => {
      const handler =
        ManagementController.prototype[
          method as keyof ManagementController
        ] as unknown as object;
      expect(
        Reflect.getMetadata(REQUIRE_PERMISSION_KEY, handler),
      ).toEqual({ permission, scope: "GLOBAL" });
      expect(
        Reflect.getMetadata(MODULE_ROUTE_KEY_METADATA, handler),
      ).toBe(routeKey);
    },
  );

  it("rejects invalid and oversized date ranges", () => {
    const { controller: value } = controller();

    expect(() =>
      value.calendar("2026-02-30", "2026-03-01"),
    ).toThrow(BadRequestException);
    expect(() =>
      value.reports("2026-01-01", "2027-01-03"),
    ).toThrow(BadRequestException);
  });

  it("fails closed on no-op user and organization updates", () => {
    const { controller: value } = controller();

    expect(() =>
      value.updateUser(
        actorRequest(),
        EMPLOYEE_ID,
        {},
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      value.updateAgency(
        actorRequest(),
        ROLE_ID,
        {},
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      value.updateDepartment(
        actorRequest(),
        ROLE_ID,
        {},
      ),
    ).toThrow(BadRequestException);
  });

  it("validates role IDs and delegates role assignment with server actor", async () => {
    const { controller: value, service } = controller();
    service.setEmployeeRoles.mockResolvedValue({});

    expect(() =>
      value.setUserRoles(
        actorRequest(),
        EMPLOYEE_ID,
        { roleIds: ["not-a-uuid"] },
      ),
    ).toThrow(BadRequestException);

    await value.setUserRoles(
      actorRequest(),
      EMPLOYEE_ID,
      { roleIds: [ROLE_ID, ROLE_ID] },
    );

    expect(service.setEmployeeRoles).toHaveBeenCalledWith(
      EMPLOYEE_ID,
      [ROLE_ID, ROLE_ID],
      EMPLOYEE_ID,
    );
  });

  it("validates entitlement dates and weekly workday input", () => {
    const { controller: value } = controller();

    expect(() =>
      value.upsertEntitlement(actorRequest(), {
        employeeId: EMPLOYEE_ID,
        leaveTypeId: ROLE_ID,
        quota: "1.234",
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      value.setWeeklyWorkday(
        actorRequest(),
        "8",
        { isWorking: true },
      ),
    ).toThrow(BadRequestException);
  });

  it("delegates scoped role assignments and validates their shape", async () => {
    const { controller: value, service } = controller();
    service.setEmployeeRoleAssignments.mockResolvedValue({});
    const TEAM_ID = "33333333-3333-4333-8333-333333333333";
    const COMPANY_ID = "44444444-4444-4444-8444-444444444444";

    expect(() =>
      value.setUserRoleAssignments(actorRequest(), EMPLOYEE_ID, {
        assignments: [{ roleId: ROLE_ID, scopeType: "GALAXY" }],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      value.setUserRoleAssignments(actorRequest(), EMPLOYEE_ID, {
        assignments: [
          { roleId: ROLE_ID, scopeType: "TEAM_SET", scopeAgencyIds: ["x"] },
        ],
      }),
    ).toThrow(BadRequestException);

    await value.setUserRoleAssignments(actorRequest(), EMPLOYEE_ID, {
      assignments: [
        { roleId: ROLE_ID, scopeType: "TEAM_SET", scopeAgencyIds: [TEAM_ID] },
      ],
    });
    await value.setUserRoleAssignments(actorRequest(), EMPLOYEE_ID, {
      assignments: [
        { roleId: ROLE_ID, scopeType: "COMPANY", scopeCompanyId: COMPANY_ID },
      ],
    });

    expect(service.setEmployeeRoleAssignments).toHaveBeenNthCalledWith(
      1,
      EMPLOYEE_ID,
      [
        {
          roleId: ROLE_ID,
          scopeType: "TEAM_SET",
          scopeCompanyId: null,
          scopeAgencyIds: [TEAM_ID],
        },
      ],
      EMPLOYEE_ID,
    );
    expect(service.setEmployeeRoleAssignments).toHaveBeenNthCalledWith(
      2,
      EMPLOYEE_ID,
      [
        {
          roleId: ROLE_ID,
          scopeType: "COMPANY",
          scopeCompanyId: COMPANY_ID,
          scopeAgencyIds: [],
        },
      ],
      EMPLOYEE_ID,
    );
  });

  it("creates and updates companies with validated input", async () => {
    const { controller: value, service } = controller();
    service.createCompany.mockResolvedValue({});
    service.updateCompany.mockResolvedValue({});

    expect(() =>
      value.createCompany(actorRequest(), { name: "  " }),
    ).toThrow(BadRequestException);
    expect(() =>
      value.updateCompany(actorRequest(), ROLE_ID, {}),
    ).toThrow(BadRequestException);

    await value.createCompany(actorRequest(), { name: " สำนักงานบัญชี " });
    await value.updateCompany(actorRequest(), ROLE_ID, { active: false });

    expect(service.createCompany).toHaveBeenCalledWith(
      "สำนักงานบัญชี",
      EMPLOYEE_ID,
    );
    expect(service.updateCompany).toHaveBeenCalledWith(
      ROLE_ID,
      { active: false },
      EMPLOYEE_ID,
    );
  });

  it("validates the per-employee approval route mode", async () => {
    const { controller: value, service } = controller();
    service.updateEmployee.mockResolvedValue({});

    expect(() =>
      value.updateUser(actorRequest(), EMPLOYEE_ID, {
        approvalRouteMode: "SOMETHING",
      }),
    ).toThrow(BadRequestException);

    await value.updateUser(actorRequest(), EMPLOYEE_ID, {
      approvalRouteMode: "MANAGER_FIRST",
    });
    expect(service.updateEmployee).toHaveBeenCalledWith(
      EMPLOYEE_ID,
      { approvalRouteMode: "MANAGER_FIRST" },
      EMPLOYEE_ID,
    );
  });

  it("accepts a manager and company on user updates and company on agencies", async () => {
    const { controller: value, service } = controller();
    service.updateEmployee.mockResolvedValue({});
    service.updateAgency.mockResolvedValue({});

    await value.updateUser(actorRequest(), EMPLOYEE_ID, {
      managerEmployeeId: ROLE_ID,
      companyId: null,
    });
    await value.updateAgency(actorRequest(), ROLE_ID, {
      companyId: EMPLOYEE_ID,
    });

    expect(service.updateEmployee).toHaveBeenCalledWith(
      EMPLOYEE_ID,
      { managerEmployeeId: ROLE_ID, companyId: null },
      EMPLOYEE_ID,
    );
    expect(service.updateAgency).toHaveBeenCalledWith(
      ROLE_ID,
      { companyId: EMPLOYEE_ID },
      EMPLOYEE_ID,
    );
  });
});
