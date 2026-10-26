import { describe, expect, it } from "vitest";

import { planPendingApprovalHandoff } from "./pending-approval-handoff";

describe("pending approval handoff", () => {
  it("replaces a pending first GAS step with all current-policy steps", () => {
    const plan = planPendingApprovalHandoff({
      requestStatus: "PENDING",
      requesterEmployeeId: "employee",
      historicalSteps: [
        { stepOrder: 1, status: "PENDING", approverEmployeeId: "old-lead" },
      ],
      currentPolicySteps: [
        { candidateEmployeeIds: ["new-lead"] },
        { candidateEmployeeIds: ["admin"] },
      ],
      policyAvailable: true,
      oldNextApproverIds: ["old-lead"],
    });

    expect(plan.decidedHistoryCount).toBe(0);
    expect(plan.steps).toEqual([
      expect.objectContaining({ stepOrder: 2, approverEmployeeId: "new-lead", policyStepIndex: 0 }),
      expect.objectContaining({ stepOrder: 3, approverEmployeeId: "admin", policyStepIndex: 1 }),
    ]);
    expect(plan).toMatchObject({ pendingBefore: 1, pendingAfter: 1, approverChanged: true });
    expect(plan.exceptionCodes).toContain("PENDING_NEXT_APPROVER_CHANGED_HR_REVIEW");
  });

  it("preserves a decided first step and routes a pending second step from policy stage two", () => {
    const plan = planPendingApprovalHandoff({
      requestStatus: "PENDING",
      requesterEmployeeId: "employee",
      historicalSteps: [
        { stepOrder: 1, status: "APPROVED", approverEmployeeId: "historic-lead" },
        { stepOrder: 2, status: "PENDING", approverEmployeeId: "old-admin" },
      ],
      currentPolicySteps: [
        { candidateEmployeeIds: ["new-lead"] },
        { candidateEmployeeIds: ["new-admin"] },
      ],
      policyAvailable: true,
      oldNextApproverIds: ["old-admin"],
    });

    expect(plan.decidedHistoryCount).toBe(1);
    expect(plan.steps).toEqual([
      expect.objectContaining({ stepOrder: 3, approverEmployeeId: "new-admin", policyStepIndex: 1 }),
    ]);
  });

  it("keeps co-approvers on one pending step and never assigns the requester", () => {
    const plan = planPendingApprovalHandoff({
      requestStatus: "PENDING",
      requesterEmployeeId: "employee",
      historicalSteps: [],
      currentPolicySteps: [
        { candidateEmployeeIds: ["employee", "lead-b", "lead-a"] },
      ],
      policyAvailable: true,
    });

    expect(plan.steps[0]).toMatchObject({
      approverEmployeeId: "lead-a",
      coApproverEmployeeIds: ["lead-b"],
    });
    expect(plan.steps[0]?.approverEmployeeId).not.toBe("employee");
    expect(plan.steps[0]?.coApproverEmployeeIds).not.toContain("employee");
  });

  it("replaces a resigned GAS approver with an active policy approver and reports the change", () => {
    const plan = planPendingApprovalHandoff({
      requestStatus: "PENDING",
      requesterEmployeeId: "employee",
      historicalSteps: [
        { stepOrder: 1, status: "PENDING", approverEmployeeId: "resigned-approver" },
      ],
      currentPolicySteps: [{ candidateEmployeeIds: ["active-approver"] }],
      policyAvailable: true,
      oldNextApproverIds: ["resigned-approver"],
    });

    expect(plan.newNextApproverIds).toEqual(["active-approver"]);
    expect(plan.approverChanged).toBe(true);
    expect(plan.exceptionCodes).toContain("PENDING_NEXT_APPROVER_CHANGED_HR_REVIEW");
  });

  it("leaves a blocked Pending placeholder when only the requester is eligible", () => {
    const plan = planPendingApprovalHandoff({
      requestStatus: "PENDING",
      requesterEmployeeId: "employee",
      historicalSteps: [],
      currentPolicySteps: [{ candidateEmployeeIds: ["employee"] }],
      policyAvailable: true,
    });

    expect(plan.steps).toEqual([
      expect.objectContaining({
        approverEmployeeId: null,
        coApproverEmployeeIds: [],
        exceptionCode: "CURRENT_APPROVER_UNRESOLVED_OR_REQUESTER_ONLY",
      }),
    ]);
    expect(plan.pendingAfter).toBe(1);
  });

  it("does not create new steps or change status for a completed request", () => {
    const plan = planPendingApprovalHandoff({
      requestStatus: "APPROVED",
      requesterEmployeeId: "employee",
      historicalSteps: [{ stepOrder: 1, status: "APPROVED", approverEmployeeId: "lead" }],
      currentPolicySteps: [{ candidateEmployeeIds: ["admin"] }],
      policyAvailable: true,
    });

    expect(plan).toMatchObject({ isPending: false, pendingBefore: 0, pendingAfter: 0, steps: [] });
  });
});
