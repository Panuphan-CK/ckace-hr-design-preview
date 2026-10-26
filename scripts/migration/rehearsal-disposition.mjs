import {
  APPROVED_CHANGED_NEXT_APPROVER_DISPOSITIONS,
  APPROVED_PENDING_HANDOFF_DISPOSITIONS,
  APPROVED_REHEARSAL_OUTCOME_DISPOSITIONS,
} from "./approved-rehearsal-dispositions.mjs";

function matchesOutcome(outcome, disposition) {
  if (
    outcome.status !== disposition.status ||
    outcome.code !== disposition.code ||
    !disposition.sourceTabs.includes(outcome.sourceTab)
  ) return false;
  return !disposition.legacyIds || disposition.legacyIds.includes(outcome.legacyId);
}

function isNonPassOutcome(outcome) {
  return (
    !["IMPORTED", "SKIPPED_IDENTICAL"].includes(outcome.status) ||
    (outcome.status === "IMPORTED" && outcome.code !== null)
  );
}

export function evaluateRehearsalDispositions(input) {
  const outcomes = Array.isArray(input.outcomes) ? input.outcomes : [];
  const accountedOutcomeIndexes = new Set();
  const outcomeDispositions = APPROVED_REHEARSAL_OUTCOME_DISPOSITIONS.map((disposition) => {
    const matches = [];
    outcomes.forEach((outcome, index) => {
      if (matchesOutcome(outcome, disposition)) {
        matches.push({ outcome, index });
      }
    });
    for (const item of matches) accountedOutcomeIndexes.add(item.index);
    return {
      id: disposition.id,
      approval: disposition.approval,
      expectedCount: disposition.count,
      actualCount: matches.length,
      matched: matches.length === disposition.count,
      ...(disposition.legacyIds
        ? {
            expectedLegacyIds: [...disposition.legacyIds].sort(),
            actualLegacyIds: matches.map(({ outcome }) => outcome.legacyId).sort(),
          }
        : {}),
    };
  });

  const unapprovedOutcomes = outcomes.filter((outcome, index) =>
    isNonPassOutcome(outcome) && !accountedOutcomeIndexes.has(index),
  );
  const handoff = input.pendingApprovalHandoff ?? {
    sourcePendingRequestCount: 0,
    targetPendingRequestCount: 0,
    pendingRequestCountMatches: false,
    changedNextApprovers: [],
    unresolvedApprovers: [],
  };
  const unresolved = Array.isArray(handoff.unresolvedApprovers)
    ? handoff.unresolvedApprovers
    : [];
  const pendingDispositions = APPROVED_PENDING_HANDOFF_DISPOSITIONS.map((disposition) => {
    const matches = unresolved.filter((entry) =>
      entry.requestLegacyId === disposition.requestLegacyId &&
      entry.reasonCode === disposition.reasonCode,
    );
    return {
      id: disposition.id,
      approval: disposition.approval,
      expectedCount: disposition.count,
      actualCount: matches.length,
      matched: matches.length === disposition.count,
    };
  });
  const approvedPendingKeys = new Set(
    APPROVED_PENDING_HANDOFF_DISPOSITIONS.map((entry) => `${entry.requestLegacyId}::${entry.reasonCode}`),
  );
  const unapprovedPendingCount = unresolved.filter((entry) =>
    !approvedPendingKeys.has(`${entry.requestLegacyId}::${entry.reasonCode}`),
  ).length;
  const changedNextApprovers = Array.isArray(handoff.changedNextApprovers)
    ? handoff.changedNextApprovers
    : [];
  const changedNextApproverDispositions = APPROVED_CHANGED_NEXT_APPROVER_DISPOSITIONS.map((disposition) => {
    const matches = changedNextApprovers.filter((entry) =>
      entry.requestLegacyId === disposition.requestLegacyId,
    );
    return {
      id: disposition.id,
      approval: disposition.approval,
      expectedCount: disposition.count,
      actualCount: matches.length,
      matched: matches.length === disposition.count,
      actualRequestLegacyIds: matches.map((entry) => entry.requestLegacyId).sort(),
    };
  });
  const approvedChangedRequestIds = new Set(
    APPROVED_CHANGED_NEXT_APPROVER_DISPOSITIONS.map(({ requestLegacyId }) => requestLegacyId),
  );
  const unapprovedChangedNextApproverCount = changedNextApprovers.filter((entry) =>
    !approvedChangedRequestIds.has(entry.requestLegacyId),
  ).length;
  const unaccountedRows = Object.values(input.rowAccounting ?? {})
    .reduce((total, value) => total + Math.abs(Number(value?.unaccountedRows ?? 0)), 0);
  const hardGates = {
    stoppedEarly: input.stoppedEarly === true,
    ambiguousWrites: Number(input.ambiguousWriteCount ?? 0),
    rejectedRows: Number(input.rejectedCount ?? 0),
    unaccountedRows,
    pendingRequestCountMatches: handoff.pendingRequestCountMatches === true,
    changedNextApprovers: changedNextApprovers.length,
    unapprovedChangedNextApproverCount,
    unapprovedPendingCount,
  };
  const dispositionCountsMatch =
    outcomeDispositions.every((entry) => entry.matched) &&
    pendingDispositions.every((entry) => entry.matched) &&
    changedNextApproverDispositions.every((entry) => entry.matched);
  const hardGatesPass =
    !hardGates.stoppedEarly &&
    hardGates.ambiguousWrites === 0 &&
    hardGates.rejectedRows === 0 &&
    hardGates.unaccountedRows === 0 &&
    hardGates.pendingRequestCountMatches &&
    hardGates.unapprovedChangedNextApproverCount === 0 &&
    hardGates.unapprovedPendingCount === 0;

  return {
    passed: dispositionCountsMatch && hardGatesPass && unapprovedOutcomes.length === 0,
    outcomeDispositions,
    pendingDispositions,
    changedNextApproverDispositions,
    unapprovedOutcomeCount: unapprovedOutcomes.length,
    unapprovedOutcomes,
    hardGates,
  };
}
