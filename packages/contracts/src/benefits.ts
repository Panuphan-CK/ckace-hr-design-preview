import type { MedicalEntitlementView } from "./medical";

export type BenefitRequestKind = "OVERTIME" | "MEDICAL";
export interface BenefitAttachmentSummary { readonly attachmentId: string; readonly label: string; }
export interface BenefitRequestSummary {
  readonly id: string; readonly kind: BenefitRequestKind; readonly date: string;
  readonly startTime: string | null; readonly endTime: string | null; readonly value: number;
  readonly reason: string; readonly status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REVISION_REQUESTED";
  readonly comment: string | null; readonly submittedAt: string;
  readonly attachments: readonly BenefitAttachmentSummary[];
}
export interface BenefitsSelfOverview {
  readonly medicalEntitlement: MedicalEntitlementView;
  readonly requests: readonly BenefitRequestSummary[];
}
