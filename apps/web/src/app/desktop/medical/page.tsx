"use client";

import type {
  AttachmentDownloadResult,
  LeaveSelfOverview,
  MedicalClaimStatus,
  MedicalClaimView,
  MedicalCreateResult,
  MedicalSelfOverview,
} from "@ckace/contracts";
import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  resolveSubmissionIntent,
  shouldDiscardSubmissionIntent,
  type SubmissionIntent,
} from "../submission-intent";
import { DatePicker } from "../ui/date-picker";
import { thaiDate, thaiDateRange, thaiDateTime } from "../ui/format";
import { Icon } from "../ui/icons";
import { DataGrid, DetailDialog, EmptyState, ErrorState, Filters, LoadingState, Message, PageHead, SectionHead, StatusDot, type DotTone } from "../ui/kit";
import { useConfirm } from "../ui/confirm";
import "../requests-common/ck-v2-requests.css";
import { ApproverChainNotice } from "../ui/approver-chain";
import { RequestTimelineSection } from "../ui/request-timeline";
import { ResubmitPanel, type ResubmitOutcome } from "../ui/resubmit-panel";
import {
  completeMedicalReceiptUploads,
  errorMessage,
  MedicalReceiptFinalizeUncertainError,
  type MedicalReceiptProgress,
} from "./medical-receipt-upload";
import { preparePrivateDownloadTab, showPrivateDownload } from "../private-download";

import {
  MEDICAL_DESKTOP_PER_CLAIM_LIMIT,
  formatMedicalBytes,
  shouldCleanupUnlinkedReceipts,
  validateReceiptCandidates,
} from "./medical-view";

type PageState =
  | { status: "loading" }
  | { status: "ready"; overview: MedicalSelfOverview }
  | { status: "error"; message: string };

type ActionMessage =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

const currency = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

function todayBangkok(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

type Filter = "ALL" | MedicalClaimStatus;

const STATUS: Readonly<Record<MedicalClaimStatus, { label: string; tone: string }>> = {
  PENDING: { label: "รออนุมัติ", tone: "wait" },
  APPROVED: { label: "อนุมัติ", tone: "ok" },
  REJECTED: { label: "ไม่อนุมัติ", tone: "bad" },
  CANCELLED: { label: "ยกเลิก", tone: "muted" },
  REVISION_REQUESTED: { label: "รอแก้ไข", tone: "wait" },
};

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "PENDING", label: "รออนุมัติ" },
  { id: "APPROVED", label: "อนุมัติ" },
  { id: "REJECTED", label: "ไม่อนุมัติ" },
];

async function cleanupAttachments(
  attachmentIds: readonly string[],
): Promise<void> {
  await Promise.allSettled(
    attachmentIds.map((attachmentId) =>
      fetch(
        `/api/attachments/${encodeURIComponent(attachmentId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      ),
    ),
  );
}

export default function DesktopMedicalPage() {
  const [state, setState] = useState<PageState>({
    status: "loading",
  });
  const [leaveOverview, setLeaveOverview] =
    useState<LeaveSelfOverview | null>(null);
  const [files, setFiles] = useState<readonly File[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const createIntent = useRef<SubmissionIntent | null>(null);
  const uploadedForIntent = useRef<MedicalReceiptProgress | null>(null);
  const [message, setMessage] =
    useState<ActionMessage | null>(null);
  const [sicknessDate, setSicknessDate] = useState("");
  const [amountText, setAmountText] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [detail, setDetail] = useState<MedicalClaimView | null>(null);
  const { ask: confirmAsk, dialog: confirmDialog } = useConfirm();
  const today = useMemo(() => todayBangkok(), []);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const medicalResponse = await fetch("/api/medical/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!medicalResponse.ok) {
        throw new Error(
          medicalResponse.status === 409
            ? "ยังไม่ได้ตั้งวงเงินค่ารักษาพยาบาล ผู้ดูแลระบบตั้งได้ที่ ตั้งค่า > วงเงินค่ารักษา"
            : errorMessage(medicalResponse.status),
        );
      }
      const overview =
        (await medicalResponse.json()) as MedicalSelfOverview;
      setState({ status: "ready", overview });

      void fetch("/api/leave/me", {
        credentials: "same-origin",
        cache: "no-store",
      })
        .then(async (response) =>
          response.ok
            ? ((await response.json()) as LeaveSelfOverview)
            : null,
        )
        .then(setLeaveOverview)
        .catch(() => setLeaveOverview(null));
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลค่ารักษาพยาบาลได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitClaim(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (state.status !== "ready" || busy) return;

    const fileError = validateReceiptCandidates(files);
    if (fileError) {
      setMessage({ kind: "error", text: fileError });
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    const sicknessDate = String(
      data.get("sicknessDate") ?? "",
    );
    const amount = Number(data.get("amount"));
    const description = String(
      data.get("description") ?? "",
    ).trim();
    const leaveRequestId =
      String(data.get("leaveRequestId") ?? "").trim() ||
      null;

    if (
      !sicknessDate ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !description
    ) {
      setMessage({
        kind: "error",
        text: "กรุณากรอกวันที่ จำนวนเงิน และรายละเอียดให้ครบ",
      });
      return;
    }

    const intentPayload = {
      sicknessDate, amount, description, leaveRequestId,
      files: files.map((file) => ({
        name: file.name, mimeType: file.type,
        size: file.size, lastModified: file.lastModified,
      })),
    };
    createIntent.current = resolveSubmissionIntent(createIntent.current, intentPayload);
    const intent = createIntent.current;
    const progress: MedicalReceiptProgress =
      uploadedForIntent.current?.signature === intent.signature
        ? uploadedForIntent.current
        : { signature: intent.signature, receipts: [] };
    uploadedForIntent.current = progress;
    let postAttempted = false;
    let definiteRejection = false;
    setBusy("create");
    setMessage(null);
    try {
      const attachmentIds = await completeMedicalReceiptUploads(files, progress);

      postAttempted = true;
      const response = await fetch("/api/medical/claims", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sicknessDate,
          amount,
          description,
          attachmentIds,
          leaveRequestId,
          clientKey: intent.clientKey,
        }),
      });
      if (!response.ok) {
        definiteRejection = shouldDiscardSubmissionIntent(response.status);
        throw new Error(errorMessage(response.status));
      }
      const result =
        (await response.json()) as MedicalCreateResult;
      setMessage({
        kind: "success",
        text:
          `ส่งคำขอเบิก ${currency.format(result.claim.amount)} เรียบร้อยแล้ว` +
          (result.warnings.length
            ? ` มีคำเตือน ${result.warnings.length} รายการ`
            : ""),
      });
      createIntent.current = null;
      uploadedForIntent.current = null;
      form.reset();
      setFiles([]);
      setSicknessDate("");
      setAmountText("");
      await load();
    } catch (error) {
      // Never delete potentially linked receipts after an uncertain POST outcome.
      const finalizeUncertain = error instanceof MedicalReceiptFinalizeUncertainError;
      // A pending finalize must keep its ID for explicit same-intent retry.
      // Clean only finalized, unlinked receipts after a certain prewrite failure
      // or definite claim rejection; never delete an uncertain finalize object.
      if (!finalizeUncertain && shouldCleanupUnlinkedReceipts(postAttempted, definiteRejection)) {
        await cleanupAttachments(
          progress.receipts.filter((receipt) => receipt.finalized).map((receipt) => receipt.id),
        );
        uploadedForIntent.current = null;
        if (definiteRejection) createIntent.current = null;
      }
      setMessage({
        kind: "error",
        text: postAttempted && !definiteRejection
          ? "ยังยืนยันผลการบันทึกไม่ได้ กรุณาตรวจประวัติคำขอก่อนส่งซ้ำ (ระบบจะใช้รหัสคำขอเดิม)"
          : error instanceof Error
            ? error.message
            : "ส่งคำขอเบิกไม่สำเร็จ",
      });
    } finally {
      setBusy(null);
    }
  }

  async function resubmitClaim(claim: MedicalClaimView, values: Record<string, string>, clientKey: string): Promise<ResubmitOutcome> {
    const amount = Number(values.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, status: 400, message: "กรุณาระบุจำนวนเงินให้ถูกต้อง" };
    }

    try {
      const response = await fetch(`/api/medical/claims/${encodeURIComponent(claim.id)}/resubmit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          clientKey,
          sicknessDate: values.sicknessDate,
          amount,
          description: values.description,
        }),
      });
      if (!response.ok) return { ok: false, status: response.status, message: errorMessage(response.status) };
      setDetail(null);
      setMessage({ kind: "success", text: "ส่งคำขอเบิกที่แก้ไขแล้วกลับไปให้ผู้อนุมัติเรียบร้อยแล้ว" });
      await load();
      return { ok: true };
    } catch {
      return { ok: false, status: 503, message: "ส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
    }
  }

  async function cancelClaim(claim: MedicalClaimView) {
    if (
      busy ||
      (claim.status !== "PENDING" && claim.status !== "REVISION_REQUESTED") ||
      !(await confirmAsk("ยืนยันยกเลิกคำขอเบิกนี้?", "ยืนยันยกเลิก"))
    ) {
      return;
    }
    setBusy(claim.id);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/medical/claims/${encodeURIComponent(claim.id)}/cancel`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      if (!response.ok) {
        throw new Error(errorMessage(response.status));
      }
      setMessage({
        kind: "success",
        text: "ยกเลิกคำขอเบิกเรียบร้อยแล้ว",
      });
      await load();
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "ยกเลิกคำขอเบิกไม่สำเร็จ",
      });
    } finally {
      setBusy(null);
    }
  }

  async function downloadReceipt(attachmentId: string) {
    if (busy) return;
    setBusy(attachmentId);
    setMessage(null);
    let tab: Window | null = null;
    try {
      tab = preparePrivateDownloadTab();
      const response = await fetch(
        `/api/attachments/${encodeURIComponent(attachmentId)}/download`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      if (!response.ok) {
        throw new Error(errorMessage(response.status));
      }
      const result =
        (await response.json()) as AttachmentDownloadResult;
      await showPrivateDownload(tab, result);
    } catch (error) {
      tab?.close();
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "เปิดใบเสร็จไม่สำเร็จ",
      });
    } finally {
      setBusy(null);
    }
  }

  if (state.status === "loading") return <LoadingState title="กำลังโหลดค่ารักษาพยาบาล" />;
  if (state.status === "error") return <ErrorState title="เปิดหน้าค่ารักษาพยาบาลไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;

  const { overview } = state;
  const maxAmount = Math.max(0, Math.min(MEDICAL_DESKTOP_PER_CLAIM_LIMIT, overview.entitlement.remaining));
  const leaveOptions = leaveOverview?.requests.filter((request) => request.status !== "CANCELLED" && request.leaveTypeKey.toUpperCase() === "SICK") ?? [];
  const claims = [...overview.claims].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const filtered = filter === "ALL" ? claims : claims.filter((claim) => claim.status === filter);
  const amountNumber = Number(amountText);
  const overLimit = Number.isFinite(amountNumber) && amountNumber > maxAmount;
  const usedPercent = overview.entitlement.annualLimit > 0 ? Math.min(((overview.entitlement.annualLimit - overview.entitlement.remaining) / overview.entitlement.annualLimit) * 100, 100) : 0;

  return (
    <>
      <PageHead tone="med" icon="med" title="เบิกค่ารักษา" subtitle="เบิกค่ารักษาพยาบาลและดูวงเงินคงเหลือของปีนี้">
        <div className="ck-minibal">
          <span className="ck-c-med">
            <i />
            คงเหลือ <b>{currency.format(overview.entitlement.remaining)}</b>
          </span>
          <span className="ck-c-ot">
            <i />
            รออนุมัติ <b>{currency.format(Math.max(overview.entitlement.committed - overview.entitlement.approved, 0))}</b>
          </span>
        </div>
      </PageHead>

      <div className="ck-wrap ck-stack">
        <Message value={message} />

        <form className="ck-fbox ck-c-med" onSubmit={submitClaim} noValidate>
          <SectionHead title="ขอเบิกค่ารักษา" hint={`สูงสุด ${currency.format(MEDICAL_DESKTOP_PER_CLAIM_LIMIT)} ต่อครั้ง`} />
          {maxAmount <= 0 ? (
            <p className="ck-msg error" role="alert" style={{ marginBottom: 16 }}>
              วงเงินค่ารักษาของปีนี้ไม่เพียงพอสำหรับการเบิกเพิ่ม
            </p>
          ) : null}
          <div className="ck-fgrid">
            <div className="ck-field">
              <span>วันที่รักษา</span>
              <DatePicker mode="single" label="วันที่รักษา" start={sicknessDate} end={sicknessDate} max={today} onChange={(day) => setSicknessDate(day)} />
              <input type="hidden" name="sicknessDate" value={sicknessDate} />
            </div>
            <label className="ck-field">
              <span>จำนวนเงิน (บาท)</span>
              <input
                className="ck-in"
                type="number"
                name="amount"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                value={amountText}
                disabled={busy === "create" || maxAmount <= 0}
                onChange={(event) => setAmountText(event.currentTarget.value)}
              />
            </label>
            <label className="ck-field span2">
              <span>เชื่อมกับใบลาป่วย (ถ้ามี)</span>
              <select className="ck-in" name="leaveRequestId" defaultValue="" disabled={busy === "create" || leaveOptions.length === 0}>
                <option value="">{leaveOptions.length === 0 ? "ไม่มีใบลาให้เชื่อม" : "ไม่เชื่อมกับใบลา"}</option>
                {leaveOptions.map((request) => (
                  <option key={request.requestId} value={request.requestId}>
                    {request.leaveTypeName} {thaiDateRange(request.startDate, request.endDate)}
                  </option>
                ))}
              </select>
            </label>
            <label className="ck-field span3">
              <span>อาการหรือรายละเอียดการรักษา</span>
              <input className="ck-in" name="description" maxLength={1000} required placeholder="เช่น ไข้หวัด เจ็บคอ" disabled={busy === "create" || maxAmount <= 0} />
            </label>
            <label className="ck-field">
              <span>ใบเสร็จ (1 ถึง 3 ไฟล์)</span>
              <span className="ck-in ck-file">
                <Icon name="clip" size={17} />
                {files.length > 0 ? `เลือกแล้ว ${files.length} ไฟล์` : "เลือกไฟล์ JPG PNG หรือ PDF"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  multiple
                  required
                  disabled={busy === "create" || maxAmount <= 0}
                  onChange={(event) => {
                    const next = Array.from(event.currentTarget.files ?? []);
                    const error = validateReceiptCandidates(next);
                    setFiles(next);
                    setMessage(error ? { kind: "error", text: error } : null);
                  }}
                />
              </span>
            </label>
          </div>
          {files.length > 0 ? (
            <div className="ck-files">
              {files.map((file) => (
                <span key={`${file.name}-${file.size}`}>
                  <Icon name="clip" size={14} />
                  {file.name} ({formatMedicalBytes(file.size)})
                </span>
              ))}
            </div>
          ) : null}

          <ApproverChainNotice url="/api/medical/approval-chain" />

          {overLimit ? (
            <p className="ck-msg error" role="alert" style={{ marginTop: 16 }}>
              จำนวนเงินเกินที่เบิกได้ เบิกได้ไม่เกิน {currency.format(maxAmount)}
            </p>
          ) : null}

          <div className="ck-fbar">
            <span className="ck-sumline">
              <Icon name="med" size={18} />
              {amountNumber > 0 && !overLimit ? (
                <>
                  เบิก <b>{currency.format(amountNumber)}</b> หลังเบิกเหลือวงเงิน <b>{currency.format(overview.entitlement.remaining - amountNumber)}</b>
                </>
              ) : (
                <>
                  เบิกได้ไม่เกิน <b>{currency.format(maxAmount)}</b> ในครั้งนี้
                </>
              )}
            </span>
            <button
              className="ck-btn tone ck-ml"
              type="submit"
              disabled={busy === "create" || maxAmount <= 0 || files.length === 0 || overLimit || !sicknessDate}
            >
              {busy === "create" ? "กำลังอัปโหลดและส่ง…" : "ส่งคำขอเบิก"}
            </button>
          </div>
        </form>

        <section className="ck-panel ck-c-med" aria-labelledby="med-quota">
          <SectionHead title="วงเงินค่ารักษาปีนี้" id="med-quota" />
          <div className="ck-quota">
            <div>
              <small>วงเงินทั้งปี</small>
              <b>{currency.format(overview.entitlement.annualLimit)}</b>
            </div>
            <div>
              <small>อนุมัติแล้ว</small>
              <b>{currency.format(overview.entitlement.approved)}</b>
            </div>
            <div>
              <small>รออนุมัติ</small>
              <b>{currency.format(Math.max(overview.entitlement.committed - overview.entitlement.approved, 0))}</b>
            </div>
            <div>
              <small>คงเหลือ</small>
              <b className="hl">{currency.format(overview.entitlement.remaining)}</b>
            </div>
          </div>
          <div className="ck-track" style={{ marginTop: 14 }}>
            <i style={{ width: `${usedPercent}%` }} />
          </div>
        </section>

        <section className="ck-panel ck-c-med" aria-labelledby="med-history">
          <SectionHead title="ประวัติการเบิก" id="med-history" count={claims.length}>
            <Filters value={filter} options={FILTERS} onChange={setFilter} />
          </SectionHead>
          <div className="ck-hist">
            <DataGrid
              rows={filtered}
              rowKey={(claim) => claim.id}
              onRowClick={setDetail}
              empty={
                <EmptyState icon="med" title={claims.length === 0 ? "ยังไม่มีประวัติการเบิก" : "ไม่มีคำขอในสถานะนี้"}>
                  คำขอที่ส่งแล้วจะแสดงที่นี่
                </EmptyState>
              }
              columns={[
                {
                  key: "date",
                  header: "วันที่รักษา",
                  render: (claim) => (
                    <span className="ck-gcell">
                      <b>{thaiDate(claim.sicknessDate)}</b>
                      <small>ยื่น {thaiDateTime(claim.submittedAt)}</small>
                    </span>
                  ),
                },
                { key: "desc", header: "รายละเอียด", render: (claim) => <span className="ck-gcell"><small>{claim.description || "—"}</small></span> },
                { key: "files", header: "ใบเสร็จ", align: "center", render: (claim) => `${claim.attachments.length} ไฟล์` },
                { key: "amount", header: "จำนวนเงิน", align: "right", render: (claim) => <b>{currency.format(claim.amount)}</b> },
                {
                  key: "status",
                  header: "สถานะ",
                  align: "center",
                  width: "80px",
                  render: (claim) => <StatusDot tone={STATUS[claim.status].tone as DotTone} label={STATUS[claim.status].label} />,
                },
              ]}
            />
          </div>
        </section>
      </div>

      {detail ? (
        <DetailDialog
          tone="med"
          icon="med"
          kicker="รายละเอียดคำขอเบิกค่ารักษา"
          title={currency.format(detail.amount)}
          status={STATUS[detail.status]}
          onClose={() => setDetail(null)}
          footer={
            detail.status === "PENDING" || detail.status === "REVISION_REQUESTED" ? (
              <button
                type="button"
                className="ck-btn no"
                disabled={busy !== null}
                onClick={() => {
                  void cancelClaim(detail).then(() => setDetail(null));
                }}
              >
                ยกเลิกคำขอ
              </button>
            ) : null
          }
        >
          <dl className="ck-dlg-grid">
            <div>
              <dt>วันที่รักษา</dt>
              <dd>{thaiDate(detail.sicknessDate)}</dd>
            </div>
            <div>
              <dt>ยื่นเมื่อ</dt>
              <dd>{thaiDateTime(detail.submittedAt)}</dd>
            </div>
          </dl>
          <div className="ck-dlg-sec">
            <h3>รายละเอียด</h3>
            <p>{detail.description || "—"}</p>
          </div>
          <div className="ck-dlg-sec">
            <h3>ใบเสร็จ</h3>
            {detail.attachments.length === 0 ? (
              <p className="ck-muted">ไม่มีไฟล์แนบ</p>
            ) : (
              <div className="ck-files">
                {detail.attachments.map((attachment) => (
                  <button key={attachment.attachmentId} type="button" disabled={busy !== null} onClick={() => void downloadReceipt(attachment.attachmentId)}>
                    <Icon name="clip" size={14} />
                    {attachment.fileName ?? "เอกสารแนบ"} {attachment.sizeBytes ? `(${formatMedicalBytes(attachment.sizeBytes)})` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="ck-dlg-sec">
            <h3>ผลการพิจารณา</h3>
            <p>{detail.decisionReason || (detail.status === "PENDING" ? "รอผู้อนุมัติพิจารณา" : "—")}</p>
          </div>
          {detail.status === "REVISION_REQUESTED" ? (
            <ResubmitPanel
              key={detail.id}
              fields={[
                { name: "sicknessDate", label: "วันที่รักษา", type: "date", value: detail.sicknessDate },
                { name: "amount", label: "จำนวนเงิน (บาท)", type: "number", value: String(detail.amount), min: "1", step: "0.01" },
                { name: "description", label: "รายละเอียด", type: "textarea", value: detail.description },
              ]}
              onSubmit={(values, clientKey) => resubmitClaim(detail, values, clientKey)}
            />
          ) : null}
          <RequestTimelineSection requestId={detail.id} />
        </DetailDialog>
      ) : null}
      {confirmDialog}
    </>
  );
}
