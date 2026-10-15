import type { ManagedAccountState } from "@ckace/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import { AuthorizationGuard } from "../security/authorization.guard";
import { RequirePermission } from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { ManagementService } from "./management.service";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCOUNT_STATES = new Set<ManagedAccountState>([
  "ACTIVE",
  "PENDING",
  "INACTIVE",
  "RESIGNED",
]);

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Body is required");
  }
  return body as Record<string, unknown>;
}

function requiredText(value: unknown, label: string, max = 250): string {
  if (typeof value !== "string") {
    throw new BadRequestException(label + " is required");
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new BadRequestException(label + " is invalid");
  }
  return normalized;
}

function optionalUuid(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new BadRequestException("Invalid " + label);
  }
  return value;
}

function requiredUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new BadRequestException("Invalid " + label);
  }
  return value;
}

function strictDate(value: unknown, label: string): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(label + " must be YYYY-MM-DD");
  }
  const date = new Date(value + "T00:00:00.000Z");
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException("Invalid " + label);
  }
  return date;
}

function dateRange(
  fromValue: unknown,
  toValue: unknown,
): { from: Date; to: Date } {
  const now = new Date();
  const defaultFrom =
    String(now.getUTCFullYear()).padStart(4, "0") +
    "-" +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    "-01";
  const defaultTo =
    String(now.getUTCFullYear()).padStart(4, "0") +
    "-" +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(
      new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
      ).getUTCDate(),
    ).padStart(2, "0");
  const from = strictDate(fromValue ?? defaultFrom, "from");
  const to = strictDate(toValue ?? defaultTo, "to");
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000);
  if (days < 0 || days > 366) {
    throw new BadRequestException("Date range must be 0-366 days");
  }
  return { from, to };
}

function actorId(request: SecurityRequest): string {
  if (!request.actor) throw new UnauthorizedException();
  return request.actor.employeeId;
}

@Controller("management")
@UseGuards(AuthorizationGuard)
export class ManagementController {
  constructor(
    @Inject(ManagementService)
    private readonly service: ManagementService,
  ) {}

  @Get("calendar")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("calendar.leave.read", "GLOBAL")
  calendar(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
  ) {
    const range = dateRange(from, to);
    return this.service.calendar(range.from, range.to);
  }

  @Get("reports")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("reports.management.read", "GLOBAL")
  reports(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
  ) {
    const range = dateRange(from, to);
    return this.service.reports(range.from, range.to);
  }

  @Get("users")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("users.admin.read", "GLOBAL")
  users() {
    return this.service.employees();
  }

  @Patch("users/:id")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("users.admin.write", "GLOBAL")
  updateUser(
    @Req() request: SecurityRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    requiredUuid(id, "employee ID");
    const value = objectBody(body);
    const fullName =
      value.fullName === undefined
        ? undefined
        : requiredText(value.fullName, "fullName");
    let state: ManagedAccountState | undefined;
    if (value.state !== undefined) {
      if (
        typeof value.state !== "string" ||
        !ACCOUNT_STATES.has(value.state as ManagedAccountState)
      ) {
        throw new BadRequestException("Invalid account state");
      }
      state = value.state as ManagedAccountState;
    }
    const agencyId = optionalUuid(value.agencyId, "agencyId");
    const departmentId = optionalUuid(
      value.departmentId,
      "departmentId",
    );
    if (
      fullName === undefined &&
      state === undefined &&
      agencyId === undefined &&
      departmentId === undefined
    ) {
      throw new BadRequestException("No user fields supplied");
    }
    return this.service.updateEmployee(
      id,
      {
        ...(fullName !== undefined ? { fullName } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(agencyId !== undefined ? { agencyId } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
      },
      actorId(request),
    );
  }

  @Put("users/:id/roles")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("rbac.admin.write", "GLOBAL")
  setUserRoles(
    @Req() request: SecurityRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    requiredUuid(id, "employee ID");
    const value = objectBody(body);
    if (
      !Array.isArray(value.roleIds) ||
      value.roleIds.some(
        (entry) => typeof entry !== "string" || !UUID.test(entry),
      )
    ) {
      throw new BadRequestException("roleIds must be a UUID array");
    }
    return this.service.setEmployeeRoles(
      id,
      value.roleIds as string[],
      actorId(request),
    );
  }

  @Get("agencies")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("organization.admin.read", "GLOBAL")
  agencies() {
    return this.service.agencies();
  }

  @Post("agencies")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("organization.admin.write", "GLOBAL")
  createAgency(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    return this.service.createAgency(
      requiredText(value.name, "name", 200),
      actorId(request),
    );
  }

  @Patch("agencies/:id")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("organization.admin.write", "GLOBAL")
  updateAgency(
    @Req() request: SecurityRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    requiredUuid(id, "agency ID");
    const value = objectBody(body);
    const name =
      value.name === undefined
        ? undefined
        : requiredText(value.name, "name", 200);
    const active =
      value.active === undefined
        ? undefined
        : typeof value.active === "boolean"
          ? value.active
          : (() => {
              throw new BadRequestException("active must be boolean");
            })();
    if (name === undefined && active === undefined) {
      throw new BadRequestException("No agency fields supplied");
    }
    return this.service.updateAgency(
      id,
      {
        ...(name !== undefined ? { name } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      actorId(request),
    );
  }

  @Get("departments")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("organization.admin.read", "GLOBAL")
  departments() {
    return this.service.departments();
  }

  @Post("departments")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("organization.admin.write", "GLOBAL")
  createDepartment(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    return this.service.createDepartment(
      requiredText(value.name, "name", 200),
      actorId(request),
    );
  }

  @Patch("departments/:id")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("organization.admin.write", "GLOBAL")
  updateDepartment(
    @Req() request: SecurityRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    requiredUuid(id, "department ID");
    const value = objectBody(body);
    const name =
      value.name === undefined
        ? undefined
        : requiredText(value.name, "name", 200);
    const active =
      value.active === undefined
        ? undefined
        : typeof value.active === "boolean"
          ? value.active
          : (() => {
              throw new BadRequestException("active must be boolean");
            })();
    if (name === undefined && active === undefined) {
      throw new BadRequestException("No department fields supplied");
    }
    return this.service.updateDepartment(
      id,
      {
        ...(name !== undefined ? { name } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      actorId(request),
    );
  }

  @Get("entitlements")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("leave.entitlements.admin.read", "GLOBAL")
  entitlements() {
    return this.service.entitlements();
  }

  @Get("entitlement-options")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("leave.entitlements.admin.read", "GLOBAL")
  entitlementOptions() {
    return this.service.entitlementOptions();
  }

  @Put("entitlements")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("leave.entitlements.admin.write", "GLOBAL")
  upsertEntitlement(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    const employeeId = requiredUuid(
      value.employeeId,
      "employeeId",
    );
    const leaveTypeId = requiredUuid(
      value.leaveTypeId,
      "leaveTypeId",
    );
    const quota =
      typeof value.quota === "number" || typeof value.quota === "string"
        ? String(value.quota).trim()
        : "";
    if (!/^\d+(?:\.\d{1,2})?$/.test(quota) || Number(quota) < 0) {
      throw new BadRequestException("Invalid quota");
    }
    const validFrom =
      value.validFrom === undefined ||
      value.validFrom === null ||
      value.validFrom === ""
        ? null
        : strictDate(value.validFrom, "validFrom");
    const validTo =
      value.validTo === undefined ||
      value.validTo === null ||
      value.validTo === ""
        ? null
        : strictDate(value.validTo, "validTo");
    if (validFrom && validTo && validFrom > validTo) {
      throw new BadRequestException("validFrom must not exceed validTo");
    }
    return this.service.upsertEntitlement(
      { employeeId, leaveTypeId, quota, validFrom, validTo },
      actorId(request),
    );
  }

  @Get("work-calendar")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("work_calendar.admin.read", "GLOBAL")
  workCalendar() {
    return this.service.workCalendar();
  }

  @Put("holidays")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("work_calendar.admin.write", "GLOBAL")
  upsertHoliday(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    const id =
      value.id === undefined
        ? undefined
        : requiredUuid(value.id, "holiday ID");
    const holidayDate = strictDate(
      value.holidayDate,
      "holidayDate",
    );
    const description = requiredText(
      value.description,
      "description",
      250,
    );
    const active =
      value.active === undefined
        ? true
        : typeof value.active === "boolean"
          ? value.active
          : (() => {
              throw new BadRequestException("active must be boolean");
            })();
    return this.service.upsertHoliday(
      {
        ...(id ? { id } : {}),
        holidayDate,
        description,
        active,
      },
      actorId(request),
    );
  }

  @Put("weekly-workdays/:isoWeekday")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("work_calendar.admin.write", "GLOBAL")
  setWeeklyWorkday(
    @Req() request: SecurityRequest,
    @Param("isoWeekday") rawWeekday: string,
    @Body() body: unknown,
  ) {
    const isoWeekday = Number(rawWeekday);
    if (!Number.isInteger(isoWeekday) || isoWeekday < 1 || isoWeekday > 7) {
      throw new BadRequestException("isoWeekday must be 1-7");
    }
    const value = objectBody(body);
    if (typeof value.isWorking !== "boolean") {
      throw new BadRequestException("isWorking must be boolean");
    }
    return this.service.setWeeklyWorkday(
      isoWeekday,
      value.isWorking,
      actorId(request),
    );
  }

  @Get("rbac")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("rbac.admin.read", "GLOBAL")
  rbac() {
    return this.service.rbac();
  }

  @Put("roles/:id/permissions")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("rbac.admin.write", "GLOBAL")
  setRolePermissions(
    @Req() request: SecurityRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    requiredUuid(id, "role ID");
    const value = objectBody(body);
    if (
      !Array.isArray(value.permissions) ||
      value.permissions.some(
        (entry) => typeof entry !== "string" || !entry.trim(),
      )
    ) {
      throw new BadRequestException(
        "permissions must be a string array",
      );
    }
    return this.service.setRolePermissions(
      id,
      value.permissions.map((entry) => String(entry).trim()),
      actorId(request),
    );
  }
}
