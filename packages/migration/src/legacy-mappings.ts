export type CanonicalLeaveDuration =
  | "FULL_DAY"
  | "HOURLY"
  | "MORNING"
  | "AFTERNOON";

export type CanonicalRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "REVISION_REQUESTED";

export type CanonicalLeaveType =
  | "ANNUAL"
  | "PERSONAL"
  | "SICK";

const LEAVE_DURATION_BY_LEGACY_CODE: Readonly<Record<string, CanonicalLeaveDuration>> =
  Object.freeze({
    F: "FULL_DAY",
    H: "HOURLY",
    AM: "MORNING",
    PM: "AFTERNOON",
  });

const REQUEST_STATUS_BY_LEGACY_VALUE: Readonly<
  Record<string, CanonicalRequestStatus>
> = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  REVISE: "REVISION_REQUESTED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  "รออนุมัติ": "PENDING",
  "อนุมัติ": "APPROVED",
  "ไม่อนุมัติ": "REJECTED",
  "ส่งกลับแก้ไข": "REVISION_REQUESTED",
});

const LEAVE_TYPE_BY_LEGACY_VALUE: Readonly<
  Record<string, CanonicalLeaveType>
> = Object.freeze({
  ANNUAL: "ANNUAL",
  VACATION: "ANNUAL",
  PERSONAL: "PERSONAL",
  SICK: "SICK",
});

export function mapLegacyLeaveDuration(
  legacyCode: string,
): CanonicalLeaveDuration {
  const normalized = legacyCode.trim().toUpperCase();
  const mapped = LEAVE_DURATION_BY_LEGACY_CODE[normalized];

  if (!mapped) {
    throw new Error("Unknown legacy leave duration code: " + legacyCode);
  }

  return mapped;
}

export function mapLegacyRequestStatus(
  legacyStatus: string,
): CanonicalRequestStatus {
  const trimmed = legacyStatus.trim();
  const mapped =
    REQUEST_STATUS_BY_LEGACY_VALUE[trimmed.toUpperCase()] ??
    REQUEST_STATUS_BY_LEGACY_VALUE[trimmed];

  if (!mapped) {
    throw new Error("Unknown legacy request status: " + legacyStatus);
  }

  return mapped;
}

export function mapLegacyLeaveType(
  legacyLeaveType: string,
): CanonicalLeaveType {
  const normalized = legacyLeaveType.trim().toUpperCase();
  const mapped = LEAVE_TYPE_BY_LEGACY_VALUE[normalized];

  if (!mapped) {
    throw new Error("Unknown legacy leave type: " + legacyLeaveType);
  }

  return mapped;
}

export function parseLegacyDateDdMmYyyy(
  value: string,
): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    throw new Error("Invalid legacy DD/MM/YYYY date: " + value);
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Invalid legacy calendar date: " + value);
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}
