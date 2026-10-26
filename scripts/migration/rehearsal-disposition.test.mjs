import { describe, expect, it } from "vitest";

import { evaluateRehearsalDispositions } from "./rehearsal-disposition.mjs";

function approvedOutcomes() {
  return [
    ...Array.from({ length: 34 }, (_, index) => ({
      sourceTab: index % 2 === 0 ? "Attachments" : "MedicalAttachments",
      legacyId: `FILE-${index}`,
      status: "SKIPPED_TRANSFORM",
      code: "SANITIZED_ATTACHMENT_BYTES_UNAVAILABLE",
    })),
    {
      sourceTab: "ApprovalSteps",
      legacyId: "STEP-001",
      status: "SKIPPED_TRANSFORM",
      code: "LEGACY_PENDING_APPROVAL_REPLACED_BY_CURRENT_POLICY",
    },
    ...["USER-007", "USER-012"].map((userId) => ({
      sourceTab: "TimeLog",
      legacyId: `LOG-001112::USER:${userId}`,
      status: "IMPORTED",
      code: "ATTENDANCE_LOG_ID_REUSED_ACROSS_EMPLOYEES",
    })),
    { sourceTab: "Users", legacyId: "USER-001", status: "IMPORTED", code: null },
  ];
}

function validInput(overrides = {}) {
  return {
    outcomes: approvedOutcomes(),
    rowAccounting: { Users: { unaccountedRows: 0 }, Attachments: { unaccountedRows: 0 } },
    stoppedEarly: false,
    ambiguousWriteCount: 0,
    rejectedCount: 0,
    pendingApprovalHandoff: {
      sourcePendingRequestCount: 1,
      targetPendingRequestCount: 1,
      pendingRequestCountMatches: true,
      changedNextApprovers: [{
        requestLegacyId: "LEV-0109",
        oldApproverIds: ["old-approver"],
        newApproverIds: [],
      }],
      unresolvedApprovers: [{
        requestLegacyId: "LEV-0109",
        reasonCode: "CURRENT_APPROVAL_POLICY_HAS_NO_REMAINING_STEPS",
      }],
    },
    ...overrides,
  };
}

describe("approved rehearsal dispositions", () => {
  it("returns pass only when all observed named dispositions match exactly", () => {
    const result = evaluateRehearsalDispositions(validInput());

    expect(result.passed).toBe(true);
    expect(result.unapprovedOutcomeCount).toBe(0);
    expect(result.outcomeDispositions.map(({ actualCount }) => actualCount)).toEqual([34, 1, 2]);
    expect(result.pendingDispositions).toEqual([
      expect.objectContaining({ id: "LEV-0109_REQUIRES_HR_CLOSE_OUT", actualCount: 1, matched: true }),
    ]);
    expect(result.changedNextApproverDispositions).toEqual([
      expect.objectContaining({
        id: "LEV-0109_CHANGED_NEXT_APPROVER_REQUIRES_HR_CLOSE_OUT",
        actualCount: 1,
        matched: true,
      }),
    ]);
    expect(result.hardGates.changedNextApprovers).toBe(1);
    expect(result.hardGates.unapprovedChangedNextApproverCount).toBe(0);
  });

  it("fails when an approved exception count changes or an unexpected skip appears", () => {
    const input = validInput({
      outcomes: [
        ...approvedOutcomes(),
        { sourceTab: "Attachments", legacyId: "FILE-EXTRA", status: "SKIPPED_TRANSFORM", code: "SANITIZED_ATTACHMENT_BYTES_UNAVAILABLE" },
        { sourceTab: "MedicalClaims", legacyId: "MED-EXTRA", status: "SKIPPED_TRANSFORM", code: "UNKNOWN_EXCEPTION" },
      ],
    });
    const result = evaluateRehearsalDispositions(input);

    expect(result.passed).toBe(false);
    expect(result.outcomeDispositions[0]).toMatchObject({ actualCount: 35, expectedCount: 34, matched: false });
    expect(result.unapprovedOutcomeCount).toBe(1);
  });

  it("fails if the attendance collision IDs or LEV-0109 exception changes", () => {
    const input = validInput({
      outcomes: approvedOutcomes().map((outcome) => outcome.legacyId === "LOG-001112::USER:USER-007"
        ? { ...outcome, legacyId: "LOG-OTHER::USER:USER-007" }
        : outcome),
      pendingApprovalHandoff: {
        ...validInput().pendingApprovalHandoff,
        unresolvedApprovers: [{ requestLegacyId: "LEV-0108", reasonCode: "CURRENT_APPROVAL_POLICY_HAS_NO_REMAINING_STEPS" }],
      },
    });
    const result = evaluateRehearsalDispositions(input);

    expect(result.passed).toBe(false);
    expect(result.outcomeDispositions[2]).toMatchObject({ actualCount: 1, expectedCount: 2, matched: false });
    expect(result.pendingDispositions[0]).toMatchObject({ actualCount: 0, matched: false });
    expect(result.hardGates.unapprovedPendingCount).toBe(1);
  });

  it("keeps hard failures blocking even with the exact approved exception set", () => {
    const result = evaluateRehearsalDispositions(validInput({
      ambiguousWriteCount: 1,
      pendingApprovalHandoff: {
        ...validInput().pendingApprovalHandoff,
        pendingRequestCountMatches: false,
      },
    }));

    expect(result.passed).toBe(false);
    expect(result.hardGates.ambiguousWrites).toBe(1);
    expect(result.hardGates.pendingRequestCountMatches).toBe(false);
  });

  it("fails for another changed approver or a duplicate LEV-0109 change", () => {
    const unexpectedRequest = evaluateRehearsalDispositions(validInput({
      pendingApprovalHandoff: {
        ...validInput().pendingApprovalHandoff,
        changedNextApprovers: [{ requestLegacyId: "LEV-0110" }],
      },
    }));
    expect(unexpectedRequest.passed).toBe(false);
    expect(unexpectedRequest.hardGates.unapprovedChangedNextApproverCount).toBe(1);

    const duplicateApprovedRequest = evaluateRehearsalDispositions(validInput({
      pendingApprovalHandoff: {
        ...validInput().pendingApprovalHandoff,
        changedNextApprovers: [
          { requestLegacyId: "LEV-0109" },
          { requestLegacyId: "LEV-0109" },
        ],
      },
    }));
    expect(duplicateApprovedRequest.passed).toBe(false);
    expect(duplicateApprovedRequest.hardGates.unapprovedChangedNextApproverCount).toBe(0);
    expect(duplicateApprovedRequest.changedNextApproverDispositions[0]).toMatchObject({
      actualCount: 2,
      expectedCount: 1,
      matched: false,
    });
  });
});
