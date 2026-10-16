import type {
  MedicalClaimStatus,
  MedicalCreateInput,
  MedicalDecisionInput,
  MedicalEntitlementView,
} from "@ckace/contracts";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MEDICAL_PER_CLAIM_LIMIT = 1_000;
export const DEFAULT_MEDICAL_ANNUAL_LIMIT = 10_000;
export const MEDICAL_MAX_RECEIPTS = 3;
export const MEDICAL_MAX_RECEIPT_BYTES =
  2 * 1024 * 1024;
export const MEDICAL_MAX_TOTAL_RECEIPT_BYTES =
  4 * 1024 * 1024;

export const MEDICAL_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export interface MedicalAmountEvaluation {
  readonly requestedAmount: number;
  readonly effectiveAmount: number;
  readonly capped: boolean;
}

export interface MedicalReceiptMetadata {
  readonly attachmentId: string;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
}

export interface NormalizedMedicalCreate {
  readonly sicknessDate: string;
  readonly amount: number;
  readonly requestedAmount: number;
  readonly capped: boolean;
  readonly description: string;
  readonly attachmentIds: readonly string[];
  readonly leaveRequestId: string | null;
  readonly clientKey: string;
}

function cents(value: number): number {
  return Math.round(value * 100);
}

export function normalizeMedicalIsoDate(
  value: string,
): string {
  const normalized = value.trim();
  const match = ISO_DATE.exec(normalized);

  if (!match) {
    throw new Error(
      "medical date must use YYYY-MM-DD",
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("medical date is invalid");
  }

  return normalized;
}

export function assertMedicalDateNotFuture(input: {
  readonly sicknessDate: string;
  readonly today: string;
}): void {
  const sicknessDate = normalizeMedicalIsoDate(
    input.sicknessDate,
  );
  const today = normalizeMedicalIsoDate(
    input.today,
  );

  if (sicknessDate > today) {
    throw new Error(
      "medical treatment date cannot be in the future",
    );
  }
}

export function normalizeMedicalAmount(
  value: number,
  perClaimLimit: number = MEDICAL_PER_CLAIM_LIMIT,
): MedicalAmountEvaluation {
  if (!Number.isFinite(perClaimLimit) || perClaimLimit <= 0) {
    throw new Error("medical per-claim limit must be positive");
  }

  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    Math.abs(value * 100 - cents(value)) >
      Number.EPSILON * 100
  ) {
    throw new Error(
      "medical amount must be positive with at most 2 decimals",
    );
  }

  const requestedAmount = cents(value) / 100;
  const effectiveAmount =
    Math.min(
      cents(perClaimLimit),
      cents(requestedAmount),
    ) / 100;

  return {
    requestedAmount,
    effectiveAmount,
    capped:
      effectiveAmount !== requestedAmount,
  };
}

export function normalizeMedicalDescription(
  value: string,
): string {
  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 1000
  ) {
    throw new Error(
      "medical description must be 1 to 1000 characters",
    );
  }

  return normalized;
}

export function normalizeMedicalClientKey(
  value: string,
): string {
  const normalized = value.trim();

  if (
    normalized.length < 8 ||
    normalized.length > 120 ||
    !/^[A-Za-z0-9._:-]+$/.test(normalized)
  ) {
    throw new Error(
      "medical clientKey is invalid",
    );
  }

  return normalized;
}

export function normalizeMedicalUuid(
  value: string,
  label = "medical UUID",
): string {
  const normalized = value.trim();

  if (!UUID.test(normalized)) {
    throw new Error(`${label} is invalid`);
  }

  return normalized;
}

export function normalizeMedicalAttachmentIds(
  values: readonly string[],
): readonly string[] {
  if (
    !Array.isArray(values) ||
    values.length === 0 ||
    values.length > MEDICAL_MAX_RECEIPTS
  ) {
    throw new Error(
      "medical claim requires 1 to 3 receipt attachments",
    );
  }

  const normalized = values.map((value) =>
    normalizeMedicalUuid(
      value,
      "medical attachmentId",
    ),
  );
  const unique = new Set(normalized);

  if (unique.size !== normalized.length) {
    throw new Error(
      "medical attachmentIds must be unique",
    );
  }

  return normalized;
}

export function assertMedicalReceiptMetadata(
  receipts: readonly MedicalReceiptMetadata[],
): void {
  if (
    receipts.length === 0 ||
    receipts.length > MEDICAL_MAX_RECEIPTS
  ) {
    throw new Error(
      "medical claim requires 1 to 3 receipt attachments",
    );
  }

  let totalBytes = 0;

  for (const receipt of receipts) {
    normalizeMedicalUuid(
      receipt.attachmentId,
      "medical attachmentId",
    );

    if (
      !receipt.mimeType ||
      !MEDICAL_ALLOWED_MIME_TYPES.includes(
        receipt.mimeType as
          (typeof MEDICAL_ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new Error(
        "medical receipt type must be JPG, PNG, or PDF",
      );
    }

    if (
      receipt.sizeBytes === null ||
      !Number.isSafeInteger(receipt.sizeBytes) ||
      receipt.sizeBytes <= 0 ||
      receipt.sizeBytes >
        MEDICAL_MAX_RECEIPT_BYTES
    ) {
      throw new Error(
        "medical receipt size is invalid",
      );
    }

    totalBytes += receipt.sizeBytes;
  }

  if (
    totalBytes >
    MEDICAL_MAX_TOTAL_RECEIPT_BYTES
  ) {
    throw new Error(
      "medical receipt total size exceeds 4 MiB",
    );
  }
}

export function normalizeMedicalCreate(
  input: MedicalCreateInput,
  perClaimLimit: number = MEDICAL_PER_CLAIM_LIMIT,
): NormalizedMedicalCreate {
  const amount = normalizeMedicalAmount(
    input.amount,
    perClaimLimit,
  );

  return {
    sicknessDate: normalizeMedicalIsoDate(
      input.sicknessDate,
    ),
    amount: amount.effectiveAmount,
    requestedAmount:
      amount.requestedAmount,
    capped: amount.capped,
    description: normalizeMedicalDescription(
      input.description,
    ),
    attachmentIds:
      normalizeMedicalAttachmentIds(
        input.attachmentIds,
      ),
    leaveRequestId:
      input.leaveRequestId === undefined ||
      input.leaveRequestId === null ||
      input.leaveRequestId.trim() === ""
        ? null
        : normalizeMedicalUuid(
            input.leaveRequestId,
            "medical leaveRequestId",
          ),
    clientKey: normalizeMedicalClientKey(
      input.clientKey,
    ),
  };
}

export function isMedicalCommittedStatus(
  status: MedicalClaimStatus,
): boolean {
  return (
    status === "PENDING" ||
    status === "APPROVED" ||
    status === "REVISION_REQUESTED"
  );
}

export function calculateMedicalEntitlement(input: {
  readonly annualLimit: number;
  readonly claims: readonly {
    readonly status: MedicalClaimStatus;
    readonly amount: number;
  }[];
}): MedicalEntitlementView {
  const annual = normalizeMedicalAmount(
    input.annualLimit,
  ).requestedAmount;

  if (annual <= 0) {
    throw new Error(
      "medical annual limit must be positive",
    );
  }

  let approvedCents = 0;
  let committedCents = 0;

  for (const claim of input.claims) {
    const amount = normalizeMedicalAmount(
      claim.amount,
    ).requestedAmount;
    const amountCents = cents(amount);

    if (claim.status === "APPROVED") {
      approvedCents += amountCents;
    }

    if (
      isMedicalCommittedStatus(
        claim.status,
      )
    ) {
      committedCents += amountCents;
    }
  }

  const annualCents = cents(annual);

  return {
    annualLimit: annualCents / 100,
    approved: approvedCents / 100,
    committed: committedCents / 100,
    remaining:
      Math.max(
        0,
        annualCents - committedCents,
      ) / 100,
  };
}

export function assertMedicalAnnualLimit(input: {
  readonly committedAmount: number;
  readonly newAmount: number;
  readonly annualLimit: number;
}): void {
  const committedCents = cents(
    input.committedAmount,
  );
  const newCents = cents(input.newAmount);
  const limitCents = cents(input.annualLimit);

  if (
    !Number.isSafeInteger(committedCents) ||
    !Number.isSafeInteger(newCents) ||
    !Number.isSafeInteger(limitCents) ||
    committedCents < 0 ||
    newCents <= 0 ||
    limitCents <= 0
  ) {
    throw new Error(
      "medical annual limit values are invalid",
    );
  }

  if (
    committedCents + newCents >
    limitCents
  ) {
    throw new Error(
      "medical annual committed limit exceeded",
    );
  }
}

export function isMedicalAutoApprovalRole(
  roleKeys: readonly string[],
): boolean {
  const roles = new Set(
    roleKeys.map((role) =>
      role.trim().toUpperCase(),
    ),
  );

  return (
    roles.has("ADMIN") ||
    roles.has("SUPERADMIN")
  );
}

export function assertMedicalCancelable(
  status: MedicalClaimStatus,
): void {
  if (status !== "PENDING" && status !== "REVISION_REQUESTED") {
    throw new Error(
      "only pending medical claims can be cancelled",
    );
  }
}

export function normalizeMedicalDecision(
  input: MedicalDecisionInput,
): {
  readonly decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  readonly comment: string | null;
} {
  const decision = input.decision;
  const comment =
    input.comment?.trim() || null;

  if (
    decision !== "APPROVED" &&
    decision !== "REJECTED" &&
    decision !== "REVISION_REQUESTED"
  ) {
    throw new Error(
      "medical decision must be APPROVED, REJECTED or REVISION_REQUESTED",
    );
  }

  if (
    comment &&
    comment.length > 1000
  ) {
    throw new Error(
      "medical decision comment is too long",
    );
  }

  if (
    decision === "REJECTED" &&
    !comment
  ) {
    throw new Error(
      "rejected medical decision requires a comment",
    );
  }

  if (decision === "REVISION_REQUESTED" && !comment) {
    throw new Error(
      "medical revision request requires a comment",
    );
  }

  return {
    decision,
    comment,
  };
}
