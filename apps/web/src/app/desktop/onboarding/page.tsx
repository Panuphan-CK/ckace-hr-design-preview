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

import "../ck-v2-pages.css";
import { Icon } from "../ui/icons";
import {
  DataGrid,
  DetailDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Message,
  PageHead,
  SectionHead,
  StatOrb,
  StatusDot,
} from "../ui/kit";
import { thaiDate } from "../ui/format";
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
  return thaiDate(value);
}

/** Shows the applicant's private image inline (same signed download as the "open" button). */
function MediaPreview({ employeeId, kind, label }: { readonly employeeId: string; readonly kind: "PROFILE" | "SIGNATURE"; readonly label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    void (async () => {
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
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        revoke = url;
        setSrc(url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [employeeId, kind]);
  return (
    <div className="ck-media-box">
      {src ? (
        <img src={src} alt={label} />
      ) : (
        <small>{failed ? "แสดงรูปไม่ได้" : "กำลังโหลด…"}</small>
      )}
    </div>
  );
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
  const [detail, setDetail] = useState<PendingEmployeeAdminItem | null>(null);
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
      setDetail(null);
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

  if (state.status === "loading") return <LoadingState title="กำลังโหลดรายชื่อผู้สมัคร" />;
  if (state.status === "error") {
    return <ErrorState title="เปิดหน้ารับพนักงานใหม่ไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;
  }

  const selected = detail ? (selection[detail.employeeId] ?? { agencyId: "", departmentId: "" }) : null;

  return (
    <>
      <PageHead tone="accent" icon="users" title="รับพนักงานใหม่" subtitle="ตรวจสอบผู้สมัคร กำหนดทีมและฝ่าย แล้วเปิดใช้งานบัญชี">
        <button className="ck-btn quiet" type="button" onClick={() => void load()}>
          <Icon name="refresh" size={16} /> รีเฟรช
        </button>
      </PageHead>

      <div className="ck-wrap ck-stack">
        {detail ? null : <Message value={message ? { kind: messageKind, text: message } : null} />}

        <div className="ck-orbrow">
          <StatOrb value={String(metrics?.pending ?? 0)} label="รออนุมัติ" tone="ot" />
          <StatOrb value={String(metrics?.lineLinked ?? 0)} label="เชื่อม LINE แล้ว" tone="leave" />
          <StatOrb value={String(metrics?.lineUnlinked ?? 0)} label="ยังไม่เชื่อม LINE" tone="gray" />
        </div>

        <section className="ck-panel ck-c-accent" aria-labelledby="ob-list">
          <SectionHead title="บัญชีที่รอเปิดใช้งาน" id="ob-list" count={visible.length}>
            <input
              className="ck-in ck-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="ค้นหาชื่อ / ชื่อผู้ใช้"
              aria-label="ค้นหาพนักงาน"
            />
          </SectionHead>
          <DataGrid
            rows={visible}
            rowKey={(employee) => employee.employeeId}
            onRowClick={(employee) => setDetail(employee)}
            empty={<EmptyState icon="users" title="ไม่มีบัญชีที่รออนุมัติ">เมื่อมีผู้สมัครใหม่ รายการจะปรากฏที่นี่</EmptyState>}
            columns={[
              { key: "st", header: "", width: "48px", align: "center", render: () => <StatusDot tone="wait" label="รออนุมัติ" /> },
              {
                key: "name",
                header: "ผู้สมัคร",
                render: (employee) => (
                  <span className="ck-gcell">
                    <span className="ck-av">{employee.fullName.slice(0, 1)}</span>
                    <b>{employee.fullName}</b>
                  </span>
                ),
              },
              { key: "nick", header: "ชื่อเล่น", render: (employee) => employee.nickname ?? "—" },
              { key: "login", header: "ชื่อผู้ใช้", render: (employee) => employee.loginName },
              { key: "start", header: "วันเริ่มงาน", render: (employee) => displayDate(employee.employmentStart) },
              {
                key: "line",
                header: "LINE",
                align: "center",
                render: (employee) => (
                  <StatusDot tone={employee.lineLinked ? "ok" : "muted"} label={employee.lineLinked ? "เชื่อม LINE แล้ว" : "ยังไม่เชื่อม LINE"} />
                ),
              },
              {
                key: "files",
                header: "รูป / ลายเซ็น",
                align: "center",
                render: (employee) => (
                  <span className="ck-row" style={{ justifyContent: "center" }}>
                    <StatusDot tone={employee.hasProfileImage ? "ok" : "muted"} label={employee.hasProfileImage ? "แนบรูปโปรไฟล์" : "ไม่ได้แนบรูปโปรไฟล์"} />
                    <StatusDot tone={employee.hasSignatureImage ? "ok" : "muted"} label={employee.hasSignatureImage ? "แนบลายเซ็น" : "ไม่ได้แนบลายเซ็น"} />
                  </span>
                ),
              },
              { key: "go", header: "", width: "40px", align: "center", render: () => <Icon name="chevron" size={16} /> },
            ]}
          />
        </section>
      </div>

      {detail && selected ? (
        <DetailDialog
          tone="accent"
          icon="user"
          kicker="ผู้สมัครใหม่"
          title={detail.fullName}
          status={{ label: "รออนุมัติ", tone: "wait" }}
          onClose={() => setDetail(null)}
          footer={
            <button
              className="ck-btn ok"
              type="button"
              disabled={Boolean(busy) || !selected.agencyId || !selected.departmentId}
              onClick={() => void approve(detail.employeeId)}
            >
              <Icon name="check" size={16} />
              {busy === detail.employeeId ? "กำลังอนุมัติ..." : "อนุมัติและเปิดใช้งาน"}
            </button>
          }
        >
          <Message value={message ? { kind: messageKind, text: message } : null} />
          <dl className="ck-dlg-grid">
            <div>
              <dt>ชื่อเล่น</dt>
              <dd>{detail.nickname ?? "—"}</dd>
            </div>
            <div>
              <dt>ชื่อผู้ใช้</dt>
              <dd>{detail.loginName}</dd>
            </div>
            <div>
              <dt>วันเริ่มงาน</dt>
              <dd>{displayDate(detail.employmentStart)}</dd>
            </div>
            <div>
              <dt>วันเกิด</dt>
              <dd>{displayDate(detail.dateOfBirth)}</dd>
            </div>
            <div>
              <dt>LINE</dt>
              <dd>{detail.lineLinked ? "เชื่อมบัญชีแล้ว" : "ยังไม่เชื่อมบัญชี"}</dd>
            </div>
          </dl>
          <div className="ck-dlg-sec">
            <h3>รูปโปรไฟล์และลายเซ็น</h3>
            <div className="ck-media-pair">
              <div>
                <small>รูปโปรไฟล์</small>
                {detail.hasProfileImage ? (
                  <>
                    <MediaPreview employeeId={detail.employeeId} kind="PROFILE" label="รูปโปรไฟล์ผู้สมัคร" />
                    <button className="ck-btn sm quiet" type="button" onClick={() => void viewMedia(detail.employeeId, "PROFILE")}>
                      ดูรูปโปรไฟล์
                    </button>
                  </>
                ) : (
                  <div className="ck-media-box">
                    <small>ไม่ได้แนบ</small>
                  </div>
                )}
              </div>
              <div>
                <small>ลายเซ็น</small>
                {detail.hasSignatureImage ? (
                  <>
                    <MediaPreview employeeId={detail.employeeId} kind="SIGNATURE" label="ลายเซ็นผู้สมัคร" />
                    <button className="ck-btn sm quiet" type="button" onClick={() => void viewMedia(detail.employeeId, "SIGNATURE")}>
                      ดูลายเซ็น
                    </button>
                  </>
                ) : (
                  <div className="ck-media-box">
                    <small>ไม่ได้แนบ</small>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="ck-dlg-sec">
            <h3>กำหนดทีมและฝ่าย</h3>
            <div className="ck-eform">
              <label className="ck-field">
                <span>ทีม</span>
                <select
                  className="ck-sselect"
                  value={selected.agencyId}
                  disabled={busy === detail.employeeId}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setSelection((current) => ({ ...current, [detail.employeeId]: { ...selected, agencyId: value } }));
                  }}
                >
                  <option value="">เลือกทีม</option>
                  {state.options.agencies.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ck-field">
                <span>ฝ่าย</span>
                <select
                  className="ck-sselect"
                  value={selected.departmentId}
                  disabled={busy === detail.employeeId}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setSelection((current) => ({ ...current, [detail.employeeId]: { ...selected, departmentId: value } }));
                  }}
                >
                  <option value="">เลือกฝ่าย</option>
                  {state.options.departments.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </DetailDialog>
      ) : null}
    </>
  );
}
