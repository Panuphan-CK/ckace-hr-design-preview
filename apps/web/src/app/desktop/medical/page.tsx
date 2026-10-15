"use client";

import type {
  AttachmentDownloadResult,
  LeaveSelfOverview,
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
import {
  RequestListToolbar,
  RequestWorkspaceTabs,
  type RequestWorkspaceView,
} from "../request-workspace-tabs";
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
  medicalMetrics,
  shouldCleanupUnlinkedReceipts,
  medicalStatusClass,
  medicalStatusLabel,
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

const dateFormat = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
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

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00+07:00`);
  return Number.isNaN(date.getTime())
    ? value
    : dateFormat.format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : dateTimeFormat.format(date);
}

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
  const [workspaceView, setWorkspaceView] =
    useState<RequestWorkspaceView>("new");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestMonth, setRequestMonth] = useState("");
  const today = useMemo(() => todayBangkok(), []);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const medicalResponse = await fetch("/api/medical/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!medicalResponse.ok) {
        throw new Error(errorMessage(medicalResponse.status));
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

  const metrics = useMemo(
    () =>
      state.status === "ready"
        ? medicalMetrics(state.overview)
        : null,
    [state],
  );

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

  async function cancelClaim(claim: MedicalClaimView) {
    if (
      busy ||
      claim.status !== "PENDING" ||
      !window.confirm("ยืนยันยกเลิกคำขอเบิกนี้?")
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

  if (state.status === "loading") {
    return (
      <section
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลดค่ารักษาพยาบาล</h1>
        <p>
          กำลังตรวจวงเงินรายปี ประวัติ และสิทธิ์ไฟล์ใบเสร็จจาก Server
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">MEDICAL ERROR</div>
        <h1>เปิดค่ารักษาพยาบาลไม่สำเร็จ</h1>
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

  const { overview } = state;
  const maxAmount = Math.max(
    0,
    Math.min(
      MEDICAL_DESKTOP_PER_CLAIM_LIMIT,
      overview.entitlement.remaining,
    ),
  );
  const leaveOptions =
    leaveOverview?.requests.filter(
      (request) => request.status !== "CANCELLED",
    ) ?? [];
  const pendingClaims = overview.claims.filter(
    (claim) => claim.status === "PENDING",
  );
  const historyClaims = overview.claims.filter(
    (claim) => claim.status !== "PENDING",
  );
  const visibleClaims =
    workspaceView === "pending" ? pendingClaims : historyClaims;
  const requestSearchKey = requestSearch.trim().toLocaleLowerCase("th");
  const filteredVisibleClaims = visibleClaims.filter((claim) => {
    const matchesSearch =
      requestSearchKey.length === 0 ||
      [
        claim.description,
        medicalStatusLabel(claim.status),
        String(claim.amount),
        claim.sicknessDate,
      ]
        .join(" ")
        .toLocaleLowerCase("th")
        .includes(requestSearchKey);
    const matchesMonth =
      requestMonth.length === 0 || claim.sicknessDate.slice(5, 7) === requestMonth;
    return matchesSearch && matchesMonth;
  });

  return (
    <div className="module-stack task398-request-page">
      <section className="module-heading">
        <div>
          <p className="eyebrow">MEDICAL CLAIM DESKTOP</p>
          <h1>ค่ารักษาพยาบาล</h1>
          <p>
            ตรวจวงเงินรายปี ยื่นคำขอพร้อมใบเสร็จส่วนตัว
            และติดตามผลผ่าน Project B
          </p>
        </div>
        <div className="module-heading-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => void load()}
          >
            รีเฟรช
          </button>
        </div>
      </section>

      <RequestWorkspaceTabs
        value={workspaceView}
        onChange={setWorkspaceView}
        newLabel="เบิกค่ารักษา"
        pendingCount={pendingClaims.length}
        historyCount={historyClaims.length}
      />

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

      <section className="metric-grid medical-metric-grid">
        <article className="metric-card">
          <span>วงเงินรายปี</span>
          <strong>
            {currency.format(overview.entitlement.annualLimit)}
          </strong>
        </article>
        <article className="metric-card">
          <span>อนุมัติแล้ว</span>
          <strong>
            {currency.format(overview.entitlement.approved)}
          </strong>
        </article>
        <article className="metric-card">
          <span>ยอดผูกพัน</span>
          <strong>
            {currency.format(overview.entitlement.committed)}
          </strong>
        </article>
        <article className="metric-card">
          <span>วงเงินคงเหลือ</span>
          <strong>
            {currency.format(overview.entitlement.remaining)}
          </strong>
        </article>
      </section>

      {workspaceView === "new" ? (
      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NEW CLAIM</p>
            <h2>ยื่นเบิกค่ารักษาพยาบาล</h2>
          </div>
          <span className="panel-note">
            สูงสุด {currency.format(MEDICAL_DESKTOP_PER_CLAIM_LIMIT)}
            /ครั้ง
          </span>
        </div>

        <form className="leave-form" onSubmit={submitClaim}>
          <label>
            วันที่รักษา
            <input
              type="date"
              name="sicknessDate"
              max={today}
              required
              disabled={busy === "create" || maxAmount <= 0}
            />
          </label>
          <label>
            จำนวนเงิน
            <input
              type="number"
              name="amount"
              min="0.01"
              max={maxAmount || undefined}
              step="0.01"
              required
              disabled={busy === "create" || maxAmount <= 0}
            />
            <small className="field-help">
              เบิกได้ไม่เกิน {currency.format(maxAmount)} จากวงเงินปัจจุบัน
            </small>
          </label>

          {leaveOptions.length > 0 ? (
            <label className="form-span-2">
              เชื่อมกับคำขอลา (ถ้ามี)
              <select
                name="leaveRequestId"
                defaultValue=""
                disabled={busy === "create"}
              >
                <option value="">ไม่เชื่อมคำขอลา</option>
                {leaveOptions.map((request) => (
                  <option
                    key={request.requestId}
                    value={request.requestId}
                  >
                    {request.leaveTypeName} · {formatDate(request.startDate)}
                    {request.startDate !== request.endDate
                      ? ` – ${formatDate(request.endDate)}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="form-span-2">
            รายละเอียด
            <textarea
              name="description"
              rows={3}
              maxLength={1000}
              required
              disabled={busy === "create" || maxAmount <= 0}
              placeholder="ระบุอาการหรือรายละเอียดการรักษา"
            />
          </label>

          <label className="form-span-2">
            ใบเสร็จ / เอกสาร
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              multiple
              required
              disabled={busy === "create" || maxAmount <= 0}
              onChange={(event) => {
                const next = Array.from(
                  event.currentTarget.files ?? [],
                );
                const error = validateReceiptCandidates(next);
                setFiles(next);
                setMessage(
                  error
                    ? { kind: "error", text: error }
                    : null,
                );
              }}
            />
            <small className="field-help">
              1–3 ไฟล์ · JPG/PNG/PDF · ไม่เกิน 2 MiB/ไฟล์ · รวมไม่เกิน
              4 MiB · จัดเก็บเป็น MEDICAL_PRIVATE
            </small>
          </label>

          {files.length > 0 ? (
            <div className="form-span-2 medical-file-list">
              {files.map((file) => (
                <span key={`${file.name}-${file.size}`}>
                  {file.name} · {formatMedicalBytes(file.size)}
                </span>
              ))}
            </div>
          ) : null}

          <div className="form-span-2 form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={
                busy === "create" ||
                maxAmount <= 0 ||
                files.length === 0
              }
            >
              {busy === "create"
                ? "กำลังอัปโหลดและส่งคำขอ..."
                : maxAmount <= 0
                  ? "วงเงินปีนี้ไม่เพียงพอ"
                  : "ส่งคำขอเบิก"}
            </button>
          </div>
        </form>
      </section>
      ) : null}

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SUMMARY</p>
            <h2>สถานะปีปัจจุบัน</h2>
          </div>
        </div>
        <div className="medical-summary-strip">
          <span>ทั้งหมด {metrics?.totalClaims ?? 0}</span>
          <span>รออนุมัติ {metrics?.pendingClaims ?? 0}</span>
          <span>อนุมัติ {metrics?.approvedClaims ?? 0}</span>
          <span>ไม่อนุมัติ {metrics?.rejectedClaims ?? 0}</span>
        </div>
      </section>

      {workspaceView !== "new" ? (
      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              {workspaceView === "pending" ? "IN PROGRESS" : "HISTORY"}
            </p>
            <h2>
              {workspaceView === "pending"
                ? "คำขอค่ารักษาที่กำลังดำเนินการ"
                : "ประวัติค่ารักษาพยาบาล"}
            </h2>
          </div>
          <span className="panel-note">
            {filteredVisibleClaims.length} รายการ
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
          createLabel="เบิกค่ารักษา"
          searchPlaceholder="ค้นหารายละเอียดหรือจำนวนเงิน..."
        />

        {filteredVisibleClaims.length === 0 ? (
          <div className="empty-state">
            <h3>
              {workspaceView === "pending"
                ? "ไม่มีคำขอค่ารักษาที่กำลังดำเนินการ"
                : "ยังไม่มีประวัติค่ารักษาพยาบาล"}
            </h3>
            <p>
              {workspaceView === "pending"
                ? "คำขอที่รอการพิจารณาจะแสดงที่นี่"
                : "คำขอที่สิ้นสุดแล้วจะแสดงที่นี่"}
            </p>
          </div>
        ) : (
          <div className="medical-history-list">
            {filteredVisibleClaims.map((claim) => (
              <article
                className="medical-claim-card"
                key={claim.id}
              >
                <div className="medical-claim-head">
                  <div>
                    <strong>
                      {currency.format(claim.amount)}
                    </strong>
                    <small>
                      รักษา {formatDate(claim.sicknessDate)} · ส่งเมื่อ{" "}
                      {formatDateTime(claim.submittedAt)}
                    </small>
                  </div>
                  <span className={medicalStatusClass(claim.status)}>
                    {medicalStatusLabel(claim.status)}
                  </span>
                </div>

                <p className="medical-description">
                  {claim.description}
                </p>

                <div className="medical-claim-meta">
                  <span>
                    เอกสาร {claim.attachments.length} ไฟล์
                  </span>
                  <span>
                    {claim.leaveRequestId
                      ? "เชื่อมคำขอลาแล้ว"
                      : "ไม่เชื่อมคำขอลา"}
                  </span>
                </div>

                {claim.attachments.length > 0 ? (
                  <div className="medical-attachments">
                    {claim.attachments.map((attachment) => (
                      <button
                        key={attachment.attachmentId}
                        type="button"
                        className="medical-attachment-button"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void downloadReceipt(
                            attachment.attachmentId,
                          )
                        }
                      >
                        <span>
                          {attachment.fileName ?? "เอกสารแนบ"}
                        </span>
                        <small>
                          {formatMedicalBytes(
                            attachment.sizeBytes,
                          )}
                        </small>
                      </button>
                    ))}
                  </div>
                ) : null}

                {claim.decisionReason ? (
                  <div className="decision-note">
                    <strong>เหตุผลผลพิจารณา</strong>
                    <span>{claim.decisionReason}</span>
                  </div>
                ) : null}

                {claim.status === "PENDING" ? (
                  <div className="approval-actions">
                    <button
                      className="danger-button"
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void cancelClaim(claim)}
                    >
                      {busy === claim.id
                        ? "กำลังยกเลิก..."
                        : "ยกเลิกคำขอ"}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
      ) : null}
    </div>
  );
}
