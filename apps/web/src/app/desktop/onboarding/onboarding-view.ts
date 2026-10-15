import type {
  PendingEmployeeAdminItem,
} from "@ckace/contracts";

export interface OnboardingMetrics {
  readonly pending: number;
  readonly lineLinked: number;
  readonly lineUnlinked: number;
}

export function onboardingMetrics(
  rows: readonly PendingEmployeeAdminItem[],
): OnboardingMetrics {
  const lineLinked = rows.filter(
    (row) => row.lineLinked,
  ).length;
  return {
    pending: rows.length,
    lineLinked,
    lineUnlinked: rows.length - lineLinked,
  };
}

export function onboardingSearch(
  rows: readonly PendingEmployeeAdminItem[],
  query: string,
): readonly PendingEmployeeAdminItem[] {
  const normalized = query.trim().toLocaleLowerCase("th-TH");
  if (!normalized) return rows;
  return rows.filter((row) =>
    [
      row.fullName,
      row.nickname ?? "",
      row.loginName,
      row.employeeId,
    ].some((value) =>
      value.toLocaleLowerCase("th-TH").includes(normalized),
    ),
  );
}
