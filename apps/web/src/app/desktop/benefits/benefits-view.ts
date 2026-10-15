import type {
  BenefitRequestKind,
  BenefitRequestSummary,
  BenefitsSelfOverview,
} from "@ckace/contracts";

export type BenefitKindFilter =
  | "ALL"
  | BenefitRequestKind;

export type BenefitStatusFilter =
  | "ALL"
  | BenefitRequestSummary["status"];

export interface BenefitsMetrics {
  readonly totalRequests: number;
  readonly overtimeRequests: number;
  readonly medicalRequests: number;
  readonly pendingRequests: number;
  readonly approvedRequests: number;
}

export function benefitsMetrics(
  overview: BenefitsSelfOverview,
): BenefitsMetrics {
  return {
    totalRequests: overview.requests.length,
    overtimeRequests: overview.requests.filter(
      (request) => request.kind === "OVERTIME",
    ).length,
    medicalRequests: overview.requests.filter(
      (request) => request.kind === "MEDICAL",
    ).length,
    pendingRequests: overview.requests.filter(
      (request) => request.status === "PENDING",
    ).length,
    approvedRequests: overview.requests.filter(
      (request) => request.status === "APPROVED",
    ).length,
  };
}

export function filterBenefitsRequests(
  requests: readonly BenefitRequestSummary[],
  kind: BenefitKindFilter,
  status: BenefitStatusFilter,
): readonly BenefitRequestSummary[] {
  return requests.filter(
    (request) =>
      (kind === "ALL" || request.kind === kind) &&
      (status === "ALL" || request.status === status),
  );
}

export function benefitKindLabel(
  kind: BenefitRequestKind,
): string {
  return kind === "OVERTIME"
    ? "โอที"
    : "ค่ารักษาพยาบาล";
}

export function benefitStatusLabel(
  status: BenefitRequestSummary["status"],
): string {
  switch (status) {
    case "PENDING":
      return "รออนุมัติ";
    case "APPROVED":
      return "อนุมัติแล้ว";
    case "REJECTED":
      return "ไม่อนุมัติ";
    case "CANCELLED":
      return "ยกเลิก";
  }
}

export function benefitValueLabel(
  request: BenefitRequestSummary,
): string {
  if (request.kind === "OVERTIME") {
    const hours = request.value;
    return Number.isInteger(hours)
      ? `${hours} ชม.`
      : `${hours.toFixed(2)} ชม.`;
  }

  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(request.value);
}

export function benefitSourceHref(
  kind: BenefitRequestKind,
): string {
  return kind === "OVERTIME"
    ? "/desktop/overtime"
    : "/desktop/medical";
}
