export interface AttendancePolicyRule {
  readonly timezone: string;
  readonly officeLatitude: number;
  readonly officeLongitude: number;
  readonly radiusKm: number;
  readonly lateAfter: string;
  readonly workStart: string;
  readonly workEnd: string;
  readonly breakStart: string | null;
  readonly breakEnd: string | null;
}

export interface AttendanceLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
}

export interface AttendanceTimingClassification {
  readonly isLate: boolean;
  readonly lateMinutes: number;
  readonly isEarly: boolean;
  readonly earlyMinutes: number;
}

export interface NormalizedTimeCorrection {
  readonly attendanceRecordId: string;
  readonly correctionType: "CHECK_IN" | "CHECK_OUT";
  readonly correctedTime: string;
  readonly reason: string;
  readonly clientKey: string;
}

const CLOCK = /^(\d{2}):(\d{2})$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clockMinutes(value: string): number {
  const normalized = normalizeAttendanceClock(value);
  const match = CLOCK.exec(normalized);

  if (!match) {
    throw new Error("Attendance time must use HH:mm");
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function overlapMinutes(
  start: number,
  end: number,
  breakStart: number,
  breakEnd: number,
): number {
  return Math.max(
    0,
    Math.min(end, breakEnd) - Math.max(start, breakStart),
  );
}

export function normalizeAttendanceClock(value: string): string {
  const trimmed = value.trim();
  const match = CLOCK.exec(trimmed);

  if (!match) {
    throw new Error("Attendance time must use HH:mm");
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) {
    throw new Error("Attendance time is invalid");
  }

  return trimmed;
}

export function normalizeAttendanceClientKey(
  clientKey: string,
): string {
  const trimmed = clientKey.trim();

  if (
    trimmed.length < 8 ||
    trimmed.length > 120 ||
    !/^[A-Za-z0-9._:-]+$/.test(trimmed)
  ) {
    throw new Error("Attendance client key is invalid");
  }

  return trimmed;
}

export function normalizeAttendanceRecordId(
  attendanceRecordId: string,
): string {
  const trimmed = attendanceRecordId.trim();

  if (!UUID.test(trimmed)) {
    throw new Error("Attendance record ID is invalid");
  }

  return trimmed;
}

export function normalizeAttendanceLocation(
  input: AttendanceLocation,
): AttendanceLocation {
  const { latitude, longitude, accuracyMeters } = input;

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("Attendance latitude is invalid");
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Attendance longitude is invalid");
  }

  if (
    !Number.isFinite(accuracyMeters) ||
    accuracyMeters < 0
  ) {
    throw new Error("Attendance accuracy is invalid");
  }

  return { latitude, longitude, accuracyMeters };
}

export function normalizeAttendancePolicy(
  policy: AttendancePolicyRule,
): AttendancePolicyRule {
  if (
    !policy.timezone.trim() ||
    !Number.isFinite(policy.radiusKm) ||
    policy.radiusKm <= 0
  ) {
    throw new Error("Attendance policy is invalid");
  }

  normalizeAttendanceLocation({
    latitude: policy.officeLatitude,
    longitude: policy.officeLongitude,
    accuracyMeters: 0,
  });

  const lateAfter = normalizeAttendanceClock(
    policy.lateAfter,
  );
  const workStart = normalizeAttendanceClock(policy.workStart);
  const workEnd = normalizeAttendanceClock(policy.workEnd);
  const breakStart =
    policy.breakStart === null
      ? null
      : normalizeAttendanceClock(policy.breakStart);
  const breakEnd =
    policy.breakEnd === null
      ? null
      : normalizeAttendanceClock(policy.breakEnd);

  if ((breakStart === null) !== (breakEnd === null)) {
    throw new Error(
      "Attendance break start/end must both be configured",
    );
  }

  if (
    breakStart &&
    breakEnd &&
    clockMinutes(breakEnd) <= clockMinutes(breakStart)
  ) {
    throw new Error(
      "Attendance break end must be after break start",
    );
  }

  return {
    ...policy,
    timezone: policy.timezone.trim(),
    lateAfter,
    workStart,
    workEnd,
    breakStart,
    breakEnd,
  };
}

export function attendanceDistanceKm(
  from: Pick<AttendanceLocation, "latitude" | "longitude">,
  to: Pick<AttendanceLocation, "latitude" | "longitude">,
): number {
  normalizeAttendanceLocation({
    ...from,
    accuracyMeters: 0,
  });
  normalizeAttendanceLocation({
    ...to,
    accuracyMeters: 0,
  });

  const radians = (degrees: number): number =>
    (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = radians(
    to.latitude - from.latitude,
  );
  const deltaLongitude = radians(
    to.longitude - from.longitude,
  );
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    2 *
    earthRadiusKm *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

export function classifyAttendanceRadius(input: {
  readonly location: AttendanceLocation;
  readonly policy: AttendancePolicyRule;
}): "INSIDE" | "OUTSIDE" {
  const location = normalizeAttendanceLocation(input.location);
  const policy = normalizeAttendancePolicy(input.policy);
  const distance = attendanceDistanceKm(location, {
    latitude: policy.officeLatitude,
    longitude: policy.officeLongitude,
  });

  return distance <= policy.radiusKm
    ? "INSIDE"
    : "OUTSIDE";
}

export function assertAttendanceDayAllowed(input: {
  readonly isWorkingDay: boolean;
  readonly hasApprovedOvertime: boolean;
}): void {
  if (!input.isWorkingDay && !input.hasApprovedOvertime) {
    throw new Error(
      "Attendance on a non-workday requires approved overtime",
    );
  }
}

export function classifyAttendanceTiming(input: {
  readonly checkInTime: string;
  readonly checkOutTime?: string | null;
  readonly policy: AttendancePolicyRule;
  readonly hasApprovedOvertime: boolean;
}): AttendanceTimingClassification {
  const policy = normalizeAttendancePolicy(input.policy);
  const checkIn = clockMinutes(input.checkInTime);
  const lateAfter = clockMinutes(policy.lateAfter);
  const isLate = checkIn >= lateAfter;
  const lateMinutes = Math.max(0, checkIn - lateAfter);

  if (!input.checkOutTime) {
    return {
      isLate,
      lateMinutes,
      isEarly: false,
      earlyMinutes: 0,
    };
  }

  const checkOut = clockMinutes(input.checkOutTime);
  const workEnd = clockMinutes(policy.workEnd);
  const isEarly =
    !input.hasApprovedOvertime && checkOut < workEnd;

  return {
    isLate,
    lateMinutes,
    isEarly,
    earlyMinutes: isEarly ? workEnd - checkOut : 0,
  };
}

export function calculateAttendanceWorkMinutes(input: {
  readonly checkInTime: string;
  readonly checkOutTime: string;
  readonly policy: AttendancePolicyRule;
}): number {
  const policy = normalizeAttendancePolicy(input.policy);
  const start = clockMinutes(input.checkInTime);
  const rawEnd = clockMinutes(input.checkOutTime);

  if (rawEnd < start) {
    throw new Error(
      "Attendance checkout must be after check-in",
    );
  }

  const workEnd = clockMinutes(policy.workEnd);
  const end = Math.min(rawEnd, workEnd);
  let minutes = Math.max(0, end - start);

  if (policy.breakStart && policy.breakEnd) {
    const breakStart = clockMinutes(policy.breakStart);
    const breakEnd = clockMinutes(policy.breakEnd);

    if (start < breakEnd && end > breakStart) {
      minutes -= breakEnd - breakStart;
    }
  }

  return Math.max(0, minutes);
}

export function calculateCorrectedWorkMinutes(input: {
  readonly checkInTime: string;
  readonly checkOutTime: string;
  readonly policy: AttendancePolicyRule;
}): number {
  const policy = normalizeAttendancePolicy(input.policy);
  const start = clockMinutes(input.checkInTime);
  const end = clockMinutes(input.checkOutTime);

  if (end <= start) {
    throw new Error(
      "Corrected checkout must be after check-in",
    );
  }

  let minutes = end - start;

  if (policy.breakStart && policy.breakEnd) {
    minutes -= overlapMinutes(
      start,
      end,
      clockMinutes(policy.breakStart),
      clockMinutes(policy.breakEnd),
    );
  }

  return Math.min(
    standardWorkdayMinutes(policy),
    Math.max(0, minutes),
  );
}

/** Length of a normal working day: work start to work end minus the break. */
export function standardWorkdayMinutes(
  policy: AttendancePolicyRule,
): number {
  const normalized = normalizeAttendancePolicy(policy);
  const breakMinutes =
    normalized.breakStart && normalized.breakEnd
      ? clockMinutes(normalized.breakEnd) -
        clockMinutes(normalized.breakStart)
      : 0;

  return Math.max(
    0,
    clockMinutes(normalized.workEnd) -
      clockMinutes(normalized.workStart) -
      breakMinutes,
  );
}

export function normalizeAttendanceIsoDate(
  value: string,
): string {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (!match) {
    throw new Error("Attendance date must use YYYY-MM-DD");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Attendance date is invalid");
  }

  return trimmed;
}

export function assertAttendanceDateNotFuture(input: {
  readonly attendanceDate: string;
  readonly today: string;
}): void {
  const attendanceDate = normalizeAttendanceIsoDate(
    input.attendanceDate,
  );
  const today = normalizeAttendanceIsoDate(input.today);

  if (attendanceDate > today) {
    throw new Error(
      "Time correction cannot target a future attendance date",
    );
  }
}

export function normalizeTimeCorrection(input: {
  readonly attendanceRecordId: string;
  readonly correctionType: "CHECK_IN" | "CHECK_OUT";
  readonly correctedTime: string;
  readonly reason: string;
  readonly clientKey: string;
}): NormalizedTimeCorrection {
  if (
    input.correctionType !== "CHECK_IN" &&
    input.correctionType !== "CHECK_OUT"
  ) {
    throw new Error("Time correction type is invalid");
  }

  const reason = input.reason.trim();

  if (!reason || reason.length > 1000) {
    throw new Error(
      "Time correction reason must be 1 to 1000 characters",
    );
  }

  return {
    attendanceRecordId: normalizeAttendanceRecordId(
      input.attendanceRecordId,
    ),
    correctionType: input.correctionType,
    correctedTime: normalizeAttendanceClock(
      input.correctedTime,
    ),
    reason,
    clientKey: normalizeAttendanceClientKey(
      input.clientKey,
    ),
  };
}

export interface NormalizedAttendanceRecordAdd {
  readonly attendanceDate: string;
  readonly checkInTime: string;
  readonly checkOutTime: string;
  readonly reason: string;
  readonly clientKey: string;
}

/** Request to add a whole attendance record for a day that has no clock-in at all. */
export function normalizeAttendanceRecordAdd(input: {
  readonly attendanceDate: string;
  readonly checkInTime: string;
  readonly checkOutTime: string;
  readonly reason: string;
  readonly clientKey: string;
}): NormalizedAttendanceRecordAdd {
  const reason = input.reason.trim();

  if (!reason || reason.length > 1000) {
    throw new Error("Time correction reason must be 1 to 1000 characters");
  }

  const checkInTime = normalizeAttendanceClock(input.checkInTime);
  const checkOutTime = normalizeAttendanceClock(input.checkOutTime);

  if (clockMinutes(checkOutTime) <= clockMinutes(checkInTime)) {
    throw new Error("Time correction check-out must be after check-in");
  }

  return {
    attendanceDate: normalizeAttendanceIsoDate(input.attendanceDate),
    checkInTime,
    checkOutTime,
    reason,
    clientKey: normalizeAttendanceClientKey(input.clientKey),
  };
}

export function assertTimeCorrectionOriginalExists(input: {
  readonly correctionType: "CHECK_IN" | "CHECK_OUT";
  readonly originalCheckIn: string | null;
  readonly originalCheckOut: string | null;
}): void {
  // A missing check-out (forgot to scan out) can be filled in by a correction;
  // the check-in always exists because it opens the record.
  if (input.correctionType === "CHECK_OUT") {
    if (input.originalCheckOut) {
      normalizeAttendanceClock(input.originalCheckOut);
    }
    return;
  }

  if (!input.originalCheckIn) {
    throw new Error(
      "Time correction requires an original attendance event",
    );
  }

  normalizeAttendanceClock(input.originalCheckIn);
}

export function assertTimeCorrectionChanged(input: {
  readonly originalTime: string;
  readonly correctedTime: string;
}): void {
  if (
    normalizeAttendanceClock(input.originalTime) ===
    normalizeAttendanceClock(input.correctedTime)
  ) {
    throw new Error(
      "Corrected attendance time must differ from original",
    );
  }
}

export function assertNoActiveTimeCorrection(
  statuses: readonly string[],
): void {
  if (
    statuses.some(
      (status) =>
        status === "PENDING" || status === "APPROVED" || status === "REVISION_REQUESTED",
    )
  ) {
    throw new Error(
      "An active time correction already exists",
    );
  }
}

export function normalizeTimeCorrectionDecision(input: {
  readonly decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  readonly comment?: string | null;
}): {
  readonly decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  readonly comment: string;
} {
  if (
    input.decision !== "APPROVED" &&
    input.decision !== "REJECTED" &&
    input.decision !== "REVISION_REQUESTED"
  ) {
    throw new Error("Time correction decision is invalid");
  }

  const comment = (input.comment ?? "").trim();

  if (comment.length > 1000) {
    throw new Error(
      "Time correction decision comment is too long",
    );
  }

  if (input.decision === "REJECTED" && !comment) {
    throw new Error(
      "Rejected time correction requires a comment",
    );
  }

  if (input.decision === "REVISION_REQUESTED" && !comment) {
    throw new Error(
      "Time correction revision request requires a comment",
    );
  }

  return {
    decision: input.decision,
    comment,
  };
}
