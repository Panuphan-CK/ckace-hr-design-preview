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
