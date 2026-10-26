export interface HistoricalApprovalStep {
  readonly stepOrder: number;
  readonly status: string;
  readonly approverEmployeeId: string | null;
  readonly coApproverEmployeeIds?: readonly string[];
}

export interface CurrentPolicyApprovalStep {
  readonly candidateEmployeeIds: readonly string[];
  readonly selectedEmployeeId?: string | null;
  readonly unresolvedReason?: string;
}

export interface PendingApprovalHandoffStep {
  readonly stepOrder: number;
  readonly approverEmployeeId: string | null;
  readonly coApproverEmployeeIds: readonly string[];
  readonly policyStepIndex: number | null;
  readonly exceptionCode: string | null;
}

export interface PendingApprovalHandoffPlan {
  readonly isPending: boolean;
  readonly decidedHistoryCount: number;
  readonly steps: readonly PendingApprovalHandoffStep[];
  readonly pendingBefore: number;
  readonly pendingAfter: number;
  readonly oldNextApproverIds: readonly string[];
  readonly newNextApproverIds: readonly string[];
  readonly approverChanged: boolean;
  readonly exceptionCodes: readonly string[];
}

export interface PendingApprovalExceptionGuidance {
  readonly summary: string;
  readonly actionRequired: string;
}

export function pendingApprovalExceptionGuidance(
  code: string,
): PendingApprovalExceptionGuidance | null {
  if (code === "CURRENT_APPROVAL_POLICY_HAS_NO_REMAINING_STEPS") {
    return {
      summary: "อนุมัติครบตาม policy ใหม่แล้ว รอ HR ยืนยันปิดคำขอ",
      actionRequired:
        "ก่อน write freeze ให้แจ้งผู้อนุมัติปิดคำขอที่ยัง Pending ใน GAS แล้วให้ HR ยืนยันสถานะปิดคำขอ",
    };
  }
  return null;
}

/**
 * Keep decided GAS approvals as immutable history, then append unresolved or
 * current-policy steps. No missing route can silently turn a request approved.
 */
export function planPendingApprovalHandoff(input: {
  readonly requestStatus: string;
  readonly requesterEmployeeId: string;
  readonly historicalSteps: readonly HistoricalApprovalStep[];
  readonly currentPolicySteps: readonly CurrentPolicyApprovalStep[];
  readonly policyAvailable: boolean;
  readonly policyUnavailableReason?: string;
  readonly oldNextApproverIds?: readonly string[];
}): PendingApprovalHandoffPlan {
  const requestIsPending = input.requestStatus.toUpperCase() === "PENDING";
  const oldNextApproverIds = uniqueSorted(input.oldNextApproverIds ?? []);
  if (!requestIsPending) {
    return {
      isPending: false,
      decidedHistoryCount: 0,
      steps: [],
      pendingBefore: 0,
      pendingAfter: 0,
      oldNextApproverIds,
      newNextApproverIds: [],
      approverChanged: false,
      exceptionCodes: [],
    };
  }

  const orderedHistory = [...input.historicalSteps].sort(
    (left, right) => left.stepOrder - right.stepOrder,
  );
  let decidedHistoryCount = 0;
  for (const step of orderedHistory) {
    if (step.status !== "APPROVED") break;
    decidedHistoryCount += 1;
  }
  const maxHistoryOrder = orderedHistory.reduce(
    (max, step) => Math.max(max, step.stepOrder),
    0,
  );
  const exceptionCodes = new Set<string>();
  const terminalHistoryOnPending = orderedHistory.some((step) =>
    ["REJECTED", "CANCELLED", "REVISION_REQUESTED"].includes(step.status),
  );
  const pendingSteps: PendingApprovalHandoffStep[] = [];

  const addPlaceholder = (index: number | null, code: string) => {
    exceptionCodes.add(code);
    pendingSteps.push({
      stepOrder: maxHistoryOrder + pendingSteps.length + 1,
      approverEmployeeId: null,
      coApproverEmployeeIds: [],
      policyStepIndex: index,
      exceptionCode: code,
    });
  };

  if (terminalHistoryOnPending) {
    addPlaceholder(null, "PENDING_REQUEST_HAS_TERMINAL_APPROVAL_HISTORY");
  } else if (!input.policyAvailable) {
    addPlaceholder(
      null,
      input.policyUnavailableReason ?? "CURRENT_APPROVAL_POLICY_UNAVAILABLE",
    );
  } else {
    const remainingPolicySteps = input.currentPolicySteps.slice(
      decidedHistoryCount,
    );
    if (remainingPolicySteps.length === 0) {
      addPlaceholder(null, "CURRENT_APPROVAL_POLICY_HAS_NO_REMAINING_STEPS");
    } else {
      remainingPolicySteps.forEach((step, index) => {
        const policyStepIndex = decidedHistoryCount + index;
        const candidates = uniqueSorted(
          step.candidateEmployeeIds.filter(
            (id) => id !== input.requesterEmployeeId,
          ),
        );
        if (step.unresolvedReason || candidates.length === 0) {
          addPlaceholder(
            policyStepIndex,
            step.unresolvedReason ?? "CURRENT_APPROVER_UNRESOLVED_OR_REQUESTER_ONLY",
          );
          return;
        }

        const selected = step.selectedEmployeeId && candidates.includes(step.selectedEmployeeId)
          ? step.selectedEmployeeId
          : candidates[0] ?? null;
        if (!selected) {
          addPlaceholder(policyStepIndex, "CURRENT_APPROVER_UNRESOLVED");
          return;
        }

        pendingSteps.push({
          stepOrder: maxHistoryOrder + pendingSteps.length + 1,
          approverEmployeeId: selected,
          coApproverEmployeeIds: candidates.filter((id) => id !== selected),
          policyStepIndex,
          exceptionCode: null,
        });
      });
    }
  }

  const firstStep = pendingSteps[0];
  const newNextApproverIds = firstStep
    ? uniqueSorted([
        ...(firstStep.approverEmployeeId ? [firstStep.approverEmployeeId] : []),
        ...firstStep.coApproverEmployeeIds,
      ])
    : [];
  const approverChanged = !sameStrings(oldNextApproverIds, newNextApproverIds);
  if (approverChanged) exceptionCodes.add("PENDING_NEXT_APPROVER_CHANGED_HR_REVIEW");

  return {
    isPending: true,
    decidedHistoryCount,
    steps: pendingSteps,
    pendingBefore: 1,
    pendingAfter: 1,
    oldNextApproverIds,
    newNextApproverIds,
    approverChanged,
    exceptionCodes: [...exceptionCodes].sort(),
  };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
