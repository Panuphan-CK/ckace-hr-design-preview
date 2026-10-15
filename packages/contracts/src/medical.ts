export type MedicalClaimStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

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
  readonly decision: "APPROVED" | "REJECTED";
  readonly comment?: string | null;
}

export interface MedicalDecisionResult {
  readonly claim: MedicalClaimView;
  readonly completed: boolean;
  readonly warnings: readonly string[];
}
