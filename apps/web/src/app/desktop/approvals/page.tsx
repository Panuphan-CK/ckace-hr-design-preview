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

import "../ck-v2-pages.css";
import { preparePrivateDownloadTab, showPrivateDownload } from "../private-download";
import { thaiDate, thaiDateTime } from "../ui/format";
import { Icon, type IconName } from "../ui/icons";
import { DataGrid, DetailDialog, EmptyState, ErrorState, Filters, LoadingState, Message, PageHead, SectionHead, StatusDot, type DotTone } from "../ui/kit";
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
  requestFactLines,
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
  const [pendingDetail, setPendingDetail] = useState<RequestStatusItem | null>(null);
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
              ? "คำขอนี้ไม่อยู่ในสถานะอนุมัติแล้ว"
              : "ถอนคำขอไม่สำเร็จ",
        );
      }
      setDetail(null);
      setMessage({ kind: "success", text: "ถอนคำขอที่อนุมัติแล้วเรียบร้อย ระบบคืนสิทธิ์ให้พนักงาน" });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "ถอนคำขอไม่สำเร็จ" });
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
      setPendingDetail(null);
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
            <EmptyState icon="check" title="ไม่มีคำขอที่รออนุมัติ">คำขอที่ส่งถึงคุณจะแสดงที่นี่</EmptyState>
          ) : (
            <DataGrid
              rows={pendingRows}
              rowKey={(request) => request.id}
              onRowClick={(request) => {
                setMessage(null);
                setPendingDetail(request);
              }}
              columns={[
                { key: "st", header: "", width: "48px", align: "center", render: () => <StatusDot tone="wait" label="รอคุณอนุมัติ" /> },
                {
                  key: "kind",
                  header: "ประเภท",
                  render: (request) => (
                    <span className={"ck-gcell ck-c-" + KIND_TONE[request.kind]}>
                      <span className="ck-chip sm">
                        <Icon name={KIND_ICON[request.kind]} size={16} />
                      </span>
                      {KIND_LABEL[request.kind]}
                    </span>
                  ),
                },
                {
                  key: "emp",
                  header: "พนักงาน",
                  render: (request) => (
                    <span className="ck-gcell">
                      <span className="ck-av">{initials(request.employeeDisplayName)}</span>
                      <b>{request.employeeDisplayName ?? "ไม่ระบุชื่อ"}</b>
                    </span>
                  ),
                },
                {
                  key: "sum",
                  header: "รายละเอียด",
                  render: (request) => {
                    const facts = requestFactLines(request);
                    return (
                      <>
                        {facts.map((line) => (
                          <div key={line}>
                            <b>{line}</b>
                          </div>
                        ))}
                        <div>{request.summary}</div>
                      </>
                    );
                  },
                },
                {
                  key: "extra",
                  header: "ยอดเบิก",
                  align: "right",
                  render: (request) =>
                    request.medical ? request.medical.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 }) + " บาท" : "—",
                },
                { key: "at", header: "ยื่นเมื่อ", render: (request) => thaiDate(request.submittedAt) },
                { key: "go", header: "", width: "40px", align: "center", render: () => <Icon name="chevron" size={16} /> },
              ]}
            />
          )}
        </section>

        <section className={"ck-panel ck-c-" + headTone} aria-labelledby="ap-history">
          <SectionHead title={"ประวัติการอนุมัติ" + (kind === "ALL" ? "" : KIND_LABEL[kind])} id="ap-history" count={historyRows.length}>
            <Filters value={decisionFilter} options={DECISION_FILTERS} onChange={setDecisionFilter} />
          </SectionHead>
          {historyRows.length === 0 ? (
            <EmptyState icon="document" title="ไม่มีประวัติการอนุมัติ">คำขอที่คุณพิจารณาแล้วจะแสดงที่นี่</EmptyState>
          ) : (
            <DataGrid
              rows={historyRows}
              rowKey={(row) => row.id}
              onRowClick={(row) => setDetail(row)}
              columns={[
                {
                  key: "st",
                  header: "",
                  width: "48px",
                  align: "center",
                  render: (row) => <StatusDot tone={DECISION[row.decision].tone as DotTone} label={DECISION[row.decision].label} />,
                },
                {
                  key: "kind",
                  header: "ประเภท",
                  render: (row) => (
                    <span className={"ck-gcell ck-c-" + KIND_TONE[row.kind]}>
                      <span className="ck-chip sm">
                        <Icon name={KIND_ICON[row.kind]} size={16} />
                      </span>
                      {KIND_LABEL[row.kind]}
                    </span>
                  ),
                },
                {
                  key: "emp",
                  header: "พนักงาน",
                  render: (row) => (
                    <span className="ck-gcell">
                      <span className="ck-av">{initials(row.employeeDisplayName)}</span>
                      <b>{row.employeeDisplayName ?? "ไม่ระบุชื่อ"}</b>
                    </span>
                  ),
                },
                {
                  key: "sum",
                  header: "รายละเอียด",
                  render: (row) => (
                    <>
                      {requestFactLines(row).map((line) => (
                        <div key={line}>
                          <b>{line}</b>
                        </div>
                      ))}
                      <div>{row.summary}</div>
                    </>
                  ),
                },
                { key: "at", header: "ยื่นเมื่อ", render: (row) => thaiDate(row.submittedAt) },
                { key: "dec", header: "ตัดสินเมื่อ", render: (row) => thaiDate(row.decidedAt) },
              ]}
            />
          )}
        </section>
      </div>

      {pendingDetail ? (
        <DetailDialog
          tone={KIND_TONE[pendingDetail.kind]}
          icon={KIND_ICON[pendingDetail.kind]}
          kicker={"รออนุมัติ" + KIND_LABEL[pendingDetail.kind]}
          title={pendingDetail.employeeDisplayName ?? "ไม่ระบุชื่อ"}
          status={{ label: "รอคุณอนุมัติ", tone: "wait" }}
          onClose={() => setPendingDetail(null)}
          footer={
            <div className="ck-row ck-wrapbtn">
              <button type="button" className="ck-btn ok" disabled={busyId !== null} onClick={() => void decide(pendingDetail, "APPROVED")}>
                <Icon name="check" size={16} />
                {busyId === pendingDetail.id ? "กำลังบันทึก…" : "อนุมัติ"}
              </button>
              <button type="button" className="ck-btn no" disabled={busyId !== null} onClick={() => void decide(pendingDetail, "REJECTED")}>
                ไม่อนุมัติ
              </button>
              <button type="button" className="ck-btn back" disabled={busyId !== null} onClick={() => void decide(pendingDetail, "REVISION_REQUESTED")}>
                ส่งกลับให้แก้ไข
              </button>
            </div>
          }
        >
          <Message value={message} />
          <dl className="ck-dlg-grid">
            <div>
              <dt>ยื่นเมื่อ</dt>
              <dd>{thaiDateTime(pendingDetail.submittedAt)}</dd>
            </div>
            <div>
              <dt>ขั้นอนุมัติ</dt>
              <dd>ขั้นที่ {pendingDetail.stepOrder ?? 1}</dd>
            </div>
          </dl>
          <div className="ck-dlg-sec">
            <h3>รายละเอียดคำขอ</h3>
            {requestFactLines(pendingDetail).map((line) => (
              <p key={line}>
                <b>{line}</b>
              </p>
            ))}
            <p>{pendingDetail.summary}</p>
          </div>
          {pendingDetail.medical ? (
            <div className="ck-dlg-sec">
              <h3>การเบิกค่ารักษา</h3>
              <p>
                ยอดเบิก <b>{pendingDetail.medical.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</b>
                {" · "}วันที่ป่วย <b>{thaiDate(pendingDetail.medical.sicknessDate)}</b>
              </p>
              <div className="ck-row ck-wrapbtn">
                {pendingDetail.medical.attachmentIds.map((attachmentId, index) => (
                  <button key={attachmentId} type="button" className="ck-btn sm" onClick={() => void openReceipt(attachmentId)}>
                    <Icon name="clip" size={14} />
                    ดูใบเสร็จ{pendingDetail.medical && pendingDetail.medical.attachmentIds.length > 1 ? ` ${index + 1}` : ""}
                  </button>
                ))}
                {pendingDetail.medical.attachmentIds.length === 0 ? <span>ไม่มีใบเสร็จแนบ</span> : null}
              </div>
            </div>
          ) : null}
          {pendingDetail.leave?.attachmentIds && pendingDetail.leave.attachmentIds.length > 0 ? (
            <div className="ck-dlg-sec">
              <h3>ใบรับรองแพทย์</h3>
              <div className="ck-row ck-wrapbtn">
                {pendingDetail.leave.attachmentIds.map((attachmentId, index) => (
                  <button key={attachmentId} type="button" className="ck-btn sm" onClick={() => void openReceipt(attachmentId)}>
                    <Icon name="clip" size={14} />
                    ดูใบรับรองแพทย์{pendingDetail.leave && (pendingDetail.leave.attachmentIds?.length ?? 0) > 1 ? ` ${index + 1}` : ""}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="ck-dlg-sec">
            <h3>ความคิดเห็นของผู้อนุมัติ</h3>
            <input
              className="ck-in"
              value={comments[pendingDetail.id] ?? ""}
              maxLength={1000}
              placeholder="จำเป็นเมื่อไม่อนุมัติหรือส่งกลับ"
              aria-label="ความคิดเห็นของผู้อนุมัติ"
              disabled={busyId !== null}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setComments((current) => ({ ...current, [pendingDetail.id]: value }));
              }}
            />
          </div>
        </DetailDialog>
      ) : null}

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
            {requestFactLines(detail).map((line) => (
              <p key={line}>
                <b>{line}</b>
              </p>
            ))}
            <p>{detail.summary}</p>
          </div>
          <div className="ck-dlg-sec">
            <h3>ความเห็นของผู้อนุมัติ</h3>
            <p>{detail.comment || "—"}</p>
          </div>
          {withdrawKinds.has(detail.kind) && detail.decision === "APPROVED" ? (
            <div className="ck-dlg-sec">
              <button type="button" className="ck-btn no" disabled={busyId !== null} onClick={() => void withdrawApproved(detail)}>
                ถอน{detail.kind === "LEAVE" ? "ใบลา" : "คำขอ" + KIND_LABEL[detail.kind]}ที่อนุมัติแล้ว
              </button>
            </div>
          ) : null}
          <RequestTimelineSection requestId={detail.requestId} />
        </DetailDialog>
      ) : null}
    </>
  );
}
