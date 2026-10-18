import type { InternalActorContext } from "@ckace/auth";
import type {
  LeaveApprovalDecisionInput,
  LeaveApprovalStepOptions,
  LeaveCreateInput,
  LeaveResubmitInput,
  LeaveSelfOverview,
} from "@ckace/contracts";
import type { LeaveRepository } from "@ckace/database";
import {
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it } from "vitest";

import {
  REQUIRE_PERMISSION_KEY,
} from "../security/require-permission.decorator";
import { LeaveController } from "./leave.controller";
import { LeaveService } from "./leave.service";

class FakeLeaveRepository implements LeaveRepository {
  lastDecision:
    | {
        approverEmployeeId: string;
        correlationId: string;
        requestId: string;
        decision: LeaveApprovalDecisionInput;
      }
    | undefined;

  lastCreate:
    | {
        employeeId: string;
        correlationId: string;
        request: LeaveCreateInput;
        canonicalPayload: string;
      }
    | undefined;

  lastResubmit:
    | {
        employeeId: string;
        requestId: string;
        request: LeaveResubmitInput;
      }
    | undefined;

  lastWithdraw:
    | {
        actorEmployeeId: string;
        requestId: string;
        reason: string;
      }
    | undefined;

  async getSelfOverview(): Promise<LeaveSelfOverview> {
    return {
      entitlements: [],
      requests: [],
      holidays: [],
      workingWeekdays: [1, 2, 3, 4, 5],
    };
  }

  async getApprovalOptions(): Promise<
    readonly LeaveApprovalStepOptions[]
  > {
    return [];
  }

  async createSelfLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: LeaveCreateInput;
    readonly canonicalPayload: string;
  }) {
    this.lastCreate = input;

    return {
      requestId: "00000000-0000-4000-8000-000000000010",
      replayed: false,
    };
  }

  async findEntitlementForYear(input: { entitlementId: string; year: number }): Promise<string | null> {
    return `${input.entitlementId}-${input.year}`;
  }

  async cancelSelfLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }) {
    return {
      requestId: input.requestId,
      status: "CANCELLED" as const,
    };
  }

  async resubmitLeave(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly request: LeaveResubmitInput;
    readonly canonicalPayload: string;
  }) {
    this.lastResubmit = input;

    return {
      requestId: input.requestId,
      returnedToStep: 1,
      replayed: false,
    };
  }

  async withdrawApprovedLeave(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly reason: string;
  }) {
    this.lastWithdraw = input;

    return {
      requestId: input.requestId,
      status: "CANCELLED" as const,
    };
  }

  async decideLeave(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly decision: LeaveApprovalDecisionInput;
  }) {
    this.lastDecision = input;
    return {
      requestId: input.requestId,
      status:
        input.decision.decision === "REJECTED"
          ? ("REJECTED" as const)
          : input.decision.decision === "REVISION_REQUESTED"
            ? ("REVISION_REQUESTED" as const)
            : ("APPROVED" as const),
    };
  }
}

const actor: InternalActorContext = {
  employeeId: "00000000-0000-4000-8000-000000000001",
  legacyUid: "USER-001",
  roles: ["EMPLOYEE"],
  permissions: ["leave.self.read", "leave.self.write"],
  agencyId: "00000000-0000-4000-8000-000000000002",
  departmentId: "00000000-0000-4000-8000-000000000003",
  authenticatedBy: "PROJECT_B_WEB",
  correlationId: "corr-leave",
};

function validBody() {
  return {
    clientKey: "client-1",
    entitlementId: "00000000-0000-4000-8000-000000000008",
    description: "Annual leave",
    startDate: "2026-10-05",
    endDate: "2026-10-05",
    durationCode: "FULL_DAY",
    approverEmployeeIds: [
      "00000000-0000-4000-8000-000000000009",
    ],
  };
}

describe("LeaveController / LeaveService", () => {
  it("derives requester identity only from the server actor", async () => {
    const repository = new FakeLeaveRepository();
    const controller = new LeaveController(
      new LeaveService(repository),
    );

    await controller.create(
      { actor },
      {
        ...validBody(),
        employeeId:
          "00000000-0000-4000-8000-000000000999",
        role: "SUPERADMIN",
      },
    );

    expect(repository.lastCreate?.employeeId).toBe(
      actor.employeeId,
    );
    expect(
      repository.lastCreate?.request.entitlementId,
    ).toBe("00000000-0000-4000-8000-000000000008");
    expect(
      repository.lastCreate?.canonicalPayload,
    ).not.toContain("00000000-0000-4000-8000-000000000999");
  });

  it("does not bind the client key into the business payload hash", async () => {
    const repository = new FakeLeaveRepository();
    const service = new LeaveService(repository);

    await service.createSelfLeave({
      employeeId: actor.employeeId,
      correlationId: actor.correlationId,
      body: validBody(),
    });
    const first = repository.lastCreate?.canonicalPayload;

    await service.createSelfLeave({
      employeeId: actor.employeeId,
      correlationId: actor.correlationId,
      body: {
        ...validBody(),
        clientKey: "different-client-key",
      },
    });

    expect(repository.lastCreate?.canonicalPayload).toBe(first);
  });

  it("files a leave across New Year as one request per calendar year", async () => {
    const repository = new FakeLeaveRepository();
    const calls: LeaveCreateInput[] = [];
    let counter = 0;
    repository.createSelfLeave = async (input) => {
      calls.push(input.request);
      counter += 1;
      return { requestId: `00000000-0000-4000-8000-00000000002${counter}`, replayed: false };
    };
    const service = new LeaveService(repository);

    const result = await service.createSelfLeave({
      employeeId: actor.employeeId,
      correlationId: actor.correlationId,
      body: { ...validBody(), startDate: "2026-12-29", endDate: "2027-01-04" },
    });

    expect(calls.map((c) => [c.startDate, c.endDate])).toEqual([
      ["2026-12-29", "2026-12-31"],
      ["2027-01-01", "2027-01-04"],
    ]);
    expect(calls[0]?.entitlementId.endsWith("-2026")).toBe(true);
    expect(calls[1]?.entitlementId.endsWith("-2027")).toBe(true);
    expect(calls[0]?.clientKey).not.toBe(calls[1]?.clientKey);
    expect(result.additionalRequestIds).toHaveLength(1);
  });

  it("cancels the parts already filed when a later year part fails", async () => {
    const repository = new FakeLeaveRepository();
    const cancelled: string[] = [];
    let counter = 0;
    repository.createSelfLeave = async () => {
      counter += 1;
      if (counter === 2) throw new Error("Leave entitlement exceeded");
      return { requestId: "00000000-0000-4000-8000-000000000031", replayed: false };
    };
    repository.cancelSelfLeave = async (input) => {
      cancelled.push(input.requestId);
      return { requestId: input.requestId } as never;
    };
    const service = new LeaveService(repository);

    await expect(
      service.createSelfLeave({
        employeeId: actor.employeeId,
        correlationId: actor.correlationId,
        body: { ...validBody(), startDate: "2026-12-29", endDate: "2027-01-04" },
      }),
    ).rejects.toThrow();
    expect(cancelled).toEqual(["00000000-0000-4000-8000-000000000031"]);
  });

  it("fails input validation closed", async () => {
    const service = new LeaveService(
      new FakeLeaveRepository(),
    );

    await expect(
      service.createSelfLeave({
        employeeId: actor.employeeId,
        correlationId: actor.correlationId,
        body: {
          ...validBody(),
          durationCode: "MAGIC",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects signed-out controller calls", async () => {
    const controller = new LeaveController(
      new LeaveService(new FakeLeaveRepository()),
    );

    await expect(
      controller.getSelf({}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("keeps approval authority server-derived and validates rejection comment", async () => {
    const repository = new FakeLeaveRepository();
    const controller = new LeaveController(
      new LeaveService(repository),
    );

    await expect(
      controller.decide(
        { actor },
        "00000000-0000-4000-8000-000000000010",
        {
          approvalStepId:
            "00000000-0000-4000-8000-000000000011",
          decision: "APPROVED",
          approverEmployeeId:
            "00000000-0000-4000-8000-000000000999",
        },
      ),
    ).resolves.toEqual({
      requestId:
        "00000000-0000-4000-8000-000000000010",
      status: "APPROVED",
    });

    expect(
      repository.lastDecision?.approverEmployeeId,
    ).toBe(actor.employeeId);

    await expect(
      controller.decide(
        { actor },
        "00000000-0000-4000-8000-000000000010",
        {
          approvalStepId:
            "00000000-0000-4000-8000-000000000011",
          decision: "REJECTED",
          comment: "",
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires explicit GLOBAL leave.approve permission for decisions", () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        LeaveController.prototype.decide,
      ),
    ).toEqual({
      permission: "leave.approve",
      scope: "GLOBAL",
    });
  });

  it("keeps cancellation scoped to actor identity and request ID", async () => {
    const controller = new LeaveController(
      new LeaveService(new FakeLeaveRepository()),
    );

    await expect(
      controller.cancel(
        { actor },
        "00000000-0000-4000-8000-000000000010",
      ),
    ).resolves.toEqual({
      requestId:
        "00000000-0000-4000-8000-000000000010",
      status: "CANCELLED",
    });
  });
  it("lets an approver send a leave request back only with a comment", async () => {
    const repository = new FakeLeaveRepository();
    const controller = new LeaveController(new LeaveService(repository));
    const approver = { ...actor, permissions: ["leave.approve"] };

    await expect(
      controller.decide({ actor: approver }, "00000000-0000-4000-8000-0000000000a1", {
        approvalStepId: "00000000-0000-4000-8000-0000000000b1",
        decision: "REVISION_REQUESTED",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const result = await controller.decide({ actor: approver }, "00000000-0000-4000-8000-0000000000a1", {
      approvalStepId: "00000000-0000-4000-8000-0000000000b1",
      decision: "REVISION_REQUESTED",
      comment: "แนบใบรับรองแพทย์เพิ่ม",
    });

    expect(result.status).toBe("REVISION_REQUESTED");
    expect(repository.lastDecision?.decision.comment).toBe("แนบใบรับรองแพทย์เพิ่ม");
  });

  it("resubmits for the server actor and validates the body", async () => {
    const repository = new FakeLeaveRepository();
    const controller = new LeaveController(new LeaveService(repository));

    await expect(
      controller.resubmit({ actor }, "00000000-0000-4000-8000-0000000000a1", { description: "x" }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const result = await controller.resubmit({ actor }, "00000000-0000-4000-8000-0000000000a1", {
      clientKey: "resubmit-key-0001",
      description: "แก้ไขแล้ว",
      startDate: "2026-10-20",
      endDate: "2026-10-20",
      durationCode: "FULL_DAY",
      employeeId: "someone-else",
    });

    expect(result.returnedToStep).toBe(1);
    expect(repository.lastResubmit?.employeeId).toBe(actor.employeeId);
    expect(repository.lastResubmit?.requestId).toBe("00000000-0000-4000-8000-0000000000a1");
  });

  it("withdraws approved leave only through the dedicated permission with a reason", async () => {
    const repository = new FakeLeaveRepository();
    const controller = new LeaveController(new LeaveService(repository));
    const top = { ...actor, permissions: ["leave.approved.withdraw"] };

    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        LeaveController.prototype.withdraw,
      ),
    ).toEqual({ permission: "leave.approved.withdraw", scope: "GLOBAL" });

    await expect(
      controller.withdraw({ actor: top }, "00000000-0000-4000-8000-0000000000a1", {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    await controller.withdraw({ actor: top }, "00000000-0000-4000-8000-0000000000a1", {
      reason: "ผู้ขอแจ้งยกเลิกการลา",
    });

    expect(repository.lastWithdraw).toEqual({
      actorEmployeeId: actor.employeeId,
      correlationId: "corr-leave",
      requestId: "00000000-0000-4000-8000-0000000000a1",
      reason: "ผู้ขอแจ้งยกเลิกการลา",
    });
  });

});
