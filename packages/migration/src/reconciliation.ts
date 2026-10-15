export type ReconciliationStatus = "PASS" | "EXCEPTION" | "FAIL";

export interface ReconciliationResult {
  readonly entityType: string;
  readonly checkName: string;
  readonly status: ReconciliationStatus;
  readonly sourceValue: string;
  readonly targetValue: string;
  readonly exceptionCode: string | null;
  readonly disposition: string | null;
}

export function validateReconciliationResult(
  result: ReconciliationResult,
): void {
  if (!result.entityType.trim() || !result.checkName.trim()) {
    throw new Error(
      "Reconciliation entityType and checkName are required",
    );
  }

  if (result.status !== "PASS") {
    if (!result.exceptionCode?.trim() || !result.disposition?.trim()) {
      throw new Error(
        "Non-PASS reconciliation requires exceptionCode and disposition",
      );
    }
  }

  if (
    result.status === "PASS" &&
    (result.exceptionCode !== null || result.disposition !== null)
  ) {
    throw new Error(
      "PASS reconciliation cannot carry exception disposition",
    );
  }
}

export function countByStatus(
  results: readonly ReconciliationResult[],
): Readonly<Record<ReconciliationStatus, number>> {
  for (const result of results) {
    validateReconciliationResult(result);
  }

  return results.reduce<Record<ReconciliationStatus, number>>(
    (accumulator, result) => {
      accumulator[result.status] += 1;
      return accumulator;
    },
    { PASS: 0, EXCEPTION: 0, FAIL: 0 },
  );
}

export function hasBlockingReconciliationFailure(
  results: readonly ReconciliationResult[],
): boolean {
  return results.some((result) => result.status === "FAIL");
}
