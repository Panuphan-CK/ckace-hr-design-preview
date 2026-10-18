"use client";

import type {
  ApprovalHistoryItem,
  ApprovalHistoryOverview,
  AttachmentDownloadResult,
  RequestStatusItem,
  RequestStatusOverview,
  UnifiedRequestKind,
} from "@ckace/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";

import { preparePrivateDownloadTab, showPrivateDownload } from "../private-download";
import { thaiDate, thaiDateTime } from "../ui/format";
import { Icon, type IconName } from "../ui/icons";
import { DetailDialog, EmptyState, ErrorState, Filters, LoadingState, Message, PageHead, SectionHead } from "../ui/kit";
import { RequestTimelineSection } from "../ui/request-timeline";
import {
  decideErrorMessage,
  decisionEndpoint,
  decisionPayload,
  withdrawEndpoint,
  initials,
  KIND_LABEL,
  KIND_TONE,
  kindFromHash,
  loadErrorMessage,
  matchesFilter,
  sortHistory,
  sortPending,
  type KindFilter,
} from "./approvals-view";

type State =
  | { status: "loading" }
  | { status: "ready"; rows: readonly RequestStatusItem[]; history: readonly ApprovalHistoryItem[] }
  | { status: "error"; message: string };
type DecisionFilter = "ALL" | "APPROVED" | "REJECTED";

const KIND_ICON: Readonly<Record<UnifiedRequestKind, IconName>> = {
  LEAVE: "leave",
  OVERTIME: "ot",
  TIME_CORRECTION: "time",
  MEDICAL: "med",
};

const DECISION: Readonly<Record<"APPROVED" | "REJECTED", { label: string; tone: string }>> = {
  APPROVED: { label: "อนุมัติ", tone: "ok" },
  REJECTED: { label: "ไม่อนุมัติ", tone: "bad" },
};

const DECISION_FILTERS: readonly { id: DecisionFilter; label: string }[] = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "APPROVED", label: "อนุมัติ" },
  { id: "REJECTED", label: "ไม่อนุมัติ" },
];

export default function DesktopApprovalsPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("ALL");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [detail, setDetail] = useState<ApprovalHistoryItem | null>(null);
  const [withdrawKinds, setWithdrawKinds] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [assignedResponse, historyResponse] = await Promise.all([
        fetch("/api/requests/assigned", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/requests/assigned/history", { credentials: "same-origin", cache: "no-store" }),
      ]);
      if (!assignedResponse.ok) throw new Error(loadErrorMessage(assignedResponse.status));
      if (!historyResponse.ok) throw new Error(loadErrorMessage(historyResponse.status));
      const assigned = (await assignedResponse.json()) as RequestStatusOverview;
      const history = (await historyResponse.json()) as ApprovalHistoryOverview;
      setState({
        status: "ready",
        rows: sortPending(assigned.requests.filter((request) => request.canDecide && request.approvalStepId)),
        history: sortHistory(history.decisions),
      });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "ไม่สามารถโหลดงานอนุมัติได้" });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Server-derived capability only controls whether the button is shown; the API re-checks it.
  useEffect(() => {
    void fetch("/api/security/session", { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          session: {
            navigation?: {
              leaveWithdraw?: boolean;
              overtimeWithdraw?: boolean;
              medicalWithdraw?: boolean;
              timeCorrectionWithdraw?: boolean;
            };
          } | null,
        ) => {
          const nav = session?.navigation;
          const kinds = new Set<string>();
          if (nav?.leaveWithdraw) kinds.add("LEAVE");
          if (nav?.overtimeWithdraw) kinds.add("OVERTIME");
          if (nav?.medicalWithdraw) kinds.add("MEDICAL");
          if (nav?.timeCorrectionWithdraw) kinds.add("TIME_CORRECTION");
          setWithdrawKinds(kinds);
        },
      )
      .catch(() => setWithdrawKinds(new Set()));
  }, []);

  // each approval type is its own page, selected by the menu link hash
  useEffect(() => {
    const sync = () => setKind(kindFromHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const pendingRows = useMemo(
    () => (state.status === "ready" ? state.rows.filter((row) => matchesFilter(row, kind, "")) : []),
    [state, kind],
  );
  const historyRows = useMemo(
    () =>
      state.status === "ready"
        ? state.history.filter((row) => (decisionFilter === "ALL" || row.decision === decisionFilter) && matchesFilter(row, kind, ""))
        : [],
    [state, kind, decisionFilter],
  );

  async function approveAllOvertime() {
    if (busyId || !window.confirm("อนุมัติคำขอ OT ที่รอคุณทั้งหมดในครั้งเดียว?")) return;
    setBusyId("bulk-ot");
    setMessage(null);
    try {
      const response = await fetch("/api/overtime/approve-all", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error(decideErrorMessage(response.status));
      const result = (await response.json()) as { approved: number; failed: readonly { requestId: string; reason: string }[] };
      setMessage(
        result.failed.length === 0
          ? { kind: "success", text: "อนุมัติ OT เรียบร้อย " + result.approved + " รายการ" }
          : { kind: "error", text: "อนุมัติได้ " + result.approved + " รายการ ไม่สำเร็จ " + result.failed.length + " รายการ (" + result.failed[0]?.reason + ")" },
      );
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "อนุมัติ OT ทั้งหมดไม่สำเร็จ" });
    } finally {
      setBusyId(null);
    }
  }

  async function withdrawApproved(item: ApprovalHistoryItem) {
    if (busyId) return;
    const reason = window.prompt("ระบุเหตุผลที่ถอน" + KIND_LABEL[item.kind] + "ที่อนุมัติแล้ว (จำเป็น)")?.trim();
    if (!reason) return;
    setBusyId(item.requestId);
    setMessage(null);
    try {
      const response = await fetch(withdrawEndpoint(item), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "ถอนได้เฉพาะผู้ดูแลระดับสูงสุดที่ดูแลพนักงานคนนี้"
            : response.status === 409
              ? "ใบลานี้ไม่อยู่ในสถานะอนุมัติแล้ว"
              : "ถอนใบลาไม่สำเร็จ",
        );
      }
      setDetail(null);
      setMessage({ kind: "success", text: "ถอนใบลาที่อนุมัติแล้วเรียบร้อย ระบบคืนสิทธิ์วันลาให้พนักงาน" });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "ถอนใบลาไม่สำเร็จ" });
    } finally {
      setBusyId(null);
    }
  }

  async function openReceipt(attachmentId: string) {
    let tab: Window | null = null;
    try {
      tab = preparePrivateDownloadTab();
      const response = await fetch(`/api/attachments/${encodeURIComponent(attachmentId)}/download`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("เปิดใบเสร็จไม่สำเร็จ หรือไม่มีสิทธิ์ดูไฟล์นี้");
      await showPrivateDownload(tab, (await response.json()) as AttachmentDownloadResult);
    } catch (error) {
      tab?.close();
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "เปิดใบเสร็จไม่สำเร็จ" });
    }
  }

  async function decide(request: RequestStatusItem, decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED") {
    if (!request.approvalStepId || busyId) return;
    const comment = comments[request.id]?.trim() ?? "";
    if (decision !== "APPROVED" && !comment) {
      setMessage({ kind: "error", text: decision === "REJECTED" ? "กรุณาระบุเหตุผลก่อนเลือกไม่อนุมัติ" : "กรุณาระบุสิ่งที่ต้องแก้ไขก่อนส่งกลับ" });
      return;
    }
    setBusyId(request.id);
    setMessage(null);
    try {
      const response = await fetch(decisionEndpoint(request), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(decisionPayload(request, decision, comment)),
      });
      if (!response.ok) throw new Error(decideErrorMessage(response.status));
      setMessage({ kind: "success", text: decision === "APPROVED" ? "อนุมัติคำขอเรียบร้อยแล้ว" : decision === "REJECTED" ? "บันทึกไม่อนุมัติเรียบร้อยแล้ว" : "ส่งกลับให้ผู้ขอแก้ไขเรียบร้อยแล้ว" });
      setComments((current) => {
        const next = { ...current };
        delete next[request.id];
        return next;
      });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "บันทึกผลอนุมัติไม่สำเร็จ" });
    } finally {
      setBusyId(null);
    }
  }

  if (state.status === "loading") return <LoadingState title="กำลังโหลดงานอนุมัติ" />;
  if (state.status === "error") return <ErrorState title="โหลดงานอนุมัติไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;

  const headTone = kind === "ALL" ? "accent" : KIND_TONE[kind];
  const headIcon: IconName = kind === "ALL" ? "check" : KIND_ICON[kind];
  const headTitle = kind === "ALL" ? "งานอนุมัติ" : "อนุมัติ" + KIND_LABEL[kind];
  const waiting = pendingRows.length;

  return (
    <>
      <PageHead
        tone={headTone}
        icon={headIcon}
        title={headTitle}
        subtitle={waiting > 0 ? `${waiting} คำขอรอคุณ` : "ไม่มีคำขอที่รอคุณพิจารณา"}
      />

      <div className="ck-wrap ck-stack">
        <Message value={message} />

        <section className={"ck-panel ck-c-" + headTone} aria-labelledby="ap-pending">
          <SectionHead title="รออนุมัติ" id="ap-pending" count={pendingRows.length}>
            {kind === "OVERTIME" && pendingRows.length > 1 ? (
              <button type="button" className="ck-btn ok" disabled={busyId !== null} onClick={() => void approveAllOvertime()}>
                อนุมัติ OT ทั้งหมด ({pendingRows.length})
              </button>
            ) : null}
          </SectionHead>
          {pendingRows.length === 0 ? (
            <EmptyState title="ไม่มีคำขอที่รออนุมัติ">คำขอที่ส่งถึงคุณจะแสดงที่นี่</EmptyState>
          ) : (
            <div className="ck-agrid">
              {pendingRows.map((request) => {
                const tone = KIND_TONE[request.kind];
                const busy = busyId === request.id;
                return (
                  <article key={request.id} className={"ck-acard ck-c-" + tone}>
                    <div className="ck-ac-top">
                      <span className="ck-chip">
                        <Icon name={KIND_ICON[request.kind]} />
                      </span>
                      <div className="ck-ac-t">
                        <b>{KIND_LABEL[request.kind]} · {request.requestNo}</b>
                        <small>{request.summary}</small>
                      </div>
                      <span className="ck-ac-when">{thaiDate(request.submittedAt)}</span>
                    </div>
                    <div className="ck-ac-emp">
                      <span className="ck-av">{initials(request.employeeDisplayName)}</span>
                      <span>
                        <b>{request.employeeDisplayName ?? "ไม่ระบุชื่อ"}</b>
                        <small>ยื่นเมื่อ {thaiDateTime(request.submittedAt)}</small>
                      </span>
                    </div>
                    {request.medical ? (
                      <div className="ck-ac-act" aria-label="รายละเอียดการเบิกค่ารักษา">
                        <span>
                          ยอดเบิก <b>{request.medical.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</b>
                          {" · "}วันที่ป่วย <b>{thaiDate(request.medical.sicknessDate)}</b>
                        </span>
                        {request.medical.attachmentIds.map((attachmentId, index) => (
                          <button
                            key={attachmentId}
                            type="button"
                            className="ck-btn"
                            onClick={() => void openReceipt(attachmentId)}
                          >
                            ดูใบเสร็จ{request.medical && request.medical.attachmentIds.length > 1 ? ` ${index + 1}` : ""}
                          </button>
                        ))}
                        {request.medical.attachmentIds.length === 0 ? <span>ไม่มีใบเสร็จแนบ</span> : null}
                      </div>
                    ) : null}
                    <div className="ck-prog" aria-label="สถานะการอนุมัติ">
                      <span className="s done">
                        <i>✓</i>ส่งแล้ว
                      </span>
                      <span className="ln" />
                      <span className="s now">
                        <i>{request.stepOrder ?? 1}</i>คุณ
                      </span>
                    </div>
                    <input
                      className="ck-in"
                      value={comments[request.id] ?? ""}
                      maxLength={1000}
                      placeholder="ความคิดเห็น (จำเป็นเมื่อไม่อนุมัติหรือส่งกลับ)"
                      aria-label="ความคิดเห็นของผู้อนุมัติ"
                      disabled={busy}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setComments((current) => ({ ...current, [request.id]: value }));
                      }}
                    />
                    <div className="ck-ac-act">
                      <button type="button" className="ck-btn ok" disabled={busyId !== null} onClick={() => void decide(request, "APPROVED")}>
                        <Icon name="check" size={16} />
                        {busy ? "กำลังบันทึก…" : "อนุมัติ"}
                      </button>
                      <button type="button" className="ck-btn no" disabled={busyId !== null} onClick={() => void decide(request, "REJECTED")}>
                        ไม่อนุมัติ
                      </button>
                      <button type="button" className="ck-btn" disabled={busyId !== null} onClick={() => void decide(request, "REVISION_REQUESTED")}>
                        ส่งกลับให้แก้ไข
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className={"ck-panel ck-c-" + headTone} aria-labelledby="ap-history">
          <SectionHead title={"ประวัติการอนุมัติ" + (kind === "ALL" ? "" : KIND_LABEL[kind])} id="ap-history" count={historyRows.length}>
            <Filters value={decisionFilter} options={DECISION_FILTERS} onChange={setDecisionFilter} />
          </SectionHead>
          {historyRows.length === 0 ? (
            <EmptyState title="ไม่มีประวัติการอนุมัติ">คำขอที่คุณพิจารณาแล้วจะแสดงที่นี่</EmptyState>
          ) : (
            <div className="ck-hgrid">
              {historyRows.map((row) => {
                const tone = KIND_TONE[row.kind];
                const decision = DECISION[row.decision];
                return (
                  <button key={row.id} type="button" className={"ck-hcard ck-c-" + tone} onClick={() => setDetail(row)}>
                    <span className="ck-hc-top">
                      <span className="ck-av">{initials(row.employeeDisplayName)}</span>
                      <span>
                        <b>{row.employeeDisplayName ?? "ไม่ระบุชื่อ"}</b>
                        <small>{KIND_LABEL[row.kind]} · {row.requestNo}</small>
                      </span>
                      <span className={"ck-pill " + decision.tone}>{decision.label}</span>
                    </span>
                    <dl className="ck-dl">
                      <div>
                        <dt>คำขอ</dt>
                        <dd>{row.summary}</dd>
                      </div>
                      <div>
                        <dt>วันที่</dt>
                        <dd>{thaiDate(row.submittedAt)}</dd>
                      </div>
                      <div>
                        <dt>ตัดสินเมื่อ</dt>
                        <dd>{thaiDate(row.decidedAt)}</dd>
                      </div>
                    </dl>
                    <span className="ck-hc-foot">
                      <span className="ck-more">
                        ดูรายละเอียด
                        <Icon name="chevron" size={14} />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {detail ? (
        <DetailDialog
          tone={KIND_TONE[detail.kind]}
          icon={KIND_ICON[detail.kind]}
          kicker={"รายละเอียด" + KIND_LABEL[detail.kind] + " " + detail.requestNo}
          title={detail.employeeDisplayName ?? "ไม่ระบุชื่อ"}
          status={DECISION[detail.decision]}
          onClose={() => setDetail(null)}
        >
          <dl className="ck-dlg-grid">
            <div>
              <dt>ยื่นเมื่อ</dt>
              <dd>{thaiDateTime(detail.submittedAt)}</dd>
            </div>
            <div>
              <dt>ตัดสินเมื่อ</dt>
              <dd>{thaiDateTime(detail.decidedAt)}</dd>
            </div>
            <div>
              <dt>ขั้นอนุมัติ</dt>
              <dd>ขั้นที่ {detail.stepOrder}</dd>
            </div>
          </dl>
          <div className="ck-dlg-sec">
            <h3>รายละเอียดคำขอ</h3>
            <p>{detail.summary}</p>
          </div>
          <div className="ck-dlg-sec">
            <h3>ความเห็นของผู้อนุมัติ</h3>
            <p>{detail.comment || "—"}</p>
          </div>
          {withdrawKinds.has(detail.kind) && detail.decision === "APPROVED" ? (
            <div className="ck-dlg-sec">
              <button type="button" className="ck-btn no" disabled={busyId !== null} onClick={() => void withdrawApproved(detail)}>
                ถอนใบลาที่อนุมัติแล้ว
              </button>
            </div>
          ) : null}
          <RequestTimelineSection requestId={detail.requestId} />
        </DetailDialog>
      ) : null}
    </>
  );
}
