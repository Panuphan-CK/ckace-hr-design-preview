import type {
  MedicalClaimStatus,
  MedicalSelfOverview,
} from "@ckace/contracts";

export const MEDICAL_DESKTOP_PER_CLAIM_LIMIT = 1_000;
export const MEDICAL_DESKTOP_MAX_RECEIPTS = 3;
export const MEDICAL_DESKTOP_MAX_RECEIPT_BYTES =
  2 * 1024 * 1024;
export const MEDICAL_DESKTOP_MAX_TOTAL_RECEIPT_BYTES =
  4 * 1024 * 1024;

export const MEDICAL_DESKTOP_ALLOWED_MIME_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "application/pdf",
  ]);

export interface ReceiptCandidateMetadata {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

export interface MedicalMetrics {
  readonly totalClaims: number;
  readonly pendingClaims: number;
  readonly approvedClaims: number;
  readonly rejectedClaims: number;
  readonly committedAmount: number;
  readonly remainingAmount: number;
}

/** Never cleanup private receipts after an ambiguous claim write outcome. */
export function shouldCleanupUnlinkedReceipts(
  postAttempted: boolean,
  definiteRejection: boolean,
): boolean {
  return !postAttempted || definiteRejection;
}

export function medicalMetrics(
  overview: MedicalSelfOverview,
): MedicalMetrics {
  return {
    totalClaims: overview.claims.length,
    pendingClaims: overview.claims.filter(
      (claim) => claim.status === "PENDING",
    ).length,
    approvedClaims: overview.claims.filter(
      (claim) => claim.status === "APPROVED",
    ).length,
    rejectedClaims: overview.claims.filter(
      (claim) => claim.status === "REJECTED",
    ).length,
    committedAmount: overview.entitlement.committed,
    remainingAmount: overview.entitlement.remaining,
  };
}

export function medicalStatusLabel(
  status: MedicalClaimStatus,
): string {
  switch (status) {
    case "PENDING":
      return "รออนุมัติ";
    case "APPROVED":
      return "อนุมัติแล้ว";
    case "REJECTED":
      return "ไม่อนุมัติ";
    case "CANCELLED":
      return "ยกเลิก";
    case "REVISION_REQUESTED":
      return "ส่งกลับให้แก้ไข";
  }
}

export function medicalStatusClass(
  status: MedicalClaimStatus,
): string {
  return `request-status status-${status.toLowerCase()}`;
}

export function validateReceiptCandidates(
  files: readonly ReceiptCandidateMetadata[],
): string | null {
  if (
    files.length === 0 ||
    files.length > MEDICAL_DESKTOP_MAX_RECEIPTS
  ) {
    return "กรุณาแนบใบเสร็จ 1–3 ไฟล์";
  }

  let total = 0;
  for (const file of files) {
    if (
      !MEDICAL_DESKTOP_ALLOWED_MIME_TYPES.has(file.type)
    ) {
      return `${file.name}: รองรับเฉพาะ JPG, PNG หรือ PDF`;
    }
    if (
      !Number.isSafeInteger(file.size) ||
      file.size <= 0 ||
      file.size > MEDICAL_DESKTOP_MAX_RECEIPT_BYTES
    ) {
      return `${file.name}: ไฟล์ต้องมีขนาดไม่เกิน 2 MiB`;
    }
    total += file.size;
  }

  if (total > MEDICAL_DESKTOP_MAX_TOTAL_RECEIPT_BYTES) {
    return "ขนาดใบเสร็จรวมต้องไม่เกิน 4 MiB";
  }

  return null;
}

export function formatMedicalBytes(
  sizeBytes: number | null,
): string {
  if (sizeBytes === null) return "ไม่ทราบขนาด";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KiB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MiB`;
}
