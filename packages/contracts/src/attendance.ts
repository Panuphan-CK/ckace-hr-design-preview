export type AttendanceRadiusState =
  | "INSIDE"
  | "OUTSIDE"
  | "UNKNOWN";

export type AttendanceDayKind =
  | "WORKDAY"
  | "NON_WORKDAY";

export type AttendanceEventSource =
  | "DEVICE"
  | "CORRECTION"
  | "LEGACY"
  | "UNKNOWN";

export interface AttendanceLocationInput {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
}

export interface AttendanceCheckInInput
  extends AttendanceLocationInput {
  readonly clientKey: string;
}

export interface AttendanceCheckOutInput
  extends AttendanceLocationInput {
  readonly clientKey: string;
  readonly attendanceRecordId: string;
}

export interface AttendanceRecordView {
  readonly attendanceRecordId: string;
  readonly workDate: string;
  readonly checkInAt: string;
  readonly checkOutAt: string | null;
  readonly checkInSource: AttendanceEventSource;
  readonly checkOutSource: AttendanceEventSource | null;
  readonly workMinutes: number | null;
  readonly lateMinutes: number | null;
  readonly earlyMinutes: number | null;
  readonly overtimeMinutes: number | null;
  readonly checkInRadius: AttendanceRadiusState;
  readonly checkOutRadius: AttendanceRadiusState;
  readonly policyVersion: string | null;
}

export interface AttendanceSelfOverview {
  readonly dayKind: AttendanceDayKind;
  readonly canCheckIn: boolean;
  readonly canCheckOut: boolean;
  readonly currentAttendanceRecordId: string | null;
  readonly records: readonly AttendanceRecordView[];
}

export interface AttendanceWriteResult {
  readonly attendanceRecordId: string;
  readonly replayed: boolean;
}

export type TimeCorrectionType =
  | "CHECK_IN"
  | "CHECK_OUT";

export type TimeCorrectionStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "REVISION_REQUESTED";

export interface TimeCorrectionCreateInput {
  readonly clientKey: string;
  readonly attendanceRecordId: string;
  readonly correctionType: TimeCorrectionType;
  readonly correctedTime: string;
  readonly reason: string;
}

export interface TimeCorrectionRequestView {
  readonly requestId: string;
  readonly attendanceRecordId: string | null;
  readonly attendanceDate: string;
  readonly correctionType: TimeCorrectionType;
  readonly originalTime: string;
  readonly correctedTime: string;
  readonly reason: string;
  readonly status: TimeCorrectionStatus;
  readonly decisionComment: string | null;
  readonly requestedAt: string;
  readonly decidedAt: string | null;
  readonly canDecide: boolean;
  readonly employeeDisplayName?: string;
}

export interface TimeCorrectionCreateResult {
  readonly requestId: string;
  readonly replayed: boolean;
}

export interface TimeCorrectionCancelResult {
  readonly requestId: string;
  readonly status: "CANCELLED";
}

export interface TimeCorrectionDecisionInput {
  readonly decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  readonly comment: string;
}

export interface TimeCorrectionDecisionResult {
  readonly requestId: string;
  readonly status: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
}

/** Employee edits the corrected time and reason of a sent-back time correction (type and date stay fixed). */
export interface TimeCorrectionResubmitInput {
  readonly clientKey: string;
  readonly correctedTime: string;
  readonly reason: string;
}

export interface TimeCorrectionResubmitResult {
  readonly requestId: string;
  readonly returnedToStep: number;
  readonly replayed: boolean;
}

/** Highest-level user withdraws an approved time correction; the attendance record is restored. */
export interface TimeCorrectionWithdrawInput {
  readonly reason: string;
}

export interface TimeCorrectionWithdrawResult {
  readonly requestId: string;
  readonly status: "CANCELLED";
}
