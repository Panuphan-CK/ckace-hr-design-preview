import type { InternalActorContext } from "@ckace/auth";
import type {
  LeaveApprovalDecisionInput,
  LeaveApprovalStepOptions,
  LeaveCreateInput,
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

  async getSelfOverview(): Promise<LeaveSelfOverview> {
    return {
      entitlements: [],
      requests: [],
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
});
