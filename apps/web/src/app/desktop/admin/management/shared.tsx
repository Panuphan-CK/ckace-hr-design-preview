"use client";

import type {
  LeaveEntitlementAdminItem,
  LeaveEntitlementOptions,
  ManagedEmployeeItem,
  OrganizationUnitItem,
  RbacAdminView,
  WorkCalendarAdminView,
} from "@ckace/contracts";
import type { ReactNode } from "react";

import { Icon, type IconName } from "../../ui/icons";

export interface ManagementCapabilities {
  readonly usersAdminWrite: boolean;
  readonly organizationAdminWrite: boolean;
  readonly entitlementAdminWrite: boolean;
  readonly workCalendarAdminWrite: boolean;
  readonly rbacAdminWrite: boolean;
  readonly passwordRecoveryAdmin: boolean;
}

export interface AdminData {
  readonly users: readonly ManagedEmployeeItem[] | null;
  readonly companies: readonly OrganizationUnitItem[] | null;
  readonly agencies: readonly OrganizationUnitItem[] | null;
  readonly departments: readonly OrganizationUnitItem[] | null;
  readonly entitlements: readonly LeaveEntitlementAdminItem[] | null;
  readonly entitlementOptions: LeaveEntitlementOptions | null;
  readonly workCalendar: WorkCalendarAdminView | null;
  readonly rbac: RbacAdminView | null;
}

export type Message = { kind: "success" | "error"; text: string };

/** Runs a write; resolves true when it succeeded (the page then reloads the data). */
export type RunAction = (
  key: string,
  action: () => Promise<unknown>,
  success: string,
) => Promise<boolean>;

export interface SectionProps {
  readonly data: AdminData;
  readonly capabilities: ManagementCapabilities;
  readonly busy: string | null;
  readonly message: Message | null;
  readonly search: string;
  readonly setSearch: (next: string) => void;
  readonly run: RunAction;
  /** Tells the page whether an edit window is open (hides the page-level message, clears stale ones). */
  readonly onDialog: (open: boolean) => void;
}

export async function readOptional<T>(path: string): Promise<T | null> {
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

export async function mutate<T>(
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

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly placeholder: string;
}) {
  return (
    <label className="ck-mg-search">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
        <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" />
      </svg>
      <input
        className="ck-in"
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

export function Field({
  label,
  full,
  children,
}: {
  readonly label: string;
  readonly full?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <label className={full ? "ck-field full" : "ck-field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}

/** Round icon + number tile used at the top of a section. */
export function StatTile({
  tone,
  icon,
  value,
  label,
}: {
  readonly tone: "leave" | "sick" | "biz" | "ot" | "time" | "med" | "gray" | "accent";
  readonly icon: IconName;
  readonly value: number;
  readonly label: string;
}) {
  return (
    <article className={"ck-mg-tile ck-c-" + tone}>
      <span className="ck-mg-tile-ic">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <b>{value}</b>
        <small>{label}</small>
      </div>
    </article>
  );
}
