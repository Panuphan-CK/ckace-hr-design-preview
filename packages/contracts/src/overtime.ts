export type OvertimeRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "REVISION_REQUESTED";

export type OvertimeDecision = "APPROVED" | "REJECTED" | "REVISION_REQUESTED";

export type OvertimeBreakCode =
  | "LUNCH"
  | "ACTIVITY"
  | "DINNER"
  | "DINNER_SHORT";

export interface OvertimeCreateInput {
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly reason: string;
  readonly clientKey: string;
  /** Breaks taken during the overtime; omitted = legacy default. */
  readonly breaks?: readonly OvertimeBreakCode[];
}

/** One overtime day in the exported OT report. Money is in satang. */
export interface OvertimeReportRow {
  readonly requestId: string;
  readonly workDate: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly teamName: string;
  readonly companyName: string;
  readonly approvedStart: string;
  readonly approvedEnd: string;
  readonly actualCheckIn: string | null;
  readonly actualCheckOut: string | null;
  readonly requestedMinutes: number;
  readonly paidMinutes: number;
  /** null = legacy default breaks (no explicit choice stored). */
  readonly breaks: readonly OvertimeBreakCode[] | null;
  readonly dayType: "WORKDAY" | "NON_WORKDAY";
  readonly status: string;
  readonly transportSatang: number;
  readonly mealSatang: number;
  readonly totalSatang: number;
}

export interface OvertimeSegmentView {
  readonly id: string;
  readonly workDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly requestedMinutes: number;
  readonly attendanceRecordId: string | null;
}

export interface OvertimeRequestView {
  readonly id: string;
  readonly employeeId: string;
  readonly reason: string;
  readonly status: OvertimeRequestStatus;
  readonly decisionReason: string | null;
  readonly submittedAt: string;
  readonly segments: readonly OvertimeSegmentView[];
}

export interface OvertimeSelfOverview {
  readonly requests: readonly OvertimeRequestView[];
}

export interface OvertimeCreateResult {
  readonly requests: readonly OvertimeRequestView[];
  readonly replayed: boolean;
  readonly warnings: readonly string[];
}

export interface OvertimeCancelResult {
  readonly requestId: string;
  readonly status: "CANCELLED";
}

export interface OvertimeApprovalQueueItem extends OvertimeRequestView {
  readonly approvalStepId: string;
  readonly stepOrder: number;
}

export interface OvertimeDecisionInput {
  readonly decision: OvertimeDecision;
  readonly comment?: string | null;
}

export interface OvertimeDecisionResult {
  readonly request: OvertimeRequestView;
  readonly completed: boolean;
  readonly warnings: readonly string[];
}

/** Employee edits an overtime request that the approver sent back (date stays fixed), then submits it again. */
export interface OvertimeResubmitInput {
  readonly clientKey: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly reason: string;
  readonly breaks?: readonly OvertimeBreakCode[];
}

export interface OvertimeResubmitResult {
  readonly requestId: string;
  readonly returnedToStep: number;
  readonly replayed: boolean;
}

/** Highest-level user withdraws an overtime request that is already approved. */
export interface OvertimeWithdrawInput {
  readonly reason: string;
}

export interface OvertimeWithdrawResult {
  readonly requestId: string;
  readonly status: "CANCELLED";
}

export interface OvertimeBulkApproveResult {
  readonly approved: number;
  readonly failed: readonly { readonly requestId: string; readonly reason: string }[];
}
