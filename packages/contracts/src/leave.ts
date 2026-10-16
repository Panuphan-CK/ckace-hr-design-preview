export type LeaveDurationCode =
  | "FULL_DAY"
  | "HOURLY"
  | "MORNING"
  | "AFTERNOON";

export type LeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "REVISION_REQUESTED";

export interface LeaveEntitlementView {
  readonly entitlementId: string;
  readonly leaveTypeId: string;
  readonly leaveTypeKey: string;
  readonly leaveTypeName: string;
  readonly quota: number;
  /** Days already approved. */
  readonly used: number;
  /** Days held by requests that are still pending or sent back for revision. */
  readonly pending: number;
  /** quota - used - pending: what can still be requested. */
  readonly remaining: number;
}

export interface LeaveRequestView {
  readonly requestId: string;
  readonly leaveTypeKey: string;
  readonly leaveTypeName: string;
  readonly description: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly durationCode: LeaveDurationCode;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly usageDays: number;
  readonly status: LeaveRequestStatus;
  readonly decisionReason: string | null;
  readonly submittedAt: string;
}

export interface LeaveSelfOverview {
  readonly entitlements: readonly LeaveEntitlementView[];
  readonly requests: readonly LeaveRequestView[];
}

export interface LeaveApproverCandidate {
  readonly employeeId: string;
  readonly displayName: string;
}

export interface LeaveApprovalStepOptions {
  readonly stepOrder: number;
  readonly requiredRoleKey: string;
  readonly scope:
    | "SAME_AGENCY"
    | "SAME_DEPARTMENT"
    | "GLOBAL";
  readonly candidates: readonly LeaveApproverCandidate[];
}

export interface LeaveCreateInput {
  readonly clientKey: string;
  readonly entitlementId: string;
  readonly description: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly durationCode: LeaveDurationCode;
  readonly startTime?: string | null;
  readonly endTime?: string | null;
  readonly approverEmployeeIds: readonly string[];
}

export interface LeaveCreateResult {
  readonly requestId: string;
  readonly replayed: boolean;
}

export interface LeaveCancelResult {
  readonly requestId: string;
  readonly status: "CANCELLED";
}

export type LeaveApprovalDecision =
  | "APPROVED"
  | "REJECTED"
  | "REVISION_REQUESTED";

export interface LeaveApprovalDecisionInput {
  readonly approvalStepId: string;
  readonly decision: LeaveApprovalDecision;
  readonly comment?: string | null;
}

export interface LeaveApprovalDecisionResult {
  readonly requestId: string;
  readonly status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "REVISION_REQUESTED";
}

/** Employee edits a request that the approver sent back, then submits it again. */
export interface LeaveResubmitInput {
  readonly clientKey: string;
  readonly description: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly durationCode: LeaveDurationCode;
  readonly startTime?: string | null;
  readonly endTime?: string | null;
}

export interface LeaveResubmitResult {
  readonly requestId: string;
  /** The approval step the request re-enters (the step that sent it back). */
  readonly returnedToStep: number;
  readonly replayed: boolean;
}

/** Highest-level user withdraws a leave request that is already approved. */
export interface LeaveWithdrawInput {
  readonly reason: string;
}

export interface LeaveWithdrawResult {
  readonly requestId: string;
  readonly status: "CANCELLED";
}
