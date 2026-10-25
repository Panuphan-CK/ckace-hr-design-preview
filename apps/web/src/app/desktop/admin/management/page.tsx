"use client";

import type { PasswordRecoveryIssueResult } from "@ckace/contracts";
import type {
  LeaveEntitlementAdminItem,
  LeaveEntitlementOptions,
  ManagedEmployeeItem,
  OrganizationUnitItem,
  RbacAdminView,
  WorkCalendarAdminView,
} from "@ckace/contracts";
import { useCallback, useEffect, useState } from "react";

import { EmptyState, ErrorState, LoadingState, Message as MessageBox } from "../../ui/kit";
import "./ck-v2-management.css";
import { CalendarSection } from "./calendar-section";
import { EntitlementsSection } from "./entitlements-section";
import { sectionFromValue, type ManagementSection } from "./management-helpers";
import { OrgSection } from "./org-section";
import { RolesSection } from "./roles-section";
import {
  mutate,
  readOptional,
  type AdminData,
  type ManagementCapabilities,
  type Message,
  type SectionProps,
} from "./shared";
import { UsersSection } from "./users-section";

interface SessionPayload {
  readonly navigation: ManagementCapabilities;
}

type State =
  | { status: "loading" }
  | {
      status: "ready";
      data: AdminData;
      capabilities: ManagementCapabilities;
    }
  | { status: "error"; message: string };

function sectionFromHash(): ManagementSection {
  return sectionFromValue(
    typeof window === "undefined" ? "" : window.location.hash.slice(1),
  );
}

export default function DesktopManagementPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const load = useCallback(async (quiet = false) => {
    if (!quiet) {
      setState({ status: "loading" });
      setMessage(null);
    }
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

  const run = useCallback(
    async (
      key: string,
      action: () => Promise<unknown>,
      success: string,
    ): Promise<boolean> => {
      if (busy) return false;
      setBusy(key);
      setMessage(null);
      try {
        await action();
        setMessage({ kind: "success", text: success });
        await load(true);
        return true;
      } catch (error) {
        setMessage({
          kind: "error",
          text:
            error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ",
        });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [busy, load],
  );

  const onDialog = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (open) setMessage(null);
  }, []);

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
    return <LoadingState title="กำลังโหลดข้อมูล" />;
  }

  if (state.status === "error") {
    return (
      <ErrorState
        title="เปิดเครื่องมือจัดการไม่สำเร็จ"
        message={state.message}
        onRetry={() => void load()}
      />
    );
  }

  const data = state.data;
  const sectionProps: SectionProps = {
    data,
    capabilities: state.capabilities,
    busy,
    message,
    search,
    setSearch,
    run,
    onDialog,
  };
  const section = selectedSection;

  const showUsers = section === "users" && data.users;
  const showOrg =
    (section === "organization" ||
      section === "companies" ||
      section === "agencies" ||
      section === "departments") &&
    (data.companies || data.agencies || data.departments);
  const showEntitlements =
    section === "entitlements" && data.entitlements && data.entitlementOptions;
  const showCalendar =
    (section === "work-calendar" || section === "holidays" || section === "workdays") &&
    data.workCalendar;
  const showRoles = section === "roles" && data.rbac;
  const anything = showUsers || showOrg || showEntitlements || showCalendar || showRoles;

  return (
    <div className="ck-mg">
      {!dialogOpen ? <MessageBox value={message} /> : null}

      {showUsers ? (
        <UsersSection
          {...sectionProps}
          resetLink={resetLink}
          onIssueRecovery={issueRecovery}
          onCloseUser={() => setResetLink(null)}
        />
      ) : null}

      {showOrg ? (
        <OrgSection
          {...sectionProps}
          show={section === "organization" ? "all" : (section as "companies" | "agencies" | "departments")}
        />
      ) : null}

      {showEntitlements ? <EntitlementsSection {...sectionProps} /> : null}

      {showCalendar ? (
        <CalendarSection
          {...sectionProps}
          show={section === "work-calendar" ? "all" : (section as "holidays" | "workdays")}
        />
      ) : null}

      {showRoles ? <RolesSection {...sectionProps} /> : null}

      {!anything ? <EmptyState title="ไม่มีสิทธิ์เข้าถึงส่วนนี้" icon="lock" /> : null}
    </div>
  );
}
