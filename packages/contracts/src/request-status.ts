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

/** Medical claim figures an approver needs to decide (pending approvals only). */
export interface MedicalApprovalDetail {
  readonly amount: number;
  /** ISO date (yyyy-mm-dd). */
  readonly sicknessDate: string;
  readonly attachmentIds: readonly string[];
}

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
  readonly medical?: MedicalApprovalDetail;
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
  /** Set when a delegate decided on behalf of the approver. */
  readonly decidedByName?: string | null;
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

/** Who will approve a request if the employee submits it now (shown on the submit form). */
export interface ApprovalChainPreview {
  /** Admin-level requesters are approved automatically (medical). */
  readonly autoApproved: boolean;
  readonly steps: readonly {
    readonly stepOrder: number;
    readonly approverEmployeeId: string;
    readonly approverName: string | null;
  }[];
}

export interface ApprovalDelegationItem {
  readonly id: string;
  readonly delegatorEmployeeId: string;
  readonly delegatorName: string;
  readonly delegateEmployeeId: string;
  readonly delegateName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly active: boolean;
}

export interface ApprovalDelegationOverview {
  /** Delegations the caller created (current and future). */
  readonly given: readonly ApprovalDelegationItem[];
  /** Delegations handed to the caller. */
  readonly received: readonly ApprovalDelegationItem[];
  /** Employees the caller may delegate to (they can approve requests). */
  readonly candidates: readonly { readonly employeeId: string; readonly name: string }[];
}

export interface InAppNotificationItem {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly body: string;
  readonly requestNo: string | null;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly createdAt: string;
  readonly read: boolean;
}

export interface InboxOverview {
  readonly unread: number;
  readonly items: readonly InAppNotificationItem[];
}
