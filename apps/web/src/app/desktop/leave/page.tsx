"use client";

import type {
  LeaveApprovalStepOptions,
  LeaveDurationCode,
  LeaveSelfOverview,
} from "@ckace/contracts";
import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

type PageState =
  | { status: "loading" }
  | {
      status: "ready";
      overview: LeaveSelfOverview;
      approvalOptions: readonly LeaveApprovalStepOptions[];
    }
  | { status: "error"; message: string };

import {
  resolveSubmissionIntent,
  shouldDiscardSubmissionIntent,
  type SubmissionIntent,
} from "../submission-intent";
import {
  RequestListToolbar,
  RequestWorkspaceTabs,
  type RequestWorkspaceView,
} from "../request-workspace-tabs";

const STATUS_LABEL: Readonly<Record<string, string>> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
  REVISION_REQUESTED: "ส่งกลับแก้ไข",
};

const DURATION_LABEL: Readonly<
  Record<LeaveDurationCode, string>
> = {
  FULL_DAY: "เต็มวัน",
  MORNING: "ครึ่งวันเช้า",
  AFTERNOON: "ครึ่งวันบ่าย",
  HOURLY: "รายชั่วโมง",
};

function errorMessage(status: number): string {
  if (status === 401) {
    return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  }
  if (status === 403) {
    return "บัญชีนี้ไม่มีสิทธิ์ใช้งานเมนูการลา";
  }
  if (status === 409) {
    return "รายการคำขอลาซ้ำหรือสถานะเปลี่ยนแล้ว กรุณารีเฟรช";
  }
  if (status === 503) {
    return "โมดูลการลายังไม่เปิดใช้งานใน environment นี้";
  }
  return "ไม่สามารถโหลดข้อมูลการลาได้ กรุณาลองใหม่อีกครั้ง";
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(errorMessage(response.status));
  }
  return response.json() as Promise<T>;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day
    ? `${day}/${month}/${year}`
    : value;
}

export default function LeaveDesktopPage() {
  const [state, setState] = useState<PageState>({
    status: "loading",
  });
  const [submitting, setSubmitting] = useState(false);
  const createIntent = useRef<SubmissionIntent | null>(null);
  const [actionMessage, setActionMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);
  const [duration, setDuration] =
    useState<LeaveDurationCode>("FULL_DAY");
  const [workspaceView, setWorkspaceView] =
    useState<RequestWorkspaceView>("new");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestMonth, setRequestMonth] = useState("");

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [overview, approvalOptions] = await Promise.all([
        getJson<LeaveSelfOverview>("/api/leave/me"),
        getJson<readonly LeaveApprovalStepOptions[]>(
          "/api/leave/approval-options",
        ),
      ]);
      setState({
        status: "ready",
        overview,
        approvalOptions,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลการลาได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(() => {
    if (state.status !== "ready") return 0;
    return state.overview.requests.filter(
      (request) =>
        request.status === "PENDING" ||
        request.status === "REVISION_REQUESTED",
    ).length;
  }, [state]);

  async function submitLeave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (state.status !== "ready" || submitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const approverEmployeeIds =
      state.approvalOptions.map((step) =>
        String(
          data.get(`approver-${step.stepOrder}`) ?? "",
        ),
      );

    const payload = {
      entitlementId: String(data.get("entitlementId") ?? ""),
      description: String(data.get("description") ?? ""),
      startDate: String(data.get("startDate") ?? ""),
      endDate: String(data.get("endDate") ?? ""),
      durationCode: duration,
      startTime: duration === "HOURLY" ? String(data.get("startTime") ?? "") : null,
      endTime: duration === "HOURLY" ? String(data.get("endTime") ?? "") : null,
      approverEmployeeIds,
    };
    createIntent.current = resolveSubmissionIntent(createIntent.current, payload);
    setSubmitting(true);
    setActionMessage(null);
    try {
      const response = await fetch("/api/leave/requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ ...payload, clientKey: createIntent.current.clientKey }),
      });

      if (!response.ok) {
        if (shouldDiscardSubmissionIntent(response.status)) {
          createIntent.current = null;
        }
        throw new Error(errorMessage(response.status));
      }

      createIntent.current = null;
      form.reset();
      setDuration("FULL_DAY");
      setActionMessage({
        kind: "success",
        text: "ส่งคำขอลาเรียบร้อยแล้ว",
      });
      await load();
    } catch (error) {
      setActionMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "ส่งคำขอลาไม่สำเร็จ",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest(requestId: string) {
    if (
      submitting ||
      !window.confirm("ยืนยันยกเลิกคำขอลานี้?")
    ) {
      return;
    }
    setSubmitting(true);
    setActionMessage(null);
    try {
      const response = await fetch(
        `/api/leave/requests/${encodeURIComponent(requestId)}/cancel`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      if (!response.ok) {
        throw new Error(errorMessage(response.status));
      }
      setActionMessage({
        kind: "success",
        text: "ยกเลิกคำขอลาเรียบร้อยแล้ว",
      });
      await load();
    } catch (error) {
      setActionMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "ยกเลิกคำขอลาไม่สำเร็จ",
      });
    } finally {
      setSubmitting(false);
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
        <h1>กำลังโหลดข้อมูลการลา</h1>
        <p>กำลังตรวจสอบสิทธิ์และข้อมูลล่าสุดจาก Server</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">LEAVE ERROR</div>
        <h1>เปิดเมนูการลาไม่สำเร็จ</h1>
        <p>{state.message}</p>
        <button className="primary-button" onClick={() => void load()}>
          ลองใหม่
        </button>
      </section>
    );
  }

  const { overview, approvalOptions } = state;
  const hasAvailableEntitlement = overview.entitlements.some(
    (item) => item.remaining > 0,
  );
  const pendingRequests = overview.requests.filter(
    (request) =>
      request.status === "PENDING" ||
      request.status === "REVISION_REQUESTED",
  );
  const historyRequests = overview.requests.filter(
    (request) =>
      request.status !== "PENDING" &&
      request.status !== "REVISION_REQUESTED",
  );
  const visibleRequests =
    workspaceView === "pending" ? pendingRequests : historyRequests;
  const requestSearchKey = requestSearch.trim().toLocaleLowerCase("th");
  const filteredVisibleRequests = visibleRequests.filter((request) => {
    const matchesSearch =
      requestSearchKey.length === 0 ||
      [
        request.leaveTypeName,
        request.description,
        STATUS_LABEL[request.status] ?? request.status,
        request.decisionReason ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("th")
        .includes(requestSearchKey);
    const matchesMonth =
      requestMonth.length === 0 || request.startDate.slice(5, 7) === requestMonth;
    return matchesSearch && matchesMonth;
  });

  return (
    <div className="module-stack task398-request-page">
      <section className="module-heading">
        <div>
          <p className="eyebrow">LEAVE DESKTOP</p>
          <h1>การลา</h1>
          <p>
            ตรวจสอบสิทธิ์ ยื่นคำขอ และติดตามประวัติการลา
            ผ่าน Project B Desktop
          </p>
        </div>
      </section>

      <RequestWorkspaceTabs
        value={workspaceView}
        onChange={setWorkspaceView}
        newLabel="ยื่นใบลา"
        pendingCount={pendingRequests.length}
        historyCount={historyRequests.length}
      />

      {actionMessage ? (
        <div
          className={
            actionMessage.kind === "success"
              ? "action-message success"
              : "action-message error"
          }
          role={actionMessage.kind === "error" ? "alert" : "status"}
        >
          {actionMessage.text}
        </div>
      ) : null}

      <section className="metric-grid">
        <article className="metric-card">
          <span>สิทธิ์การลา</span>
          <strong>{overview.entitlements.length}</strong>
          <small>ประเภทที่มีสิทธิ์</small>
        </article>
        <article className="metric-card">
          <span>คำขอทั้งหมด</span>
          <strong>{overview.requests.length}</strong>
          <small>รวมประวัติที่แสดงในระบบ</small>
        </article>
        <article className="metric-card">
          <span>กำลังดำเนินการ</span>
          <strong>{pendingCount}</strong>
          <small>รออนุมัติ / ส่งกลับแก้ไข</small>
        </article>
      </section>

      <section className="entitlement-grid">
        {overview.entitlements.length === 0 ? (
          <div className="empty-state compact">
            <h3>ยังไม่มีสิทธิ์การลา</h3>
            <p>กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบสิทธิ์การลา</p>
          </div>
        ) : null}
        {overview.entitlements.map((item) => (
          <article
            className="entitlement-card"
            key={item.entitlementId}
          >
            <div>
              <span className="summary-kicker">
                {item.leaveTypeKey}
              </span>
              <h2>{item.leaveTypeName}</h2>
            </div>
            <div className="entitlement-values">
              <div>
                <strong>{item.remaining}</strong>
                <span>คงเหลือ</span>
              </div>
              <div>
                <strong>{item.used}</strong>
                <span>ใช้แล้ว</span>
              </div>
              <div>
                <strong>{item.quota}</strong>
                <span>สิทธิ์ทั้งหมด</span>
              </div>
            </div>
          </article>
        ))}
      </section>

      {workspaceView === "new" ? (
      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NEW REQUEST</p>
            <h2>ยื่นใบลา</h2>
          </div>
          {approvalOptions.length === 0 ? (
            <span className="status-badge error">
              ไม่มีสายอนุมัติ
            </span>
          ) : null}
        </div>

        {!hasAvailableEntitlement ? (
          <div className="action-message error" role="alert">
            ไม่มีสิทธิ์การลาคงเหลือ จึงยังไม่สามารถยื่นคำขอลาใหม่ได้
          </div>
        ) : null}

        <form className="leave-form" onSubmit={submitLeave}>
          <label>
            <span>ประเภทการลา</span>
            <select name="entitlementId" required>
              <option value="">เลือกประเภทการลา</option>
              {overview.entitlements.map((item) => (
                <option
                  key={item.entitlementId}
                  value={item.entitlementId}
                  disabled={item.remaining <= 0}
                >
                  {item.leaveTypeName} — คงเหลือ {item.remaining}
                </option>
              ))}
            </select>
          </label>

          <label className="form-span-2">
            <span>เหตุผลการลา</span>
            <textarea
              name="description"
              rows={3}
              maxLength={2000}
              required
            />
          </label>

          <label>
            <span>วันที่เริ่ม</span>
            <input name="startDate" type="date" required />
          </label>

          <label>
            <span>วันที่สิ้นสุด</span>
            <input name="endDate" type="date" required />
          </label>

          <label>
            <span>ช่วงเวลา</span>
            <select
              name="durationCode"
              value={duration}
              onChange={(event) =>
                setDuration(
                  event.currentTarget
                    .value as LeaveDurationCode,
                )
              }
            >
              {Object.entries(DURATION_LABEL).map(
                ([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>

          {duration === "HOURLY" ? (
            <>
              <label>
                <span>เวลาเริ่ม</span>
                <input name="startTime" type="time" required />
              </label>
              <label>
                <span>เวลาสิ้นสุด</span>
                <input name="endTime" type="time" required />
              </label>
            </>
          ) : null}

          {approvalOptions.map((step) => (
            <label key={step.stepOrder}>
              <span>
                ผู้อนุมัติขั้นที่ {step.stepOrder}
              </span>
              <select
                name={`approver-${step.stepOrder}`}
                required
              >
                <option value="">
                  เลือกผู้อนุมัติ
                </option>
                {step.candidates.map((candidate) => (
                  <option
                    key={candidate.employeeId}
                    value={candidate.employeeId}
                  >
                    {candidate.displayName}
                  </option>
                ))}
              </select>
              <small className="field-help">
                {step.requiredRoleKey} · {step.scope}
              </small>
            </label>
          ))}

          <div className="form-actions form-span-2">
            <button
              className="primary-button"
              type="submit"
              disabled={
                submitting ||
                !hasAvailableEntitlement ||
                approvalOptions.length === 0
              }
            >
              {submitting
                ? "กำลังบันทึก…"
                : "ส่งคำขอลา"}
            </button>
          </div>
        </form>
      </section>
      ) : null}

      {workspaceView !== "new" ? (
      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              {workspaceView === "pending" ? "IN PROGRESS" : "HISTORY"}
            </p>
            <h2>
              {workspaceView === "pending"
                ? "คำขอลาที่กำลังดำเนินการ"
                : "ประวัติการลา"}
            </h2>
          </div>
          <span className="muted">
            {filteredVisibleRequests.length} รายการ
          </span>
        </div>

        <RequestListToolbar
          search={requestSearch}
          onSearchChange={setRequestSearch}
          month={requestMonth}
          onMonthChange={setRequestMonth}
          onClear={() => {
            setRequestSearch("");
            setRequestMonth("");
          }}
          onCreate={() => setWorkspaceView("new")}
          createLabel="ขออนุญาตลา"
          searchPlaceholder="ค้นหาเหตุผลลา..."
        />

        {filteredVisibleRequests.length === 0 ? (
          <div className="empty-state">
            <h3>
              {workspaceView === "pending"
                ? "ไม่มีคำขอที่กำลังดำเนินการ"
                : "ยังไม่มีประวัติการลา"}
            </h3>
            <p>
              {workspaceView === "pending"
                ? "คำขอที่รออนุมัติหรือถูกส่งกลับแก้ไขจะแสดงที่นี่"
                : "คำขอที่สิ้นสุดแล้วจะแสดงที่นี่"}
            </p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ประเภท</th>
                  <th>ช่วงวันที่</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                  <th>เหตุผล</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisibleRequests.map((request) => (
                  <tr key={request.requestId}>
                    <td>
                      <strong>{request.leaveTypeName}</strong>
                      <small>{request.description}</small>
                    </td>
                    <td>
                      {formatDate(request.startDate)}
                      {request.endDate !== request.startDate
                        ? ` – ${formatDate(request.endDate)}`
                        : ""}
                      <small>
                        {DURATION_LABEL[request.durationCode]}
                        {request.startTime && request.endTime
                          ? ` ${request.startTime}–${request.endTime}`
                          : ""}
                      </small>
                    </td>
                    <td>{request.usageDays}</td>
                    <td>
                      <span
                        className={`request-status status-${request.status.toLowerCase()}`}
                      >
                        {STATUS_LABEL[request.status] ??
                          request.status}
                      </span>
                    </td>
                    <td>
                      {request.decisionReason || "—"}
                    </td>
                    <td>
                      {request.status === "PENDING" ||
                      request.status ===
                        "REVISION_REQUESTED" ? (
                        <button
                          className="danger-button compact"
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            void cancelRequest(
                              request.requestId,
                            )
                          }
                        >
                          ยกเลิก
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : null}
    </div>
  );
}
