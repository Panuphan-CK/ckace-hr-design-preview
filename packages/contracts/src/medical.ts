export type MedicalClaimStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "REVISION_REQUESTED";

export interface MedicalAttachmentView {
  readonly attachmentId: string;
  readonly fileName: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
}

export interface MedicalClaimView {
  readonly id: string;
  readonly employeeId: string;
  readonly leaveRequestId: string | null;
  readonly benefitPolicyId: string | null;
  readonly sicknessDate: string;
  readonly amount: number;
  readonly description: string;
  readonly status: MedicalClaimStatus;
  readonly decisionReason: string | null;
  readonly submittedAt: string;
  readonly requestNo?: string;
  readonly attachments: readonly MedicalAttachmentView[];
}

export interface MedicalEntitlementView {
  readonly annualLimit: number;
  readonly approved: number;
  readonly committed: number;
  readonly remaining: number;
}

export interface MedicalSelfOverview {
  readonly entitlement: MedicalEntitlementView;
  /** Per-claim limit of the active medical policy (HR setting). */
  readonly perClaimLimit?: number;
  readonly claims: readonly MedicalClaimView[];
}

export interface MedicalApprovalQueueItem
  extends MedicalClaimView {
  readonly approvalStepId: string;
  readonly stepOrder: number;
  readonly employeeDisplayName: string;
}

export interface MedicalCreateInput {
  readonly sicknessDate: string;
  readonly amount: number;
  readonly description: string;
  readonly attachmentIds: readonly string[];
  readonly leaveRequestId?: string | null;
  readonly clientKey: string;
}

export interface MedicalCreateResult {
  readonly claim: MedicalClaimView;
  readonly replayed: boolean;
  readonly warnings: readonly string[];
}

export interface MedicalCancelResult {
  readonly claimId: string;
  readonly status: "CANCELLED";
}

export interface MedicalDecisionInput {
  readonly decision: "APPROVED" | "REJECTED" | "REVISION_REQUESTED";
  readonly comment?: string | null;
}

export interface MedicalDecisionResult {
  readonly claim: MedicalClaimView;
  readonly completed: boolean;
  readonly warnings: readonly string[];
}

/** Employee edits a medical claim that the approver sent back, then submits it again (receipts stay as attached). */
export interface MedicalResubmitInput {
  readonly clientKey: string;
  readonly sicknessDate: string;
  readonly amount: number;
  readonly description: string;
}

export interface MedicalResubmitResult {
  readonly claimId: string;
  readonly returnedToStep: number;
  readonly replayed: boolean;
  /** The amount was reduced to the per-claim limit. */
  readonly capped: boolean;
}

/** Highest-level user withdraws a medical claim that is already approved. */
export interface MedicalWithdrawInput {
  readonly reason: string;
}

export interface MedicalWithdrawResult {
  readonly claimId: string;
  readonly status: "CANCELLED";
}
