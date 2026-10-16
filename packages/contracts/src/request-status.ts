export type UnifiedRequestKind =
  | "LEAVE"
  | "TIME_CORRECTION"
  | "OVERTIME"
  | "MEDICAL";

export type UnifiedRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "REVISION_REQUESTED";

export interface RequestStatusItem {
  readonly id: string;
  /** Running number such as LEV-0001, OT-0001, MED-0001, TC-0001. */
  readonly requestNo: string;
  readonly kind: UnifiedRequestKind;
  readonly status: UnifiedRequestStatus;
  readonly submittedAt: string;
  readonly summary: string;
  readonly decisionReason: string | null;
  readonly employeeId: string;
  readonly employeeDisplayName?: string;
  readonly canDecide: boolean;
  readonly approvalStepId: string | null;
  readonly stepOrder: number | null;
}

export interface RequestStatusOverview {
  readonly requests: readonly RequestStatusItem[];
}

export type ApprovalDecision = "APPROVED" | "REJECTED";

export interface ApprovalHistoryItem {
  readonly id: string;
  readonly requestId: string;
  readonly requestNo: string;
  readonly kind: UnifiedRequestKind;
  readonly decision: ApprovalDecision;
  readonly submittedAt: string;
  readonly decidedAt: string;
  readonly summary: string;
  readonly comment: string | null;
  readonly employeeId: string;
  readonly employeeDisplayName?: string;
  readonly stepOrder: number;
}

export interface ApprovalHistoryOverview {
  readonly decisions: readonly ApprovalHistoryItem[];
}

export interface RequestTimelineStep {
  readonly stepOrder: number;
  readonly approverName: string | null;
  readonly status: "PENDING" | "APPROVED" | "REJECTED" | "REVISION_REQUESTED" | "SKIPPED" | "CANCELLED";
  readonly decidedAt: string | null;
  readonly comment: string | null;
}

/** Approval chain of one request, visible to the requester and to the approvers on it. */
export interface RequestTimeline {
  readonly requestId: string;
  readonly kind: UnifiedRequestKind;
  readonly requestNo: string;
  readonly steps: readonly RequestTimelineStep[];
}
