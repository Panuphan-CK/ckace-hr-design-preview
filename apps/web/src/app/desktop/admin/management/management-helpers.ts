import type { ManagedEmployeeItem } from "@ckace/contracts";
import type { DotTone } from "../../ui/kit";

export type ManagementSection =
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

export const MANAGEMENT_SECTION_LABEL: Readonly<Record<ManagementSection, string>> = {
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

export const WEEKDAY = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
] as const;

export function sectionFromValue(value: string): ManagementSection {
  return Object.prototype.hasOwnProperty.call(MANAGEMENT_SECTION_LABEL, value)
    ? (value as ManagementSection)
    : "users";
}

export function containsSearch(
  values: readonly (string | null | undefined)[],
  query: string,
): boolean {
  if (!query) return true;
  const normalized = query.toLocaleLowerCase("th");
  return values.some((value) =>
    String(value ?? "")
      .toLocaleLowerCase("th")
      .includes(normalized),
  );
}

export interface AccountStateInfo {
  readonly label: string;
  readonly tone: DotTone;
  readonly tip: string;
}

export function accountStateInfo(state: ManagedEmployeeItem["state"]): AccountStateInfo {
  if (state === "ACTIVE") return { label: "ใช้งาน", tone: "ok", tip: "ใช้งานอยู่ตามปกติ" };
  if (state === "PENDING") return { label: "รออนุมัติ", tone: "wait", tip: "รออนุมัติบัญชี" };
  if (state === "RESIGNED") return { label: "พ้นสภาพ", tone: "bad", tip: "พ้นสภาพแล้ว" };
  if (state === "INACTIVE") return { label: "ไม่ใช้งาน", tone: "muted", tip: "ปิดการใช้งานชั่วคราว" };
  return { label: "ไม่ระบุ", tone: "muted", tip: "ยังไม่ระบุสถานะ" };
}

export function activeDot(active: boolean): { readonly tone: DotTone; readonly tip: string } {
  return active
    ? { tone: "ok", tip: "เปิดใช้งาน" }
    : { tone: "muted", tip: "ปิดใช้งาน" };
}

export const ACCOUNT_STATE_OPTIONS = [
  { value: "ACTIVE", label: "ใช้งาน" },
  { value: "PENDING", label: "รออนุมัติ" },
  { value: "INACTIVE", label: "ไม่ใช้งาน" },
  { value: "RESIGNED", label: "พ้นสภาพ" },
] as const;

export interface UserStats {
  readonly total: number;
  readonly regular: number;
  readonly elevated: number;
  readonly pending: number;
  readonly resigned: number;
}

export function computeUserStats(users: readonly ManagedEmployeeItem[]): UserStats {
  return {
    total: users.length,
    regular: users.filter((user) =>
      user.roles.some((role) => role.key === "USER" || role.key === "SUPERUSER"),
    ).length,
    elevated: users.filter((user) =>
      user.roles.some((role) => role.key === "ADMIN" || role.key === "SUPERADMIN"),
    ).length,
    pending: users.filter((user) => user.state === "PENDING").length,
    resigned: users.filter((user) => user.state === "RESIGNED").length,
  };
}

export type UserStateFilter = "all" | "ACTIVE" | "PENDING" | "OTHER";

export function matchesStateFilter(
  state: ManagedEmployeeItem["state"],
  filter: UserStateFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "OTHER") return state !== "ACTIVE" && state !== "PENDING";
  return state === filter;
}
