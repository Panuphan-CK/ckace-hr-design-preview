export type OvertimeRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type OvertimeDecision = "APPROVED" | "REJECTED";

export interface OvertimeCreateInput {
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly reason: string;
  readonly clientKey: string;
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
