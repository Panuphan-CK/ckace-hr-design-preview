"use client";

import type {
  LeaveEntitlementAdminItem,
  LeaveEntitlementOptions,
  ManagedEmployeeItem,
  OrganizationUnitItem,
  PasswordRecoveryIssueResult,
  RbacAdminView,
  RolePermissionAdminItem,
  WorkCalendarAdminView,
} from "@ckace/contracts";
import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

interface ManagementCapabilities {
  readonly usersAdminWrite: boolean;
  readonly organizationAdminWrite: boolean;
  readonly entitlementAdminWrite: boolean;
  readonly workCalendarAdminWrite: boolean;
  readonly rbacAdminWrite: boolean;
  readonly passwordRecoveryAdmin: boolean;
}

interface SessionPayload {
  readonly navigation: ManagementCapabilities;
}

interface AdminData {
  readonly users: readonly ManagedEmployeeItem[] | null;
  readonly companies: readonly OrganizationUnitItem[] | null;
  readonly agencies: readonly OrganizationUnitItem[] | null;
  readonly departments: readonly OrganizationUnitItem[] | null;
  readonly entitlements: readonly LeaveEntitlementAdminItem[] | null;
  readonly entitlementOptions: LeaveEntitlementOptions | null;
  readonly workCalendar: WorkCalendarAdminView | null;
  readonly rbac: RbacAdminView | null;
}

type State =
  | { status: "loading" }
  | {
      status: "ready";
      data: AdminData;
      capabilities: ManagementCapabilities;
    }
  | { status: "error"; message: string };

type Message = { kind: "success" | "error"; text: string };

type ManagementSection =
  | "users"
  | "organization"
  | "companies"
  | "agencies"
  | "departments"
  | "entitlements"
  | "work-calendar"
  | "holidays"
  | "workdays"
  | "roles";

const MANAGEMENT_SECTION_LABEL: Readonly<Record<ManagementSection, string>> = {
  users: "ฐานข้อมูลพนักงาน",
  organization: "โครงสร้างและสังกัด",
  companies: "จัดการบริษัท",
  agencies: "จัดการหน่วยงาน",
  departments: "จัดการฝ่าย",
  entitlements: "สิทธิวันลาพนักงาน",
  "work-calendar": "วันหยุดและวันทำงาน",
  holidays: "จัดการวันหยุดประจำปี",
  workdays: "จัดการวันทำงาน",
  roles: "สิทธิ์และการเข้าถึง",
};

const WEEKDAY = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
] as const;

function sectionFromHash(): ManagementSection {
  const value =
    typeof window === "undefined" ? "" : window.location.hash.slice(1);
  return Object.prototype.hasOwnProperty.call(
    MANAGEMENT_SECTION_LABEL,
    value,
  )
    ? (value as ManagementSection)
    : "users";
}

function containsSearch(values: readonly (string | null | undefined)[], query: string) {
  if (!query) return true;
  const normalized = query.toLocaleLowerCase("th");
  return values.some((value) =>
    String(value ?? "")
      .toLocaleLowerCase("th")
      .includes(normalized),
  );
}

async function readOptional<T>(path: string): Promise<T | null> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.status === 403) return null;
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่"
        : "ไม่สามารถโหลดข้อมูลผู้ดูแลระบบได้",
    );
  }
  return (await response.json()) as T;
}

async function mutate<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT",
  body?: unknown,
): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: "same-origin",
  };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(path, init);
  if (!response.ok) {
    const fallback =
      response.status === 403
        ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ"
        : response.status === 409
          ? "ข้อมูลมีการเปลี่ยนแปลงหรือรายการนี้ดำเนินการไม่ได้"
          : response.status === 503
            ? "บริการนี้ยังไม่พร้อมใช้งาน"
            : "บันทึกข้อมูลไม่สำเร็จ";
    throw new Error(fallback);
  }
  return (await response.json()) as T;
}

function accountStateLabel(state: ManagedEmployeeItem["state"]): string {
  if (state === "ACTIVE") return "Active";
  if (state === "PENDING") return "รออนุมัติ";
  if (state === "RESIGNED") return "พ้นสภาพ";
  if (state === "INACTIVE") return "ไม่ใช้งาน";
  return "ไม่ระบุ";
}

function accountStateClass(state: ManagedEmployeeItem["state"]): string {
  if (state === "ACTIVE") return "status-approved";
  if (state === "PENDING") return "status-pending";
  return "status-rejected";
}

function compactId(id: string): string {
  return id.length > 12 ? id.slice(0, 8) + "…" : id;
}

export default function DesktopManagementPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] =
    useState<ManagementSection>("users");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const syncSection = () => {
      setSelectedSection(sectionFromHash());
      setSearch("");
      setResetLink(null);
    };
    syncSection();
    window.addEventListener("hashchange", syncSection);
    return () => window.removeEventListener("hashchange", syncSection);
  }, []);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setMessage(null);
    try {
      const [
        sessionResponse,
        users,
        companies,
        agencies,
        departments,
        entitlements,
        entitlementOptions,
        workCalendar,
        rbac,
      ] = await Promise.all([
        fetch("/api/security/session", {
          credentials: "same-origin",
          cache: "no-store",
        }),
        readOptional<readonly ManagedEmployeeItem[]>("/api/management/users"),
        readOptional<readonly OrganizationUnitItem[]>("/api/management/companies"),
        readOptional<readonly OrganizationUnitItem[]>("/api/management/agencies"),
        readOptional<readonly OrganizationUnitItem[]>("/api/management/departments"),
        readOptional<readonly LeaveEntitlementAdminItem[]>("/api/management/entitlements"),
        readOptional<LeaveEntitlementOptions>("/api/management/entitlement-options"),
        readOptional<WorkCalendarAdminView>("/api/management/work-calendar"),
        readOptional<RbacAdminView>("/api/management/rbac"),
      ]);
      if (!sessionResponse.ok) {
        throw new Error(
          sessionResponse.status === 401
            ? "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่"
            : "ไม่สามารถตรวจสอบสิทธิ์ผู้ดูแลระบบได้",
        );
      }
      const session = (await sessionResponse.json()) as SessionPayload;
      setState({
        status: "ready",
        data: {
          users,
          companies,
          agencies,
          departments,
          entitlements,
          entitlementOptions,
          workCalendar,
          rbac,
        },
        capabilities: session.navigation,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลผู้ดูแลระบบได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(
    key: string,
    action: () => Promise<unknown>,
    success: string,
  ) {
    if (busy) return;
    setBusy(key);
    setMessage(null);
    try {
      await action();
      setMessage({ kind: "success", text: success });
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ",
      });
    } finally {
      setBusy(null);
    }
  }

  async function updateUser(
    event: FormEvent<HTMLFormElement>,
    employeeId: string,
  ) {
    event.preventDefault();
    if (state.status !== "ready" || !state.capabilities.usersAdminWrite) return;
    const data = new FormData(event.currentTarget);
    await run(
      "user-" + employeeId,
      () =>
        mutate(
          "/api/management/users/" + encodeURIComponent(employeeId),
          "PATCH",
          {
            state: String(data.get("state") ?? ""),
            agencyId: String(data.get("agencyId") ?? "") || null,
            departmentId: String(data.get("departmentId") ?? "") || null,
            companyId: String(data.get("companyId") ?? "") || null,
            managerEmployeeId:
              String(data.get("managerEmployeeId") ?? "") || null,
            approvalRouteMode:
              String(data.get("approvalRouteMode") ?? "") === "MANAGER_FIRST"
                ? "MANAGER_FIRST"
                : "STANDARD",
            overtimeTransportSatang: Math.round(
              Math.max(0, Number(data.get("overtimeTransportBaht") ?? 0) || 0) * 100,
            ),
            attendanceExempt: data.get("attendanceExempt") === "on",
          },
        ),
      "บันทึกข้อมูลพนักงานแล้ว",
    );
  }

  async function updateUserRoles(
    event: FormEvent<HTMLFormElement>,
    employeeId: string,
  ) {
    event.preventDefault();
    if (state.status !== "ready" || !state.capabilities.rbacAdminWrite) return;
    const data = new FormData(event.currentTarget);
    const roleIds = data.getAll("roleIds").map((value) => String(value));
    const scopeType = String(data.get("scopeType") ?? "PLATFORM");
    const scopeCompanyId = String(data.get("scopeCompanyId") ?? "") || null;
    const scopeAgencyIds = data
      .getAll("scopeAgencyIds")
      .map((value) => String(value));
    await run(
      "user-roles-" + employeeId,
      () =>
        mutate(
          "/api/management/users/" +
            encodeURIComponent(employeeId) +
            "/role-assignments",
          "PUT",
          {
            assignments: roleIds.map((roleId) => ({
              roleId,
              scopeType,
              scopeCompanyId:
                scopeType === "COMPANY" ? scopeCompanyId : null,
              scopeAgencyIds:
                scopeType === "TEAM_SET" ? scopeAgencyIds : [],
            })),
          },
        ),
      "บันทึกระดับสิทธิ์ของพนักงานแล้ว",
    );
  }

  async function createUnit(
    event: FormEvent<HTMLFormElement>,
    type: "companies" | "agencies" | "departments",
  ) {
    event.preventDefault();
    if (
      state.status !== "ready" ||
      !state.capabilities.organizationAdminWrite
    ) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    if (!name) return;
    await run(
      "create-" + type,
      () => mutate("/api/management/" + type, "POST", { name }),
      "เพิ่มข้อมูลแล้ว",
    );
    form.reset();
  }

  async function updateUnit(
    event: FormEvent<HTMLFormElement>,
    type: "companies" | "agencies" | "departments",
    id: string,
  ) {
    event.preventDefault();
    if (
      state.status !== "ready" ||
      !state.capabilities.organizationAdminWrite
    ) {
      return;
    }
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const active = String(data.get("active") ?? "") === "true";
    if (!name) return;
    await run(
      "update-" + type + "-" + id,
      () =>
        mutate(
          "/api/management/" + type + "/" + encodeURIComponent(id),
          "PATCH",
          type === "agencies"
            ? {
                name,
                active,
                companyId: String(data.get("companyId") ?? "") || null,
              }
            : { name, active },
        ),
      "บันทึกข้อมูลแล้ว",
    );
  }

  async function upsertEntitlement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      state.status !== "ready" ||
      !state.capabilities.entitlementAdminWrite
    ) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    await run(
      "entitlement",
      () =>
        mutate("/api/management/entitlements", "PUT", {
          employeeId: String(data.get("employeeId") ?? ""),
          leaveTypeId: String(data.get("leaveTypeId") ?? ""),
          quota: String(data.get("quota") ?? ""),
          validFrom: String(data.get("validFrom") ?? "") || null,
          validTo: String(data.get("validTo") ?? "") || null,
        }),
      "บันทึกสิทธิการลาแล้ว",
    );
  }

  async function upsertHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      state.status !== "ready" ||
      !state.capabilities.workCalendarAdminWrite
    ) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    await run(
      "holiday-create",
      () =>
        mutate("/api/management/holidays", "PUT", {
          holidayDate: String(data.get("holidayDate") ?? ""),
          description: String(data.get("description") ?? ""),
          active: true,
        }),
      "บันทึกวันหยุดแล้ว",
    );
    form.reset();
  }

  async function updateHoliday(
    event: FormEvent<HTMLFormElement>,
    id: string,
  ) {
    event.preventDefault();
    if (
      state.status !== "ready" ||
      !state.capabilities.workCalendarAdminWrite
    ) {
      return;
    }
    const data = new FormData(event.currentTarget);
    await run(
      "holiday-" + id,
      () =>
        mutate("/api/management/holidays", "PUT", {
          id,
          holidayDate: String(data.get("holidayDate") ?? ""),
          description: String(data.get("description") ?? ""),
          active: String(data.get("active") ?? "") === "true",
        }),
      "บันทึกวันหยุดแล้ว",
    );
  }

  async function toggleWorkday(isoWeekday: number, isWorking: boolean) {
    if (
      state.status !== "ready" ||
      !state.capabilities.workCalendarAdminWrite
    ) {
      return;
    }
    await run(
      "weekday-" + isoWeekday,
      () =>
        mutate(
          "/api/management/weekly-workdays/" + isoWeekday,
          "PUT",
          { isWorking },
        ),
      "บันทึกวันทำงานแล้ว",
    );
  }

  async function toggleRolePermission(
    role: RolePermissionAdminItem,
    permission: string,
    enabled: boolean,
  ) {
    if (state.status !== "ready" || !state.capabilities.rbacAdminWrite) return;
    const next = new Set(role.permissions);
    if (enabled) next.add(permission);
    else next.delete(permission);
    await run(
      "role-" + role.id + "-" + permission,
      () =>
        mutate(
          "/api/management/roles/" +
            encodeURIComponent(role.id) +
            "/permissions",
          "PUT",
          { permissions: [...next] },
        ),
      "บันทึกสิทธิ์การใช้งานแล้ว",
    );
  }

  async function issueRecovery(employeeId: string) {
    if (
      busy ||
      state.status !== "ready" ||
      !state.capabilities.passwordRecoveryAdmin
    ) {
      return;
    }
    setBusy("reset-" + employeeId);
    setMessage(null);
    setResetLink(null);
    try {
      const result = await mutate<PasswordRecoveryIssueResult>(
        "/api/password-recovery/admin/users/" +
          encodeURIComponent(employeeId) +
          "/issue",
        "POST",
      );
      setResetLink(window.location.origin + result.resetPath);
      setMessage({
        kind: "success",
        text: "สร้างลิงก์กู้คืนรหัสผ่านอายุ 15 นาทีแล้ว",
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error ? error.message : "สร้างลิงก์ไม่สำเร็จ",
      });
    } finally {
      setBusy(null);
    }
  }

  if (state.status === "loading") {
    return (
      <section className="module-state" role="status">
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลดข้อมูล</h1>
        <p>กำลังเตรียมหน้าจัดการระบบ</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">เกิดข้อผิดพลาด</div>
        <h1>เปิดเครื่องมือจัดการไม่สำเร็จ</h1>
        <p>{state.message}</p>
        <button className="primary-button" onClick={() => void load()}>
          ลองใหม่
        </button>
      </section>
    );
  }

  const data = state.data;
  const capabilities = state.capabilities;
  const userStats = data.users
    ? {
        total: data.users.length,
        regular: data.users.filter((user) =>
          user.roles.some((role) => role.key === "USER" || role.key === "SUPERUSER"),
        ).length,
        elevated: data.users.filter((user) =>
          user.roles.some((role) => role.key === "ADMIN" || role.key === "SUPERADMIN"),
        ).length,
        pending: data.users.filter((user) => user.state === "PENDING").length,
        resigned: data.users.filter((user) => user.state === "RESIGNED").length,
      }
    : null;

  const visibleUsers =
    data.users?.filter((user) =>
      containsSearch(
        [
          user.id,
          user.fullName,
          user.loginName,
          user.agencyName,
          user.departmentName,
          ...user.roles.map((role) => role.name),
        ],
        search,
      ),
    ) ?? [];

  const visibleCompanies =
    data.companies?.filter((item) =>
      containsSearch([item.id, item.name], search),
    ) ?? [];

  const visibleAgencies =
    data.agencies?.filter((item) =>
      containsSearch([item.id, item.name, item.companyName], search),
    ) ?? [];

  const visibleDepartments =
    data.departments?.filter((item) =>
      containsSearch([item.id, item.name], search),
    ) ?? [];

  const visibleEntitlements =
    data.entitlements?.filter((item) =>
      containsSearch(
        [
          item.id,
          item.employeeName,
          item.leaveTypeName,
          item.leaveTypeKey,
          item.quota,
        ],
        search,
      ),
    ) ?? [];

  const visibleHolidays =
    data.workCalendar?.holidays.filter((item) =>
      containsSearch(
        [item.id, item.holidayDate, item.description],
        search,
      ),
    ) ?? [];

  return (
    <div className="module-stack task398-management-page">
      {message ? (
        <div
          className={
            message.kind === "success"
              ? "action-message success"
              : "action-message error"
          }
          role={message.kind === "error" ? "alert" : "status"}
        >
          {message.text}
        </div>
      ) : null}

      {resetLink && selectedSection === "users" ? (
        <section className="module-panel">
          <h2>ลิงก์กู้คืนรหัสผ่าน</h2>
          <p className="panel-description">
            ส่งลิงก์นี้ให้พนักงานผ่านช่องทางที่ยืนยันตัวบุคคลแล้ว
            ลิงก์หมดอายุภายใน 15 นาที
          </p>
          <input
            className="form-input"
            readOnly
            value={resetLink}
            aria-label="ลิงก์กู้คืนรหัสผ่าน"
          />
        </section>
      ) : null}

      {selectedSection === "users" && userStats ? (
        <>
          <section className="production-user-stats fade-in" aria-label="สรุปผู้ใช้งาน">
            <article className="production-user-stat production-user-stat-blue">
              <div>
                <span>ผู้ใช้งาน</span>
                <strong>{userStats.total}</strong>
              </div>
              <i className="bx bxs-user" aria-hidden="true" />
            </article>
            <article className="production-user-stat production-user-stat-green">
              <div>
                <span>ผู้ใช้งาน(ทั่วไป)</span>
                <strong>{userStats.regular}</strong>
              </div>
              <i className="bx bxs-user-detail" aria-hidden="true" />
            </article>
            <article className="production-user-stat production-user-stat-yellow">
              <div>
                <span>ผู้ใช้งาน(ระดับสูง)</span>
                <strong>{userStats.elevated}</strong>
              </div>
              <i className="bx bxs-user-badge" aria-hidden="true" />
            </article>
            <article className="production-user-stat production-user-stat-yellow">
              <div>
                <span>รออนุมัติ</span>
                <strong>{userStats.pending}</strong>
              </div>
              <i className="bx bxs-hourglass" aria-hidden="true" />
            </article>
            <article className="production-user-stat production-user-stat-red">
              <div>
                <span>พ้นสภาพ</span>
                <strong>{userStats.resigned}</strong>
              </div>
              <i className="fa-solid fa-user-slash" aria-hidden="true" />
            </article>
          </section>

          <section id="users" className="module-panel production-management-panel fade-in">
            <div className="production-management-panel-head">
              <h1>{MANAGEMENT_SECTION_LABEL.users}</h1>
              <div className="production-search-box">
                <input
                  className="form-input"
                  type="search"
                  placeholder="ค้นหาพนักงาน..."
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                />
                <i className="fa-solid fa-search" aria-hidden="true" />
              </div>
            </div>

            <div className="table-scroll">
              <table className="data-table production-management-table">
                <thead>
                  <tr>
                    <th>รหัส</th>
                    <th>พนักงาน</th>
                    <th>สถานะ</th>
                    <th>บริษัท</th>
                    <th>หน่วยงาน (ทีม)</th>
                    <th>ฝ่าย</th>
                    <th>ผู้บังคับบัญชา</th>
                    <th>ระดับและขอบเขต</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => {
                    const formId = "user-form-" + user.id;
                    const roleFormId = "user-role-form-" + user.id;
                    return (
                      <tr key={user.id}>
                        <td title={user.id}>{compactId(user.id)}</td>
                        <td className="production-employee-cell">
                          <span className="topbar-avatar" aria-hidden="true">
                            {user.fullName.trim().slice(0, 1)}
                          </span>
                          <div>
                            <strong>{user.fullName}</strong>
                            <small>{user.loginName ?? "ยังไม่มีบัญชีเข้าสู่ระบบ"}</small>
                          </div>
                        </td>
                        <td>
                          <select
                            className="production-table-select"
                            name="state"
                            form={formId}
                            defaultValue={user.state ?? "PENDING"}
                            disabled={
                              !capabilities.usersAdminWrite || Boolean(busy)
                            }
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="PENDING">PENDING</option>
                            <option value="INACTIVE">INACTIVE</option>
                            <option value="RESIGNED">RESIGNED</option>
                          </select>
                          <span className={"status-badge " + accountStateClass(user.state)}>
                            {accountStateLabel(user.state)}
                          </span>
                        </td>
                        <td>
                          <select
                            className="production-table-select"
                            name="companyId"
                            form={formId}
                            defaultValue={user.companyId ?? ""}
                            disabled={
                              !capabilities.usersAdminWrite || Boolean(busy)
                            }
                          >
                            <option value="">ไม่ระบุ</option>
                            {data.companies?.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="production-table-select"
                            name="agencyId"
                            form={formId}
                            defaultValue={user.agencyId ?? ""}
                            disabled={
                              !capabilities.usersAdminWrite || Boolean(busy)
                            }
                          >
                            <option value="">ไม่ระบุ</option>
                            {data.agencies?.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="production-table-select"
                            name="departmentId"
                            form={formId}
                            defaultValue={user.departmentId ?? ""}
                            disabled={
                              !capabilities.usersAdminWrite || Boolean(busy)
                            }
                          >
                            <option value="">ไม่ระบุ</option>
                            {data.departments?.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="production-table-select"
                            name="managerEmployeeId"
                            form={formId}
                            defaultValue={user.managerEmployeeId ?? ""}
                            disabled={
                              !capabilities.usersAdminWrite || Boolean(busy)
                            }
                          >
                            <option value="">ไม่มี (ใช้สายตามนโยบาย)</option>
                            {data.users
                              ?.filter((candidate) => candidate.id !== user.id)
                              .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.fullName}
                                </option>
                              ))}
                          </select>
                          <select
                            className="production-table-select"
                            name="approvalRouteMode"
                            form={formId}
                            defaultValue={user.approvalRouteMode}
                            disabled={
                              !capabilities.usersAdminWrite || Boolean(busy)
                            }
                            aria-label={"รูปแบบสายอนุมัติของ " + user.fullName}
                          >
                            <option value="STANDARD">สายตามนโยบาย</option>
                            <option value="MANAGER_FIRST">
                              ผู้บังคับบัญชาก่อน (ข้ามหัวหน้าทีม)
                            </option>
                          </select>
                          <label>
                            ค่ารถ OT (บาท/วัน)
                            <input
                              className="production-table-select"
                              type="number"
                              min="0"
                              step="1"
                              name="overtimeTransportBaht"
                              form={formId}
                              defaultValue={user.overtimeTransportSatang / 100}
                              disabled={
                                !capabilities.usersAdminWrite || Boolean(busy)
                              }
                              aria-label={"ค่ารถ OT ของ " + user.fullName}
                            />
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              name="attendanceExempt"
                              form={formId}
                              defaultChecked={user.attendanceExempt}
                              disabled={
                                !capabilities.usersAdminWrite || Boolean(busy)
                              }
                            />{" "}
                            ไม่ต้องลงเวลา (เช่น ผู้ตรวจสอบบัญชี)
                          </label>
                        </td>
                        <td>
                          {data.rbac && capabilities.rbacAdminWrite ? (
                            <select
                              className="production-table-select production-role-select"
                              name="roleIds"
                              form={roleFormId}
                              multiple
                              size={Math.min(4, Math.max(2, data.rbac.roles.length))}
                              defaultValue={user.roles.map((role) => role.id)}
                              aria-label={"ระดับสิทธิ์ของ " + user.fullName}
                            >
                              {data.rbac.roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="production-role-chips">
                              {user.roles.length > 0
                                ? user.roles.map((role) => (
                                    <span
                                      className="status-badge status-info"
                                      key={role.id}
                                    >
                                      {role.name}
                                    </span>
                                  ))
                                : "—"}
                            </div>
                          )}
                          {data.rbac && capabilities.rbacAdminWrite ? (
                            <div className="production-scope-fields">
                              <select
                                className="production-table-select"
                                name="scopeType"
                                form={roleFormId}
                                defaultValue={
                                  user.roleAssignments[0]?.scopeType ??
                                  "PLATFORM"
                                }
                                aria-label={"ขอบเขตสิทธิ์ของ " + user.fullName}
                              >
                                <option value="PLATFORM">ทั้งแพลตฟอร์ม</option>
                                <option value="COMPANY">ทั้งบริษัท</option>
                                <option value="TEAM_SET">เฉพาะทีมที่เลือก</option>
                                <option value="SELF">เฉพาะตนเอง</option>
                              </select>
                              <select
                                className="production-table-select"
                                name="scopeCompanyId"
                                form={roleFormId}
                                defaultValue={
                                  user.roleAssignments[0]?.scopeCompanyId ?? ""
                                }
                                aria-label={"บริษัทของขอบเขตสิทธิ์ " + user.fullName}
                              >
                                <option value="">— บริษัท (ถ้าเลือกทั้งบริษัท)</option>
                                {data.companies?.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="production-table-select"
                                name="scopeAgencyIds"
                                form={roleFormId}
                                multiple
                                size={Math.min(4, Math.max(2, data.agencies?.length ?? 2))}
                                defaultValue={
                                  user.roleAssignments[0]?.scopeAgencyIds ?? []
                                }
                                aria-label={"ทีมของขอบเขตสิทธิ์ " + user.fullName}
                              >
                                {data.agencies?.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                        </td>
                        <td>
                          {data.rbac && capabilities.rbacAdminWrite ? (
                            <form
                              id={roleFormId}
                              onSubmit={(event) =>
                                void updateUserRoles(event, user.id)
                              }
                            />
                          ) : null}
                          <form
                            id={formId}
                            className="production-table-actions"
                            onSubmit={(event) => void updateUser(event, user.id)}
                          >
                            <button
                              className="production-action-button production-action-edit"
                              disabled={
                                !capabilities.usersAdminWrite || Boolean(busy)
                              }
                              type="submit"
                              title="บันทึกการแก้ไข"
                            >
                              <i
                                className="fa-solid fa-pen-to-square"
                                aria-hidden="true"
                              />
                            </button>
                            {data.rbac ? (
                              <button
                                className="production-action-button production-action-role"
                                disabled={Boolean(busy)}
                                type="submit"
                                form={roleFormId}
                                title="บันทึกระดับสิทธิ์"
                              >
                                <i
                                  className="fa-solid fa-user-shield"
                                  aria-hidden="true"
                                />
                              </button>
                            ) : null}
                            {capabilities.passwordRecoveryAdmin ? (
                              <button
                                className="production-action-button production-action-view"
                                disabled={Boolean(busy)}
                                type="button"
                                title="สร้างลิงก์รีเซ็ตรหัสผ่าน"
                                onClick={() => void issueRecovery(user.id)}
                              >
                                <i className="fa-solid fa-key" aria-hidden="true" />
                              </button>
                            ) : null}
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="production-empty-row">
                        ไม่พบข้อมูล! 😓
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="production-table-footer">
              แสดง {visibleUsers.length} จาก {data.users?.length ?? 0} แถว
            </div>
          </section>
        </>
      ) : null}

      {(selectedSection === "organization" ||
        selectedSection === "companies") &&
      data.companies ? (
        <section id="companies" className="module-panel production-management-panel fade-in">
          <div className="production-management-panel-head">
            <h1>{MANAGEMENT_SECTION_LABEL.companies}</h1>
            <div className="production-management-head-actions">
              <form
                className="production-inline-create"
                onSubmit={(event) => void createUnit(event, "companies")}
              >
                <input
                  className="form-input"
                  name="name"
                  required
                  maxLength={200}
                  placeholder="ชื่อบริษัท"
                />
                <button
                  className="success-button"
                  disabled={
                    !capabilities.organizationAdminWrite || Boolean(busy)
                  }
                >
                  เพิ่มข้อมูล
                </button>
              </form>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table production-management-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>บริษัท</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {visibleCompanies.map((item) => {
                  const formId = "company-form-" + item.id;
                  return (
                    <tr key={item.id}>
                      <td title={item.id}>{compactId(item.id)}</td>
                      <td>
                        <input
                          className="production-table-input"
                          form={formId}
                          name="name"
                          defaultValue={item.name}
                          maxLength={200}
                          required
                        />
                      </td>
                      <td>
                        <select
                          className="production-table-select"
                          form={formId}
                          name="active"
                          defaultValue={String(item.active)}
                        >
                          <option value="true">เปิดใช้งาน</option>
                          <option value="false">ปิดใช้งาน</option>
                        </select>
                      </td>
                      <td>
                        <form
                          id={formId}
                          className="production-table-actions"
                          onSubmit={(event) =>
                            void updateUnit(event, "companies", item.id)
                          }
                        >
                          <button
                            className="production-action-button production-action-edit"
                            disabled={
                              !capabilities.organizationAdminWrite ||
                              Boolean(busy)
                            }
                            type="submit"
                            title="บันทึก"
                          >
                            <i
                              className="fa-solid fa-pen-to-square"
                              aria-hidden="true"
                            />
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {visibleCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="production-empty-row">
                      ยังไม่มีบริษัท เพิ่มบริษัทแรกด้านบน
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {(selectedSection === "organization" ||
        selectedSection === "agencies") &&
      data.agencies ? (
        <section id="agencies" className="module-panel production-management-panel fade-in">
          <div className="production-management-panel-head">
            <h1>{MANAGEMENT_SECTION_LABEL.agencies}</h1>
            <div className="production-management-head-actions">
              <div className="production-search-box">
                <input
                  className="form-input"
                  type="search"
                  placeholder="ค้นหาข้อมูล..."
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                />
                <i className="fa-solid fa-search" aria-hidden="true" />
              </div>
              <form
                className="production-inline-create"
                onSubmit={(event) => void createUnit(event, "agencies")}
              >
                <input
                  className="form-input"
                  name="name"
                  required
                  maxLength={200}
                  placeholder="ชื่อหน่วยงาน"
                />
                <button
                  className="success-button"
                  disabled={
                    !capabilities.organizationAdminWrite || Boolean(busy)
                  }
                >
                  เพิ่มข้อมูล
                </button>
              </form>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table production-management-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>หน่วยงาน (ทีม)</th>
                  <th>บริษัท</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {visibleAgencies.map((item) => {
                  const formId = "agency-form-" + item.id;
                  return (
                    <tr key={item.id}>
                      <td title={item.id}>{compactId(item.id)}</td>
                      <td>
                        <input
                          className="production-table-input"
                          form={formId}
                          name="name"
                          defaultValue={item.name}
                          maxLength={200}
                          required
                        />
                      </td>
                      <td>
                        <select
                          className="production-table-select"
                          form={formId}
                          name="companyId"
                          defaultValue={item.companyId ?? ""}
                        >
                          <option value="">ไม่ระบุ</option>
                          {data.companies?.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="production-table-select"
                          form={formId}
                          name="active"
                          defaultValue={String(item.active)}
                        >
                          <option value="true">เปิดใช้งาน</option>
                          <option value="false">ปิดใช้งาน</option>
                        </select>
                      </td>
                      <td>
                        <form
                          id={formId}
                          className="production-table-actions"
                          onSubmit={(event) =>
                            void updateUnit(event, "agencies", item.id)
                          }
                        >
                          <button
                            className="production-action-button production-action-edit"
                            disabled={
                              !capabilities.organizationAdminWrite ||
                              Boolean(busy)
                            }
                            type="submit"
                            title="บันทึก"
                          >
                            <i
                              className="fa-solid fa-pen-to-square"
                              aria-hidden="true"
                            />
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {visibleAgencies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="production-empty-row">
                      ไม่พบข้อมูล! 😓
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="production-table-footer">
            แสดง {visibleAgencies.length} จาก {data.agencies.length} แถว
          </div>
        </section>
      ) : null}

      {(selectedSection === "organization" ||
        selectedSection === "departments") &&
      data.departments ? (
        <section id="departments" className="module-panel production-management-panel fade-in">
          <div className="production-management-panel-head">
            <h1>{MANAGEMENT_SECTION_LABEL.departments}</h1>
            <div className="production-management-head-actions">
              <div className="production-search-box">
                <input
                  className="form-input"
                  type="search"
                  placeholder="ค้นหาข้อมูล..."
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                />
                <i className="fa-solid fa-search" aria-hidden="true" />
              </div>
              <form
                className="production-inline-create"
                onSubmit={(event) => void createUnit(event, "departments")}
              >
                <input
                  className="form-input"
                  name="name"
                  required
                  maxLength={200}
                  placeholder="ชื่อฝ่าย"
                />
                <button
                  className="success-button"
                  disabled={
                    !capabilities.organizationAdminWrite || Boolean(busy)
                  }
                >
                  เพิ่มข้อมูล
                </button>
              </form>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table production-management-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ฝ่าย</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {visibleDepartments.map((item) => {
                  const formId = "department-form-" + item.id;
                  return (
                    <tr key={item.id}>
                      <td title={item.id}>{compactId(item.id)}</td>
                      <td>
                        <input
                          className="production-table-input"
                          form={formId}
                          name="name"
                          defaultValue={item.name}
                          maxLength={200}
                          required
                        />
                      </td>
                      <td>
                        <select
                          className="production-table-select"
                          form={formId}
                          name="active"
                          defaultValue={String(item.active)}
                        >
                          <option value="true">เปิดใช้งาน</option>
                          <option value="false">ปิดใช้งาน</option>
                        </select>
                      </td>
                      <td>
                        <form
                          id={formId}
                          className="production-table-actions"
                          onSubmit={(event) =>
                            void updateUnit(event, "departments", item.id)
                          }
                        >
                          <button
                            className="production-action-button production-action-edit"
                            disabled={
                              !capabilities.organizationAdminWrite ||
                              Boolean(busy)
                            }
                            type="submit"
                            title="บันทึก"
                          >
                            <i
                              className="fa-solid fa-pen-to-square"
                              aria-hidden="true"
                            />
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {visibleDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="production-empty-row">
                      ไม่พบข้อมูล! 😓
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="production-table-footer">
            แสดง {visibleDepartments.length} จาก {data.departments.length} แถว
          </div>
        </section>
      ) : null}

      {selectedSection === "entitlements" &&
      data.entitlements &&
      data.entitlementOptions ? (
        <section id="entitlements" className="module-panel production-management-panel fade-in">
          <div className="production-management-panel-head">
            <h1>{MANAGEMENT_SECTION_LABEL.entitlements}</h1>
            <div className="production-search-box">
              <input
                className="form-input"
                type="search"
                placeholder="ค้นหาข้อมูล..."
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
              />
              <i className="fa-solid fa-search" aria-hidden="true" />
            </div>
          </div>

          <form
            className="production-entitlement-create"
            onSubmit={(event) => void upsertEntitlement(event)}
          >
            <select className="form-input" name="employeeId" required defaultValue="">
              <option value="" disabled>
                เลือกพนักงาน
              </option>
              {data.entitlementOptions.employees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select className="form-input" name="leaveTypeId" required defaultValue="">
              <option value="" disabled>
                เลือกประเภทลา
              </option>
              {data.entitlementOptions.leaveTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <input
              className="form-input"
              name="quota"
              inputMode="decimal"
              required
              placeholder="จำนวน"
            />
            <input className="form-input" name="validFrom" type="date" />
            <input className="form-input" name="validTo" type="date" />
            <button
              className="success-button"
              disabled={
                !capabilities.entitlementAdminWrite || Boolean(busy)
              }
            >
              เพิ่มข้อมูล
            </button>
          </form>

          <div className="table-scroll">
            <table className="data-table production-management-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>พนักงาน</th>
                  <th>ประเภท</th>
                  <th>จำนวน</th>
                  <th>ช่วงสิทธิ</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntitlements.map((item) => (
                  <tr key={item.id}>
                    <td title={item.id}>{compactId(item.id)}</td>
                    <td>{item.employeeName}</td>
                    <td>
                      <span className="status-badge status-info">
                        {item.leaveTypeName}
                      </span>
                    </td>
                    <td>{item.quota}</td>
                    <td>
                      {item.validFrom ?? "—"} ถึง {item.validTo ?? "—"}
                    </td>
                  </tr>
                ))}
                {visibleEntitlements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="production-empty-row">
                      ไม่พบข้อมูล! 😓
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="production-table-footer">
            แสดง {visibleEntitlements.length} จาก {data.entitlements.length} แถว
          </div>
        </section>
      ) : null}

      {(selectedSection === "work-calendar" ||
        selectedSection === "holidays") &&
      data.workCalendar ? (
        <section id="holidays" className="module-panel production-management-panel fade-in">
          <div className="production-management-panel-head">
            <h1>{MANAGEMENT_SECTION_LABEL.holidays}</h1>
            <div className="production-management-head-actions">
              <div className="production-search-box">
                <input
                  className="form-input"
                  type="search"
                  placeholder="ค้นหาข้อมูล..."
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                />
                <i className="fa-solid fa-search" aria-hidden="true" />
              </div>
              <form
                className="production-inline-create production-holiday-create"
                onSubmit={(event) => void upsertHoliday(event)}
              >
                <input className="form-input" name="holidayDate" type="date" required />
                <input
                  className="form-input"
                  name="description"
                  required
                  maxLength={250}
                  placeholder="รายละเอียดวันหยุด"
                />
                <button
                  className="success-button"
                  disabled={
                    !capabilities.workCalendarAdminWrite || Boolean(busy)
                  }
                >
                  เพิ่มข้อมูล
                </button>
              </form>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table production-management-table">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>วันที่</th>
                  <th>รายละเอียด</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {visibleHolidays.map((item) => {
                  const formId = "holiday-form-" + item.id;
                  return (
                    <tr key={item.id}>
                      <td title={item.id}>{compactId(item.id)}</td>
                      <td>
                        <input
                          className="production-table-input"
                          form={formId}
                          name="holidayDate"
                          type="date"
                          defaultValue={item.holidayDate}
                          required
                        />
                      </td>
                      <td>
                        <input
                          className="production-table-input"
                          form={formId}
                          name="description"
                          defaultValue={item.description}
                          maxLength={250}
                          required
                        />
                      </td>
                      <td>
                        <select
                          className="production-table-select"
                          form={formId}
                          name="active"
                          defaultValue={String(item.active)}
                        >
                          <option value="true">เปิดใช้งาน</option>
                          <option value="false">ปิดใช้งาน</option>
                        </select>
                      </td>
                      <td>
                        <form
                          id={formId}
                          className="production-table-actions"
                          onSubmit={(event) =>
                            void updateHoliday(event, item.id)
                          }
                        >
                          <button
                            className="production-action-button production-action-edit"
                            disabled={
                              !capabilities.workCalendarAdminWrite ||
                              Boolean(busy)
                            }
                            type="submit"
                            title="บันทึก"
                          >
                            <i
                              className="fa-solid fa-pen-to-square"
                              aria-hidden="true"
                            />
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {visibleHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="production-empty-row">
                      ไม่พบข้อมูล! 😓
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="production-table-footer">
            แสดง {visibleHolidays.length} จาก {data.workCalendar.holidays.length} แถว
          </div>
        </section>
      ) : null}

      {(selectedSection === "work-calendar" ||
        selectedSection === "workdays") &&
      data.workCalendar ? (
        <section id="workdays" className="module-panel production-management-panel fade-in">
          <div className="production-management-panel-head">
            <h1>{MANAGEMENT_SECTION_LABEL.workdays}</h1>
          </div>
          <div className="table-scroll">
            <table className="data-table production-management-table production-workday-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>รายการ</th>
                  <th>ปิด/เปิด</th>
                </tr>
              </thead>
              <tbody>
                {WEEKDAY.map((label, index) => {
                  const isoWeekday = index + 1;
                  const current = data.workCalendar?.weeklyWorkdays.find(
                    (row) => row.isoWeekday === isoWeekday,
                  );
                  const working = current?.isWorking ?? false;
                  return (
                    <tr key={isoWeekday}>
                      <td>{isoWeekday}</td>
                      <td>{label}</td>
                      <td>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={working}
                            disabled={
                              !capabilities.workCalendarAdminWrite ||
                              Boolean(busy)
                            }
                            onChange={(event) =>
                              void toggleWorkday(
                                isoWeekday,
                                event.currentTarget.checked,
                              )
                            }
                          />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {selectedSection === "roles" && data.rbac ? (
        <section id="roles" className="module-panel production-management-panel fade-in">
          <div className="production-management-panel-head">
            <h1>{MANAGEMENT_SECTION_LABEL.roles}</h1>
          </div>
          <div className="table-scroll">
            <table className="data-table production-management-table production-role-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>รายการเมนู / Permission</th>
                  {data.rbac.roles.map((role) => (
                    <th key={role.id}>
                      <div className="production-role-head">
                        <span className="topbar-avatar" aria-hidden="true">
                          {role.name.slice(0, 1)}
                        </span>
                        <small>{role.name}</small>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rbac.permissionCatalog.map((permission, index) => (
                  <tr key={permission}>
                    <td>{index + 1}</td>
                    <td className="production-permission-key">
                      <i className="fa-solid fa-desktop" aria-hidden="true" />
                      {permission}
                    </td>
                    {data.rbac?.roles.map((role) => (
                      <td key={role.id}>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={role.permissions.includes(permission)}
                            disabled={
                              !capabilities.rbacAdminWrite || Boolean(busy)
                            }
                            onChange={(event) =>
                              void toggleRolePermission(
                                role,
                                permission,
                                event.currentTarget.checked,
                              )
                            }
                          />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
