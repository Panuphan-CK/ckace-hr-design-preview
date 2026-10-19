import {
  MEDICAL_ALLOWED_MIME_TYPES,
  MEDICAL_MAX_RECEIPT_BYTES,
  MEDICAL_MAX_RECEIPTS,
  MEDICAL_MAX_TOTAL_RECEIPT_BYTES,
} from "@ckace/business-rules";
import type { LeaveAttachmentView } from "@ckace/contracts";
import type { Prisma } from "@prisma/client";

/** Optional medical certificate for SICK leave: same file rules as medical receipts. */
export const LEAVE_MAX_ATTACHMENTS = MEDICAL_MAX_RECEIPTS;
export const LEAVE_ATTACHMENT_LEAVE_TYPE_KEY = "SICK";

export interface LeaveAttachmentRow {
  readonly id: string;
  readonly ownerEmployeeId: string | null;
  readonly privacyClass: "INTERNAL" | "EMPLOYEE_PRIVATE" | "MEDICAL_PRIVATE" | "ADMIN_PRIVATE";
  readonly storageProvider: "LEGACY_DRIVE" | "R2";
  readonly storageKey: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: bigint | null;
  readonly checksumSha256: string | null;
  readonly finalizedAt: Date | null;
  readonly leaveLink: { readonly attachmentId: string } | null;
  readonly overtimeLink: { readonly attachmentId: string } | null;
  readonly medicalLink: { readonly attachmentId: string } | null;
  readonly announcementLink: { readonly attachmentId: string } | null;
  readonly employeeMedia: { readonly id: string } | null;
}

export async function leaveAttachmentRows(
  tx: Pick<Prisma.TransactionClient, "attachment">,
  attachmentIds: readonly string[],
): Promise<readonly LeaveAttachmentRow[]> {
  if (attachmentIds.length === 0) return [];
  return tx.attachment.findMany({
    where: { id: { in: [...attachmentIds] } },
    select: {
      id: true,
      ownerEmployeeId: true,
      privacyClass: true,
      storageProvider: true,
      storageKey: true,
      mimeType: true,
      sizeBytes: true,
      checksumSha256: true,
      finalizedAt: true,
      leaveLink: { select: { attachmentId: true } },
      overtimeLink: { select: { attachmentId: true } },
      medicalLink: { select: { attachmentId: true } },
      announcementLink: { select: { attachmentId: true } },
      employeeMedia: { select: { id: true } },
    },
  });
}

/** Fails closed: any doubt about ownership, finalization, type, size or linkage rejects the request. */
export function validateLeaveAttachments(input: {
  readonly employeeId: string;
  readonly leaveTypeKey: string;
  readonly requestedIds: readonly string[];
  readonly rows: readonly LeaveAttachmentRow[];
  /** Files already linked to the request (resubmission). */
  readonly existingCount?: number;
}): void {
  const { requestedIds, rows } = input;
  if (requestedIds.length === 0) return;

  if (input.leaveTypeKey !== LEAVE_ATTACHMENT_LEAVE_TYPE_KEY) {
    throw new Error("Leave attachments are only allowed for sick leave");
  }

  if (new Set(requestedIds).size !== requestedIds.length) {
    throw new Error("Leave attachment IDs must be unique");
  }

  if (requestedIds.length + (input.existingCount ?? 0) > LEAVE_MAX_ATTACHMENTS) {
    throw new Error("Leave requests accept at most 3 attachments");
  }

  if (rows.length !== requestedIds.length) {
    throw new Error("Leave attachment set is incomplete");
  }

  const requested = new Set(requestedIds);
  let total = 0;

  for (const row of rows) {
    if (!requested.has(row.id)) throw new Error("Leave attachment set is invalid");
    if (row.ownerEmployeeId !== input.employeeId) throw new Error("Leave attachment owner mismatch");
    if (row.privacyClass !== "MEDICAL_PRIVATE") throw new Error("Leave attachment must use MEDICAL_PRIVATE");
    if (row.storageProvider !== "R2" || !row.storageKey?.trim() || !row.finalizedAt) {
      throw new Error("Leave attachment must be finalized in R2");
    }
    if (
      !row.mimeType ||
      row.sizeBytes === null ||
      !row.checksumSha256 ||
      !/^[0-9a-f]{64}$/i.test(row.checksumSha256.trim())
    ) {
      throw new Error("Leave attachment finalization metadata is incomplete");
    }
    if (!(MEDICAL_ALLOWED_MIME_TYPES as readonly string[]).includes(row.mimeType)) {
      throw new Error("Leave attachment type must be JPG, PNG, or PDF");
    }
    const size = Number(row.sizeBytes);
    if (!Number.isSafeInteger(size) || size <= 0 || size > MEDICAL_MAX_RECEIPT_BYTES) {
      throw new Error("Leave attachment size is invalid");
    }
    total += size;
    if (
      row.leaveLink ||
      row.overtimeLink ||
      row.medicalLink ||
      row.announcementLink ||
      row.employeeMedia
    ) {
      throw new Error("Leave attachment is already linked");
    }
  }

  if (total > MEDICAL_MAX_TOTAL_RECEIPT_BYTES) {
    throw new Error("Leave attachment total size is too large");
  }
}

export const leaveAttachmentSelection = {
  select: {
    attachment: {
      select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true },
    },
  },
  orderBy: { attachmentId: "asc" as const },
} as const;

export function leaveAttachmentView(link: {
  readonly attachment: {
    readonly id: string;
    readonly originalFilename: string | null;
    readonly mimeType: string | null;
    readonly sizeBytes: bigint | null;
  };
}): LeaveAttachmentView {
  const size = link.attachment.sizeBytes === null ? null : Number(link.attachment.sizeBytes);
  return {
    attachmentId: link.attachment.id,
    fileName: link.attachment.originalFilename,
    mimeType: link.attachment.mimeType,
    sizeBytes: size !== null && Number.isSafeInteger(size) ? size : null,
  };
}
