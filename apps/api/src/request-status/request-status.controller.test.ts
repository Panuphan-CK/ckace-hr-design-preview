import type { RequestStatusRepository } from "@ckace/database";
import { describe, expect, it } from "vitest";

import {
  REQUIRE_PERMISSION_KEY, SELF_AUTHORIZATION_TARGET_KEY,
} from "../security/require-permission.decorator";
import { RequestStatusController } from "./request-status.controller";
import { RequestStatusService } from "./request-status.service";

const repository = {
  async getSelf() { return { requests: [] }; },
  async getTimeline() { return null; },
  async getAssigned() { return { requests: [] }; },
  async getApprovalHistory() { return { decisions: [] }; },
} as RequestStatusRepository;

describe("RequestStatus API", () => {
  it("uses explicit SELF permission and keeps aggregate approval access server-filtered", () => {
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, RequestStatusController.prototype.getSelf))
      .toEqual({ permission: "requests.self.read", scope: "SELF" });
    expect(Reflect.getMetadata(SELF_AUTHORIZATION_TARGET_KEY, RequestStatusController.prototype.getSelf)).toBe(true);
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, RequestStatusController.prototype.getAssigned))
      .toBeUndefined();
    expect(Reflect.getMetadata(REQUIRE_PERMISSION_KEY, RequestStatusController.prototype.getApprovalHistory))
      .toBeUndefined();
  });

  it("filters assigned requests by the actor's module-specific approve permissions", async () => {
    const service = new RequestStatusService({
      async getSelf() { return { requests: [] }; },
      async getTimeline() { return null; },
      async getAssigned() {
        return {
          requests: [
            {
              id: "leave-1", requestNo: "X-0001", kind: "LEAVE", status: "PENDING",
              submittedAt: "2026-10-07T00:00:00.000Z", summary: "Leave",
              decisionReason: null, employeeId: "employee-1", canDecide: true,
              approvalStepId: "step-1", stepOrder: 1,
            },
            {
              id: "ot-1", requestNo: "X-0001", kind: "OVERTIME", status: "PENDING",
              submittedAt: "2026-10-07T00:00:00.000Z", summary: "OT",
              decisionReason: null, employeeId: "employee-1", canDecide: true,
              approvalStepId: "step-2", stepOrder: 1,
            },
          ],
        };
      },
      async getApprovalHistory() {
        return { decisions: [] };
      },
    });

    await expect(
      service.getAssigned(
        "00000000-0000-4000-8000-000000000001",
        ["leave.approve"],
      ),
    ).resolves.toEqual({
      requests: [
        expect.objectContaining({ id: "leave-1", kind: "LEAVE" }),
      ],
    });
  });

  it("filters approval history by the actor's module-specific approve permissions", async () => {
    const service = new RequestStatusService({
      async getSelf() { return { requests: [] }; },
      async getTimeline() { return null; },
      async getAssigned() { return { requests: [] }; },
      async getApprovalHistory() {
        return {
          decisions: [
            {
              id: "step-leave",
              requestId: "leave-1",
              requestNo: "X-0001",
              kind: "LEAVE",
              decision: "APPROVED",
              submittedAt: "2026-10-07T00:00:00.000Z",
              decidedAt: "2026-10-07T01:00:00.000Z",
              summary: "Leave",
              comment: null,
              employeeId: "employee-1",
              stepOrder: 1,
            },
            {
              id: "step-ot",
              requestId: "ot-1",
              requestNo: "X-0001",
              kind: "OVERTIME",
              decision: "REJECTED",
              submittedAt: "2026-10-07T00:00:00.000Z",
              decidedAt: "2026-10-07T01:30:00.000Z",
              summary: "OT",
              comment: "Not approved",
              employeeId: "employee-1",
              stepOrder: 1,
            },
          ],
        };
      },
    });

    await expect(
      service.getApprovalHistory(
        "00000000-0000-4000-8000-000000000001",
        ["leave.approve"],
      ),
    ).resolves.toEqual({
      decisions: [
        expect.objectContaining({ id: "step-leave", kind: "LEAVE" }),
      ],
    });
  });

  it("does not create a new decision path", async () => {
    const service = new RequestStatusService(repository);
    await expect(service.getSelf("00000000-0000-4000-8000-000000000001"))
      .resolves.toEqual({ requests: [] });
  });
});

describe("RequestStatus timeline", () => {
  it("returns 404 when the request is unknown or not visible to the actor", async () => {
    const service = new RequestStatusService(repository);
    await expect(service.getTimeline("e1", "00000000-0000-4000-8000-000000000001")).rejects.toThrow("Request not found");
  });

  it("returns the approval chain for a visible request", async () => {
    const timeline = {
      requestId: "00000000-0000-4000-8000-000000000002",
      kind: "LEAVE" as const,
      requestNo: "LEV-0001",
      steps: [{ stepOrder: 1, approverName: "ผู้ดูแล", status: "APPROVED" as const, decidedAt: null, comment: null }],
    };
    const service = new RequestStatusService({ ...repository, async getTimeline() { return timeline; } } as RequestStatusRepository);
    await expect(service.getTimeline("e1", timeline.requestId)).resolves.toEqual(timeline);
  });
});
