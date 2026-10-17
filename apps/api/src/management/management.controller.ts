import type {
  ManagedAccountState,
  RoleScopeKind,
} from "@ckace/contracts";
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
  StreamableFile,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import { AuthorizationGuard } from "../security/authorization.guard";
import { RequirePermission } from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { ManagementService } from "./management.service";
import { buildOvertimeWorkbook } from "./overtime-report-workbook";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCOUNT_STATES = new Set<ManagedAccountState>([
  "ACTIVE",
  "PENDING",
  "INACTIVE",
  "RESIGNED",
]);

const ROLE_SCOPES = new Set<RoleScopeKind>([
  "PLATFORM",
  "COMPANY",
  "TEAM_SET",
  "SELF",
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

const REPORT_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);

function parseReportStatus(
  value: string | undefined,
): "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | null {
  if (value === undefined || value === "") return null;
  if (!REPORT_STATUSES.has(value)) {
    throw new BadRequestException("Invalid status");
  }
  return value as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
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

  @Get("reports/missing-checkouts")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("reports.management.read", "GLOBAL")
  missingCheckOuts(
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
  ) {
    const range = dateRange(from, to);
    return this.service.missingCheckOuts(range.from, range.to);
  }

  @Get("reports/overtime.xlsx")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("reports.management.read", "GLOBAL")
  async overtimeReport(
    @Req() request: SecurityRequest,
    @Query("from") from: string | undefined,
    @Query("to") to: string | undefined,
    @Query("companyId") companyId: string | undefined,
    @Query("agencyId") agencyId: string | undefined,
    @Query("employeeId") employeeId: string | undefined,
    @Query("status") status: string | undefined,
  ): Promise<StreamableFile> {
    const range = dateRange(from, to);
    const filters = {
      from: range.from,
      to: range.to,
      companyId: optionalUuid(companyId, "companyId") ?? null,
      agencyId: optionalUuid(agencyId, "agencyId") ?? null,
      employeeId: optionalUuid(employeeId, "employeeId") ?? null,
      status: parseReportStatus(status),
    };
    const rows = await this.service.overtimeReport(filters, actorId(request));
    const workbook = await buildOvertimeWorkbook(rows, {
      from: range.from.toISOString().slice(0, 10),
      to: range.to.toISOString().slice(0, 10),
    });
    return new StreamableFile(workbook, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      disposition: `attachment; filename="overtime-${filters.from.toISOString().slice(0, 10)}_${filters.to.toISOString().slice(0, 10)}.xlsx"`,
    });
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
    const companyId = optionalUuid(value.companyId, "companyId");
    const managerEmployeeId = optionalUuid(
      value.managerEmployeeId,
      "managerEmployeeId",
    );
    let overtimeTransportSatang: number | undefined;
    if (value.overtimeTransportSatang !== undefined) {
      const amount = value.overtimeTransportSatang;
      if (
        typeof amount !== "number" ||
        !Number.isInteger(amount) ||
        amount < 0 ||
        amount > 10_000_000
      ) {
        throw new BadRequestException("Invalid overtimeTransportSatang");
      }
      overtimeTransportSatang = amount;
    }
    let attendanceExempt: boolean | undefined;
    if (value.attendanceExempt !== undefined) {
      if (typeof value.attendanceExempt !== "boolean") {
        throw new BadRequestException("Invalid attendanceExempt");
      }
      attendanceExempt = value.attendanceExempt;
    }
    let approvalRouteMode: "STANDARD" | "MANAGER_FIRST" | undefined;
    if (value.approvalRouteMode !== undefined) {
      if (
        value.approvalRouteMode !== "STANDARD" &&
        value.approvalRouteMode !== "MANAGER_FIRST"
      ) {
        throw new BadRequestException("Invalid approvalRouteMode");
      }
      approvalRouteMode = value.approvalRouteMode;
    }
    if (
      fullName === undefined &&
      state === undefined &&
      agencyId === undefined &&
      departmentId === undefined &&
      companyId === undefined &&
      managerEmployeeId === undefined &&
      approvalRouteMode === undefined &&
      overtimeTransportSatang === undefined &&
      attendanceExempt === undefined
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
        ...(companyId !== undefined ? { companyId } : {}),
        ...(managerEmployeeId !== undefined ? { managerEmployeeId } : {}),
        ...(approvalRouteMode !== undefined ? { approvalRouteMode } : {}),
        ...(overtimeTransportSatang !== undefined ? { overtimeTransportSatang } : {}),
        ...(attendanceExempt !== undefined ? { attendanceExempt } : {}),
      },
      actorId(request),
    );
  }

  @Put("users/:id/role-assignments")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("rbac.admin.write", "GLOBAL")
  setUserRoleAssignments(
    @Req() request: SecurityRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    requiredUuid(id, "employee ID");
    const value = objectBody(body);
    if (!Array.isArray(value.assignments) || value.assignments.length > 20) {
      throw new BadRequestException("assignments must be an array of up to 20");
    }
    const assignments = value.assignments.map((entry: unknown) => {
      const item = objectBody(entry);
      const scopeType = item.scopeType;
      if (
        typeof scopeType !== "string" ||
        !ROLE_SCOPES.has(scopeType as RoleScopeKind)
      ) {
        throw new BadRequestException("Invalid scopeType");
      }
      const scopeAgencyIds = item.scopeAgencyIds;
      if (
        scopeAgencyIds !== undefined &&
        (!Array.isArray(scopeAgencyIds) ||
          scopeAgencyIds.some(
            (agency) => typeof agency !== "string" || !UUID.test(agency),
          ))
      ) {
        throw new BadRequestException("scopeAgencyIds must be a UUID array");
      }
      return {
        roleId: requiredUuid(item.roleId, "roleId"),
        scopeType: scopeType as RoleScopeKind,
        scopeCompanyId:
          optionalUuid(item.scopeCompanyId, "scopeCompanyId") ?? null,
        scopeAgencyIds: (scopeAgencyIds as string[] | undefined) ?? [],
      };
    });
    return this.service.setEmployeeRoleAssignments(
      id,
      assignments,
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

  @Get("overtime-allowance-policies")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("organization.admin.read", "GLOBAL")
  overtimeAllowancePolicies() {
    return this.service.overtimeAllowancePolicies();
  }

  @Put("overtime-allowance-policies")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("organization.admin.write", "GLOBAL")
  saveOvertimeAllowancePolicy(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    if (value.kind !== "MEAL" && value.kind !== "TRANSPORT") {
      throw new BadRequestException("Invalid kind");
    }
    const amount = value.amountSatang;
    if (
      typeof amount !== "number" ||
      !Number.isInteger(amount) ||
      amount < 0 ||
      amount > 10_000_000
    ) {
      throw new BadRequestException("Invalid amountSatang");
    }
    if (
      typeof value.paidWhenEndsAtOrAfter !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.paidWhenEndsAtOrAfter)
    ) {
      throw new BadRequestException("paidWhenEndsAtOrAfter must use HH:mm");
    }
    if (typeof value.active !== "boolean") {
      throw new BadRequestException("active must be boolean");
    }
    return this.service.saveOvertimeAllowancePolicy(
      {
        kind: value.kind,
        amountSatang: amount,
        paidWhenEndsAtOrAfter: value.paidWhenEndsAtOrAfter,
        active: value.active,
      },
      actorId(request),
    );
  }

  @Get("medical-policy")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("organization.admin.read", "GLOBAL")
  medicalPolicy() {
    return this.service.medicalPolicy();
  }

  @Put("medical-policy")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("organization.admin.write", "GLOBAL")
  saveMedicalPolicy(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    const annualLimit = value.annualLimit;
    const perClaimLimit = value.perClaimLimit;
    if (
      typeof annualLimit !== "number" ||
      typeof perClaimLimit !== "number" ||
      !(annualLimit > 0) ||
      !(perClaimLimit > 0) ||
      annualLimit > 10_000_000 ||
      perClaimLimit > annualLimit
    ) {
      throw new BadRequestException("Invalid medical limits");
    }
    const rawRoles = value.autoApproveRoleKeys;
    const allowedRoles = ["SUPERUSER", "ADMIN", "SUPERADMIN"];
    if (
      rawRoles !== undefined &&
      (!Array.isArray(rawRoles) ||
        rawRoles.some((role) => typeof role !== "string" || !allowedRoles.includes(role.trim().toUpperCase())))
    ) {
      throw new BadRequestException("Invalid auto-approval roles");
    }
    // Omitted keeps the previous default (ADMIN, SUPERADMIN); an empty list turns auto-approval off.
    const autoApproveRoleKeys = (rawRoles as string[] | undefined) ?? ["ADMIN", "SUPERADMIN"];
    return this.service.saveMedicalPolicy({ annualLimit, perClaimLimit, autoApproveRoleKeys }, actorId(request));
  }

  @Get("attendance-policy")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("organization.admin.read", "GLOBAL")
  attendancePolicy() {
    return this.service.attendancePolicy();
  }

  @Put("attendance-policy")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("organization.admin.write", "GLOBAL")
  saveAttendancePolicy(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    const clock = (raw: unknown, label: string): string => {
      if (typeof raw !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
        throw new BadRequestException(label + " must use HH:mm");
      }
      return raw;
    };
    const optionalClock = (raw: unknown, label: string): string | null =>
      raw === undefined || raw === null || raw === "" ? null : clock(raw, label);
    const number = (raw: unknown, label: string): number => {
      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        throw new BadRequestException(label + " must be a number");
      }
      return raw;
    };
    return this.service.saveAttendancePolicy(
      {
        name: requiredText(value.name, "name", 120),
        officeLatitude: number(value.officeLatitude, "officeLatitude"),
        officeLongitude: number(value.officeLongitude, "officeLongitude"),
        radiusKm: number(value.radiusKm, "radiusKm"),
        lateAfter: clock(value.lateAfter, "lateAfter"),
        workStart: clock(value.workStart, "workStart"),
        workEnd: clock(value.workEnd, "workEnd"),
        breakStart: optionalClock(value.breakStart, "breakStart"),
        breakEnd: optionalClock(value.breakEnd, "breakEnd"),
      },
      actorId(request),
    ).catch((error: unknown) => {
      throw new BadRequestException(error instanceof Error ? error.message : "Invalid attendance policy");
    });
  }

  @Get("approval-policies")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("rbac.admin.read", "GLOBAL")
  approvalPolicies() {
    return this.service.approvalPolicies();
  }

  @Put("approval-policies")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("rbac.admin.write", "GLOBAL")
  saveApprovalPolicy(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    const kinds = ["LEAVE", "TIME_CORRECTION", "OVERTIME", "MEDICAL"] as const;
    const scopes = ["SAME_AGENCY", "SAME_DEPARTMENT", "GLOBAL"] as const;
    const requestKind = kinds.find((kind) => kind === value.requestKind);
    if (!requestKind) throw new BadRequestException("Invalid requestKind");
    if (typeof value.active !== "boolean") {
      throw new BadRequestException("active must be boolean");
    }
    if (!Array.isArray(value.steps) || value.steps.length < 1 || value.steps.length > 5) {
      throw new BadRequestException("steps must contain 1 to 5 items");
    }
    const steps = value.steps.map((raw: unknown) => {
      const step = objectBody(raw);
      const scope = scopes.find((item) => item === step.scope);
      if (!scope) throw new BadRequestException("Invalid step scope");
      return {
        roleKey: requiredText(step.roleKey, "roleKey", 60).toUpperCase(),
        scope,
      };
    });
    return this.service.saveApprovalPolicy(
      {
        requestKind,
        agencyId: optionalUuid(value.agencyId, "agencyId") ?? null,
        name: requiredText(value.name, "name", 200),
        active: value.active,
        steps,
      },
      actorId(request),
    );
  }

  @Get("professional-roles")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("users.admin.read", "GLOBAL")
  professionalRoles() {
    return this.service.professionalRoles();
  }

  @Post("professional-roles")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("users.admin.write", "GLOBAL")
  createProfessionalRole(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    const key = requiredText(value.key, "key", 40)
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_");
    if (value.attendanceExempt !== undefined && typeof value.attendanceExempt !== "boolean") {
      throw new BadRequestException("attendanceExempt must be boolean");
    }
    return this.service.createProfessionalRole(
      {
        key,
        name: requiredText(value.name, "name", 100),
        attendanceExempt: value.attendanceExempt === true,
      },
      actorId(request),
    );
  }

  @Patch("professional-roles/:id")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("users.admin.write", "GLOBAL")
  updateProfessionalRole(
    @Req() request: SecurityRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    requiredUuid(id, "professional role ID");
    const value = objectBody(body);
    for (const flag of ["attendanceExempt", "active"] as const) {
      if (value[flag] !== undefined && typeof value[flag] !== "boolean") {
        throw new BadRequestException(flag + " must be boolean");
      }
    }
    const name =
      value.name === undefined ? undefined : requiredText(value.name, "name", 100);
    const attendanceExempt = value.attendanceExempt as boolean | undefined;
    const active = value.active as boolean | undefined;
    if (name === undefined && attendanceExempt === undefined && active === undefined) {
      throw new BadRequestException("No professional role fields supplied");
    }
    return this.service.updateProfessionalRole(
      id,
      {
        ...(name !== undefined ? { name } : {}),
        ...(attendanceExempt !== undefined ? { attendanceExempt } : {}),
        ...(active !== undefined ? { active } : {}),
      },
      actorId(request),
    );
  }

  @Put("users/:id/professional-roles")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("users.admin.write", "GLOBAL")
  setUserProfessionalRoles(
    @Req() request: SecurityRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    requiredUuid(id, "employee ID");
    const value = objectBody(body);
    if (!Array.isArray(value.professionalRoleIds) || value.professionalRoleIds.length > 20) {
      throw new BadRequestException("professionalRoleIds must be a list of up to 20 IDs");
    }
    const ids = value.professionalRoleIds.map((item) =>
      requiredUuid(item, "professional role ID"),
    );
    return this.service.setEmployeeProfessionalRoles(id, ids, actorId(request));
  }

  @Get("companies")
  @ModuleRoute("ADMIN_READ")
  @RequirePermission("organization.admin.read", "GLOBAL")
  companies() {
    return this.service.companies();
  }

  @Post("companies")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("organization.admin.write", "GLOBAL")
  createCompany(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    return this.service.createCompany(
      requiredText(value.name, "name", 200),
      actorId(request),
    );
  }

  @Patch("companies/:id")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("organization.admin.write", "GLOBAL")
  updateCompany(
    @Req() request: SecurityRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    requiredUuid(id, "company ID");
    const value = objectBody(body);
    const name =
      value.name === undefined
        ? undefined
        : requiredText(value.name, "name", 200);
    if (value.active !== undefined && typeof value.active !== "boolean") {
      throw new BadRequestException("active must be boolean");
    }
    const active = value.active as boolean | undefined;
    if (name === undefined && active === undefined) {
      throw new BadRequestException("No company fields supplied");
    }
    return this.service.updateCompany(
      id,
      {
        ...(name !== undefined ? { name } : {}),
        ...(active !== undefined ? { active } : {}),
      },
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
    const companyId = optionalUuid(value.companyId, "companyId");
    if (
      name === undefined &&
      active === undefined &&
      companyId === undefined
    ) {
      throw new BadRequestException("No agency fields supplied");
    }
    return this.service.updateAgency(
      id,
      {
        ...(name !== undefined ? { name } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(companyId !== undefined ? { companyId } : {}),
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

  @Post("entitlements/generate-vacation")
  @ModuleRoute("ADMIN_WRITE")
  @RequirePermission("leave.entitlements.admin.write", "GLOBAL")
  generateVacationEntitlements(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ) {
    const value = objectBody(body);
    const year = value.year;
    if (
      typeof year !== "number" ||
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100
    ) {
      throw new BadRequestException("Invalid year");
    }
    return this.service.generateVacationEntitlements(year, actorId(request));
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
