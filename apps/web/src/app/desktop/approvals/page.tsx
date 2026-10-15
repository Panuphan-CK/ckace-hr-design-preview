"use client";

import type {
  ApprovalHistoryItem,
  ApprovalHistoryOverview,
  RequestStatusItem,
  RequestStatusOverview,
  UnifiedRequestKind,
} from "@ckace/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const KIND_LABEL: Readonly<Record<UnifiedRequestKind, string>> = {
  LEAVE: "การลา",
  TIME_CORRECTION: "แก้ไขเวลา",
  OVERTIME: "โอที",
  MEDICAL: "ค่ารักษาพยาบาล",
};

const KIND_ICON: Readonly<Record<UnifiedRequestKind, string>> = {
  LEAVE: "fa-solid fa-plane-up",
  TIME_CORRECTION: "fa-solid fa-user-clock",
  OVERTIME: "fa-solid fa-briefcase",
  MEDICAL: "fa-solid fa-first-aid",
};

const KIND_TONE: Readonly<Record<UnifiedRequestKind, string>> = {
  LEAVE: "green",
  TIME_CORRECTION: "blue",
  OVERTIME: "purple",
  MEDICAL: "cyan",
};

const APPROVAL_HASH: Readonly<Record<string, KindFilter>> = {
  "#all": "ALL",
  "#leave": "LEAVE",
  "#time-correction": "TIME_CORRECTION",
  "#overtime": "OVERTIME",
  "#medical": "MEDICAL",
};

type KindFilter = "ALL" | UnifiedRequestKind;
type ApprovalView = "pending" | "history";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      rows: readonly RequestStatusItem[];
      history: readonly ApprovalHistoryItem[];
    }
  | { status: "error"; message: string };

function kindHash(kind: KindFilter): string {
  if (kind === "LEAVE") return "#leave";
  if (kind === "TIME_CORRECTION") return "#time-correction";
  if (kind === "OVERTIME") return "#overtime";
  if (kind === "MEDICAL") return "#medical";
  return "#all";
}

function approvalHeading(kind: KindFilter): string {
  if (kind === "ALL") return "งานอนุมัติ";
  return "อนุมัติ" + KIND_LABEL[kind];
}

function decisionEndpoint(request: RequestStatusItem): string {
  const id = encodeURIComponent(request.id);
  switch (request.kind) {
    case "LEAVE":
      return `/api/leave/requests/${id}/decision`;
    case "TIME_CORRECTION":
      return `/api/attendance/time-corrections/${id}/decision`;
    case "OVERTIME":
      return `/api/overtime/requests/${id}/decision`;
    case "MEDICAL":
      return `/api/medical/claims/${id}/decision`;
  }
}

function decisionPayload(
  request: RequestStatusItem,
  decision: "APPROVED" | "REJECTED",
  comment: string,
): Record<string, unknown> {
  return request.kind === "LEAVE"
    ? {
        approvalStepId: request.approvalStepId,
        decision,
        comment: comment || null,
      }
    : {
        decision,
        comment,
      };
}

function loadError(status: number): string {
  if (status === 401) {
    return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  }
  if (status === 503) {
    return "Approval Center ยังไม่เปิดใช้งานใน environment นี้";
  }
  return "ไม่สามารถโหลดงานอนุมัติได้";
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DesktopApprovalsPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");
  const [view, setView] = useState<ApprovalView>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [assignedResponse, historyResponse] = await Promise.all([
        fetch("/api/requests/assigned", {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch("/api/requests/assigned/history", {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);

      if (!assignedResponse.ok) {
        throw new Error(loadError(assignedResponse.status));
      }
      if (!historyResponse.ok) {
        throw new Error(loadError(historyResponse.status));
      }

      const [assignedBody, historyBody] = await Promise.all([
        assignedResponse.json() as Promise<RequestStatusOverview>,
        historyResponse.json() as Promise<ApprovalHistoryOverview>,
      ]);

      setState({
        status: "ready",
        rows: assignedBody.requests.filter(
          (request) => request.canDecide && request.approvalStepId,
        ),
        history: historyBody.decisions,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดงานอนุมัติได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const syncHash = () => {
      const next = APPROVAL_HASH[window.location.hash];
      setKindFilter(next ?? "ALL");
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  function selectKind(kind: KindFilter) {
    setKindFilter(kind);
    if (window.location.hash !== kindHash(kind)) {
      window.location.hash = kindHash(kind);
    }
  }

  const visibleRows = useMemo(() => {
    if (state.status !== "ready") return [];
    const searchKey = search.trim().toLocaleLowerCase("th");
    return state.rows.filter((row) => {
      const matchesKind = kindFilter === "ALL" || row.kind === kindFilter;
      const matchesSearch =
        searchKey.length === 0 ||
        [
          row.employeeDisplayName ?? "",
          row.summary,
          KIND_LABEL[row.kind],
        ]
          .join(" ")
          .toLocaleLowerCase("th")
          .includes(searchKey);
      return matchesKind && matchesSearch;
    });
  }, [kindFilter, search, state]);

  const visibleHistory = useMemo(() => {
    if (state.status !== "ready") return [];
    const searchKey = search.trim().toLocaleLowerCase("th");
    return state.history.filter((row) => {
      const matchesKind = kindFilter === "ALL" || row.kind === kindFilter;
      const matchesSearch =
        searchKey.length === 0 ||
        [
          row.employeeDisplayName ?? "",
          row.summary,
          row.comment ?? "",
          KIND_LABEL[row.kind],
        ]
          .join(" ")
          .toLocaleLowerCase("th")
          .includes(searchKey);
      return matchesKind && matchesSearch;
    });
  }, [kindFilter, search, state]);

  const counts = useMemo(() => {
    const result = new Map<UnifiedRequestKind, number>();
    if (state.status !== "ready") return result;
    const source = view === "pending" ? state.rows : state.history;
    for (const row of source) {
      result.set(row.kind, (result.get(row.kind) ?? 0) + 1);
    }
    return result;
  }, [state, view]);

  async function decide(
    request: RequestStatusItem,
    decision: "APPROVED" | "REJECTED",
  ) {
    if (!request.approvalStepId || busyId) return;
    const comment = comments[request.id]?.trim() ?? "";
    if (decision === "REJECTED" && !comment) {
      setMessage({
        kind: "error",
        text: "กรุณาระบุเหตุผลก่อนเลือกไม่อนุมัติ",
      });
      return;
    }

    setBusyId(request.id);
    setMessage(null);
    try {
      const response = await fetch(decisionEndpoint(request), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(
          decisionPayload(request, decision, comment),
        ),
      });
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "ไม่มีสิทธิ์ตัดสินคำขอนี้ หรือคำขอถูกเปลี่ยนสถานะแล้ว"
            : response.status === 409
              ? "คำขอนี้ถูกเปลี่ยนสถานะแล้ว กรุณารีเฟรช"
              : response.status === 503
                ? "โมดูลนี้ยังไม่เปิด write authority ใน environment นี้"
                : "บันทึกผลอนุมัติไม่สำเร็จ",
        );
      }
      setMessage({
        kind: "success",
        text:
          decision === "APPROVED"
            ? "อนุมัติคำขอเรียบร้อยแล้ว"
            : "บันทึกไม่อนุมัติเรียบร้อยแล้ว",
      });
      setComments((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "บันทึกผลอนุมัติไม่สำเร็จ",
      });
    } finally {
      setBusyId(null);
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
        <h1>กำลังโหลดงานอนุมัติ</h1>
        <p>กำลังตรวจรายการและประวัติที่ Server อนุญาตให้คุณเข้าถึง</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">APPROVAL ERROR</div>
        <h1>โหลดงานอนุมัติไม่สำเร็จ</h1>
        <p>{state.message}</p>
        <button className="primary-button" onClick={() => void load()}>
          ลองใหม่
        </button>
      </section>
    );
  }

  const totalForCurrentView =
    view === "pending" ? state.rows.length : state.history.length;

  return (
    <div className="module-stack task396-approval-workspace task398-approval-page">
      <section className="module-heading">
        <div>
          <p className="eyebrow">APPROVAL WORKSPACE</p>
          <h1>{approvalHeading(kindFilter)}</h1>
          <p>
            {kindFilter === "ALL"
              ? "ตรวจรายการที่รอคุณดำเนินการและประวัติการอนุมัติจากสิทธิ์ที่ Server ยืนยัน"
              : "ตรวจรายการ" +
                KIND_LABEL[kindFilter] +
                "ที่รอคุณดำเนินการ และดูประวัติที่คุณตัดสินแล้ว"}
          </p>
        </div>
        <div className="task398-approval-head-actions">
          <div className="task398-approval-search">
            <input
              className="form-input"
              type="search"
              value={search}
              placeholder="ค้นหาข้อมูล..."
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
            <i className="fa-solid fa-search" aria-hidden="true" />
          </div>
          <button className="primary-button" onClick={() => void load()}>
            <i className="bx bx-refresh" aria-hidden="true" />
            Reload
          </button>
        </div>
      </section>

      <div className="task396-workspace-tabs" role="tablist" aria-label="มุมมองงานอนุมัติ">
        <button
          className={view === "pending" ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={view === "pending"}
          onClick={() => setView("pending")}
        >
          รอฉันอนุมัติ
          <span>{state.rows.length}</span>
        </button>
        <button
          className={view === "history" ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={view === "history"}
          onClick={() => setView("history")}
        >
          ประวัติการอนุมัติ
          <span>{state.history.length}</span>
        </button>
      </div>

      <section className="approval-kind-summary task396-kind-summary">
        {(["LEAVE", "TIME_CORRECTION", "OVERTIME", "MEDICAL"] as const).map(
          (kind) => (
            <button
              className={
                kindFilter === kind
                  ? "approval-kind-card active"
                  : "approval-kind-card"
              }
              key={kind}
              onClick={() => selectKind(kind)}
              type="button"
            >
              <span
                className={
                  "task398-kind-icon task398-kind-icon-" + KIND_TONE[kind]
                }
              >
                <i className={KIND_ICON[kind]} aria-hidden="true" />
              </span>
              <span className="task398-kind-label">{KIND_LABEL[kind]}</span>
              <strong>{counts.get(kind) ?? 0}</strong>
            </button>
          ),
        )}
        <button
          className={
            kindFilter === "ALL"
              ? "approval-kind-card active"
              : "approval-kind-card"
          }
          onClick={() => selectKind("ALL")}
          type="button"
        >
          <span className="task398-kind-icon task398-kind-icon-gray">
            <i className="fa-solid fa-layer-group" aria-hidden="true" />
          </span>
          <span className="task398-kind-label">ทั้งหมด</span>
          <strong>{totalForCurrentView}</strong>
        </button>
      </section>

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

      {view === "pending" ? (
        <section className="module-panel">
          {visibleRows.length === 0 ? (
            <div className="empty-state">
              <h3>ไม่มีรายการรออนุมัติ</h3>
              <p>
                {state.rows.length === 0
                  ? "Server ไม่พบรายการที่คุณมีสิทธิ์ตัดสินในขณะนี้"
                  : "ไม่มีรายการรออนุมัติในประเภทที่เลือก"}
              </p>
            </div>
          ) : (
            <div className="approval-grid">
              {visibleRows.map((request) => (
                <article
                  className={
                    "approval-card task398-approval-card task398-approval-card-" +
                    KIND_TONE[request.kind]
                  }
                  key={request.id}
                >
                  <div className="task398-approval-card-header">
                    <div className="task398-approval-card-kind">
                      <span
                        className={
                          "task398-approval-card-icon task398-kind-icon-" +
                          KIND_TONE[request.kind]
                        }
                      >
                        <i
                          className={KIND_ICON[request.kind]}
                          aria-hidden="true"
                        />
                      </span>
                      <div>
                        <strong>{KIND_LABEL[request.kind]}</strong>
                        <span>ขั้นที่ {request.stepOrder ?? "—"}</span>
                      </div>
                    </div>
                    <span className="request-status status-pending">
                      รออนุมัติ
                    </span>
                  </div>

                  <div className="task398-approval-card-body">
                    <h2>{request.employeeDisplayName ?? "พนักงาน"}</h2>
                    <p>{request.summary}</p>
                    <div className="task398-approval-card-meta">
                      <span>
                        <i className="fa-regular fa-clock" aria-hidden="true" />
                        ส่งเมื่อ {formatDateTime(request.submittedAt)}
                      </span>
                    </div>
                  </div>

                  <label className="approval-comment">
                    <span>ความเห็น / เหตุผล</span>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={comments[request.id] ?? ""}
                      onChange={(event) =>
                        setComments((current) => ({
                          ...current,
                          [request.id]: event.currentTarget.value,
                        }))
                      }
                      disabled={busyId === request.id}
                      placeholder="ไม่บังคับเมื่ออนุมัติ และจำเป็นเมื่อไม่อนุมัติ"
                    />
                  </label>

                  <div className="approval-actions task398-approval-card-footer">
                    <button
                      className="success-button"
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void decide(request, "APPROVED")}
                    >
                      <i className="fa-solid fa-check" aria-hidden="true" />
                      {busyId === request.id ? "กำลังบันทึก..." : "อนุมัติ"}
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void decide(request, "REJECTED")}
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                      ไม่อนุมัติ
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="module-panel task396-approval-history">
          <div className="panel-heading">
            <div>
              <span className="summary-kicker">ประวัติของฉัน</span>
              <h2>ประวัติการอนุมัติ</h2>
            </div>
          </div>

          {visibleHistory.length === 0 ? (
            <div className="empty-state">
              <h3>ยังไม่มีประวัติการอนุมัติ</h3>
              <p>รายการที่คุณอนุมัติหรือไม่อนุมัติแล้วจะปรากฏที่นี่</p>
            </div>
          ) : (
            <div className="data-table-wrap task398-approval-history-table-wrap">
              <table className="data-table task398-approval-history-table">
                <thead>
                  <tr>
                    <th>ประเภท</th>
                    <th>พนักงาน</th>
                    <th>รายละเอียด</th>
                    <th>ผลการอนุมัติ</th>
                    <th>ขั้นตอน</th>
                    <th>ความเห็น</th>
                    <th>วันที่ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleHistory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span
                          className={
                            "request-kind kind-" + item.kind.toLowerCase()
                          }
                        >
                          {KIND_LABEL[item.kind]}
                        </span>
                      </td>
                      <td>
                        <strong>{item.employeeDisplayName ?? "พนักงาน"}</strong>
                        <small>ส่ง {formatDateTime(item.submittedAt)}</small>
                      </td>
                      <td>{item.summary}</td>
                      <td>
                        <span
                          className={
                            item.decision === "APPROVED"
                              ? "request-status status-approved"
                              : "request-status status-rejected"
                          }
                        >
                          {item.decision === "APPROVED"
                            ? "อนุมัติแล้ว"
                            : "ไม่อนุมัติ"}
                        </span>
                      </td>
                      <td>ขั้นที่ {item.stepOrder}</td>
                      <td>{item.comment || "—"}</td>
                      <td>{formatDateTime(item.decidedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
