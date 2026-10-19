"use client";

import type {
  OnboardingApprovalOptions,
  PendingEmployeeAdminItem,
  PendingEmployeeApprovalResult,
} from "@ckace/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  onboardingMetrics,
  onboardingSearch,
} from "./onboarding-view";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      pending: readonly PendingEmployeeAdminItem[];
      options: OnboardingApprovalOptions;
    }
  | { status: "error"; message: string };

type Selection = {
  readonly agencyId: string;
  readonly departmentId: string;
};

function errorMessage(status: number): string {
  if (status === 401) return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์อนุมัติพนักงานใหม่";
  if (status === 409) return "สถานะบัญชีเปลี่ยนแล้ว กรุณารีเฟรช";
  if (status === 503) return "Onboarding ยังไม่เปิดใช้งานใน environment นี้";
  return "ไม่สามารถดำเนินการ Onboarding ได้ กรุณาลองใหม่อีกครั้ง";
}

function displayDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

export default function DesktopOnboardingPage() {
  const [state, setState] = useState<State>({
    status: "loading",
  });
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<
    Record<string, Selection>
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<
    "success" | "error"
  >("success");

  const load = useCallback(async () => {
    setState({ status: "loading" });
    setMessage(null);
    try {
      const [pendingResponse, optionsResponse] =
        await Promise.all([
          fetch("/api/onboarding/pending", {
            credentials: "same-origin",
            cache: "no-store",
          }),
          fetch("/api/onboarding/approval-options", {
            credentials: "same-origin",
            cache: "no-store",
          }),
        ]);
      if (!pendingResponse.ok) {
        throw new Error(errorMessage(pendingResponse.status));
      }
      if (!optionsResponse.ok) {
        throw new Error(errorMessage(optionsResponse.status));
      }
      setState({
        status: "ready",
        pending:
          (await pendingResponse.json()) as readonly PendingEmployeeAdminItem[],
        options:
          (await optionsResponse.json()) as OnboardingApprovalOptions,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูล Onboarding ได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(
    () =>
      state.status === "ready"
        ? onboardingMetrics(state.pending)
        : null,
    [state],
  );

  const visible = useMemo(
    () =>
      state.status === "ready"
        ? onboardingSearch(state.pending, query)
        : [],
    [query, state],
  );

  async function viewMedia(employeeId: string, kind: "PROFILE" | "SIGNATURE") {
    const label = kind === "SIGNATURE" ? "ลายเซ็น" : "รูปโปรไฟล์";
    // Open the tab synchronously so the browser does not block it as a popup.
    const tab = window.open("", "_blank");
    try {
      const grantResponse = await fetch(
        `/api/onboarding/employees/${encodeURIComponent(employeeId)}/media/${kind}`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!grantResponse.ok) throw new Error("grant");
      const grant = (await grantResponse.json()) as {
        download: { url: string; requiredHeaders: Record<string, string> };
      };
      const file = await fetch(grant.download.url, { headers: grant.download.requiredHeaders });
      if (!file.ok) throw new Error("file");
      const url = URL.createObjectURL(await file.blob());
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch {
      tab?.close();
      setMessageKind("error");
      setMessage("เปิด" + label + "ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  async function approve(employeeId: string) {
    if (state.status !== "ready" || busy) return;
    const selected = selection[employeeId];
    if (!selected?.agencyId || !selected.departmentId) {
      setMessageKind("error");
      setMessage("กรุณาเลือกทีมและฝ่ายให้ครบ");
      return;
    }
    if (!window.confirm("ยืนยันอนุมัติและเปิดใช้งานบัญชีพนักงานนี้?")) {
      return;
    }

    setBusy(employeeId);
    setMessageKind("error");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/onboarding/employees/${encodeURIComponent(employeeId)}/approve`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(selected),
        },
      );
      if (!response.ok) {
        throw new Error(errorMessage(response.status));
      }
      const result =
        (await response.json()) as PendingEmployeeApprovalResult;
      setMessageKind("success");
      setMessage(
        result.unchanged
          ? "บัญชีนี้ถูกเปิดใช้งานอยู่แล้ว ข้อมูลถูกตรวจสอบซ้ำเรียบร้อย"
          : `อนุมัติบัญชีเรียบร้อย และ provision สิทธิลา ${result.leaveEntitlementsProvisioned.length} ประเภท`,
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "อนุมัติบัญชีไม่สำเร็จ",
      );
    } finally {
      setBusy(null);
    }
  }

  if (state.status === "loading") {
    return (
      <section
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลด Onboarding</h1>
        <p>กำลังตรวจสอบบัญชีที่รออนุมัติและโครงสร้างองค์กร</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">ONBOARDING ERROR</div>
        <h1>เปิด Onboarding ไม่สำเร็จ</h1>
        <p>{state.message}</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => void load()}
        >
          ลองใหม่
        </button>
      </section>
    );
  }

  return (
    <div className="module-stack">
      <section className="module-heading">
        <div>
          <p className="eyebrow">ONBOARDING DESKTOP</p>
          <h1>รับพนักงานใหม่</h1>
          <p>
            ตรวจสอบบัญชีที่รออนุมัติ และกำหนดทีมและฝ่าย
            ก่อนเปิดใช้งานบัญชี
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void load()}
        >
          รีเฟรช
        </button>
      </section>

      {message ? (
        <div
          className={
            messageKind === "error"
              ? "action-message error"
              : "action-message success"
          }
          role={messageKind === "error" ? "alert" : "status"}
        >
          {message}
        </div>
      ) : null}

      <section className="metric-grid">
        <article className="metric-card">
          <span>รออนุมัติ</span>
          <strong>{metrics?.pending ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>เชื่อม LINE แล้ว</span>
          <strong>{metrics?.lineLinked ?? 0}</strong>
        </article>
        <article className="metric-card">
          <span>ยังไม่เชื่อม LINE</span>
          <strong>{metrics?.lineUnlinked ?? 0}</strong>
        </article>
      </section>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PENDING ACCOUNTS</p>
            <h2>บัญชีที่รอเปิดใช้งาน</h2>
          </div>
          <input
            type="search"
            value={query}
            onChange={(event) =>
              setQuery(event.currentTarget.value)
            }
            placeholder="ค้นหาชื่อ / login / employee ID"
            aria-label="ค้นหาพนักงาน"
          />
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">
            <h3>ไม่มีบัญชีที่รออนุมัติ</h3>
            <p>
              เมื่อมีผู้สมัครใหม่ที่สถานะ PENDING รายการจะปรากฏที่นี่
            </p>
          </div>
        ) : (
          <div className="onboarding-list">
            {visible.map((employee) => {
              const selected = selection[employee.employeeId] ?? {
                agencyId: "",
                departmentId: "",
              };
              return (
                <article
                  className="onboarding-card"
                  key={employee.employeeId}
                >
                  <div className="onboarding-card-head">
                    <div>
                      <strong>{employee.fullName}</strong>
                      <small>
                        {employee.nickname
                          ? `${employee.nickname} · `
                          : ""}
                        {employee.loginName}
                      </small>
                    </div>
                    <span
                      className={
                        employee.lineLinked
                          ? "status-badge success"
                          : "status-badge"
                      }
                    >
                      {employee.lineLinked
                        ? "เชื่อม LINE แล้ว"
                        : "ยังไม่เชื่อม LINE"}
                    </span>
                  </div>

                  <div className="profile-detail-grid">
                    <div>
                      <span>รหัสพนักงาน</span>
                      <strong>{employee.employeeId}</strong>
                    </div>
                    <div>
                      <span>วันเริ่มงาน</span>
                      <strong>
                        {displayDate(employee.employmentStart)}
                      </strong>
                    </div>
                    <div>
                      <span>วันเกิด</span>
                      <strong>
                        {displayDate(employee.dateOfBirth)}
                      </strong>
                    </div>
                  </div>

                  <div className="profile-detail-grid">
                    <div>
                      <span>รูปโปรไฟล์</span>
                      {employee.hasProfileImage ? (
                        <button className="secondary-button" type="button" onClick={() => void viewMedia(employee.employeeId, "PROFILE")}>
                          ดูรูปโปรไฟล์
                        </button>
                      ) : (
                        <strong>ไม่ได้แนบ</strong>
                      )}
                    </div>
                    <div>
                      <span>ลายเซ็น</span>
                      {employee.hasSignatureImage ? (
                        <button className="secondary-button" type="button" onClick={() => void viewMedia(employee.employeeId, "SIGNATURE")}>
                          ดูลายเซ็น
                        </button>
                      ) : (
                        <strong>ไม่ได้แนบ</strong>
                      )}
                    </div>
                  </div>

                  <div className="onboarding-approval-grid">
                    <label>
                      ทีม
                      <select
                        value={selected.agencyId}
                        disabled={busy === employee.employeeId}
                        onChange={(event) =>
                          setSelection((current) => ({
                            ...current,
                            [employee.employeeId]: {
                              ...selected,
                              agencyId: event.currentTarget.value,
                            },
                          }))
                        }
                      >
                        <option value="">เลือกทีม</option>
                        {state.options.agencies.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      ฝ่าย
                      <select
                        value={selected.departmentId}
                        disabled={busy === employee.employeeId}
                        onChange={(event) =>
                          setSelection((current) => ({
                            ...current,
                            [employee.employeeId]: {
                              ...selected,
                              departmentId: event.currentTarget.value,
                            },
                          }))
                        }
                      >
                        <option value="">เลือกฝ่าย</option>
                        {state.options.departments.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={
                        Boolean(busy) ||
                        !selected.agencyId ||
                        !selected.departmentId
                      }
                      onClick={() =>
                        void approve(employee.employeeId)
                      }
                    >
                      {busy === employee.employeeId
                        ? "กำลังอนุมัติ..."
                        : "อนุมัติและเปิดใช้งาน"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="module-panel">
        <p className="panel-description">
          พนักงานใหม่สมัครผ่านหน้าสมัครสมาชิกเดิม
          หน้านี้ใช้สำหรับผู้ดูแลอนุมัติเท่านั้น
          และไม่แสดงรหัสผ่านหรือข้อมูลบัญชี LINE
        </p>
      </section>
    </div>
  );
}
