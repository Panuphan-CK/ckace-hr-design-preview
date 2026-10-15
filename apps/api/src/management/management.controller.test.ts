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
    agencies: vi.fn(),
    createAgency: vi.fn(),
    updateAgency: vi.fn(),
    departments: vi.fn(),
    createDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    entitlements: vi.fn(),
    entitlementOptions: vi.fn(),
    upsertEntitlement: vi.fn(),
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
});
