import type {
  InternalActorContext,
} from "@ckace/auth";
import type {
  OvertimeCreateInput,
  OvertimeDecisionInput,
  OvertimeApprovalQueueItem,
  OvertimeRequestView,
  OvertimeSelfOverview,
} from "@ckace/contracts";
import type {
  OvertimeRepository,
} from "@ckace/database";
import {
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  REQUIRE_PERMISSION_KEY,
  SELF_AUTHORIZATION_TARGET_KEY,
} from "../security/require-permission.decorator";
import { OvertimeController } from "./overtime.controller";
import { OvertimeService } from "./overtime.service";

const employeeId =
  "00000000-0000-4000-8000-000000000001";
const approverEmployeeId =
  "00000000-0000-4000-8000-000000000099";
const requestId =
  "00000000-0000-5000-8000-000000000010";

function requestView(
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED" = "PENDING",
): OvertimeRequestView {
  return {
    id: requestId,
    employeeId,
    reason: "Close month",
    status,
    decisionReason: null,
    submittedAt:
      "2026-10-05T10:00:00.000Z",
    segments: [],
  };
}

class FakeOvertimeRepository
  implements OvertimeRepository
{
  lastCreate:
    | {
        employeeId: string;
        correlationId: string;
        request: OvertimeCreateInput;
        canonicalPayload: string;
      }
    | undefined;

  lastDecision:
    | {
        approverEmployeeId: string;
        correlationId: string;
        requestId: string;
        decision: OvertimeDecisionInput;
      }
    | undefined;

  async getSelfOverview(): Promise<OvertimeSelfOverview> {
    return { requests: [] };
  }

  async getAssignedApprovals(): Promise<
    readonly OvertimeApprovalQueueItem[]
  > {
    return [];
  }

  async createSelfOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: OvertimeCreateInput;
    readonly canonicalPayload: string;
  }) {
    this.lastCreate = input;

    return {
      requests: [requestView()],
      replayed: false,
      warnings: [],
    };
  }

  async cancelSelfOvertime(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }) {
    return {
      requestId: input.requestId,
      status: "CANCELLED" as const,
    };
  }

  async decideAssignedOvertime(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly decision: OvertimeDecisionInput;
  }) {
    this.lastDecision = input;

    return {
      request: requestView(
        input.decision.decision,
      ),
      completed: true,
      warnings: [],
    };
  }
}

const actor: InternalActorContext = {
  employeeId,
  legacyUid: "USER-001",
  roles: ["EMPLOYEE"],
  permissions: [
    "overtime.self.read",
    "overtime.self.write",
  ],
  agencyId:
    "00000000-0000-4000-8000-000000000002",
  departmentId:
    "00000000-0000-4000-8000-000000000003",
  authenticatedBy: "PROJECT_B_WEB",
  correlationId: "corr-overtime",
};

const approver: InternalActorContext = {
  ...actor,
  employeeId: approverEmployeeId,
  roles: ["SUPERUSER"],
  permissions: ["overtime.approve"],
  correlationId: "corr-overtime-approver",
};

describe("OvertimeController / OvertimeService", () => {
  it("derives requester from server actor and excludes clientKey/forged authority from canonical payload", async () => {
    const repository =
      new FakeOvertimeRepository();
    const controller =
      new OvertimeController(
        new OvertimeService(repository),
      );

    await controller.create(
      { actor },
      {
        startDate: "2026-10-05",
        endDate: "2026-10-05",
        startTime: "13:00",
        endTime: "14:00",
        reason: "Close month",
        clientKey: "ot-client-0001",
        employeeId: approverEmployeeId,
        approverId: approverEmployeeId,
        role: "SUPERADMIN",
      },
    );

    expect(
      repository.lastCreate?.employeeId,
    ).toBe(employeeId);
    expect(
      repository.lastCreate?.canonicalPayload,
    ).not.toContain("ot-client-0001");
    expect(
      repository.lastCreate?.canonicalPayload,
    ).not.toContain(approverEmployeeId);
    expect(
      repository.lastCreate?.canonicalPayload,
    ).not.toContain("SUPERADMIN");
  });

  it("normalizes clocks before persistence", async () => {
    const repository =
      new FakeOvertimeRepository();
    const service =
      new OvertimeService(repository);

    await service.createSelfOvertime({
      employeeId,
      correlationId: actor.correlationId,
      body: {
        startDate: "2026-10-05",
        endDate: "2026-10-05",
        startTime: "17.30",
        endTime: "20:00",
        reason: " close month ",
        clientKey: "ot-client-0002",
      },
    });

    expect(
      repository.lastCreate?.request,
    ).toMatchObject({
      startTime: "17:30",
      endTime: "20:00",
      reason: "close month",
    });
  });

  it("fails invalid intervals closed", async () => {
    const service =
      new OvertimeService(
        new FakeOvertimeRepository(),
      );

    await expect(
      service.createSelfOvertime({
        employeeId,
        correlationId:
          actor.correlationId,
        body: {
          startDate: "2026-10-05",
          endDate: "2026-10-05",
          startTime: "20:00",
          endTime: "08:00",
          reason: "Close month",
          clientKey: "ot-client-0003",
        },
      }),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("keeps approver identity server-derived", async () => {
    const repository =
      new FakeOvertimeRepository();
    const controller =
      new OvertimeController(
        new OvertimeService(repository),
      );

    await controller.decide(
      { actor: approver },
      requestId,
      {
        decision: "APPROVED",
        comment: "verified",
        approverEmployeeId: employeeId,
      },
    );

    expect(
      repository.lastDecision
        ?.approverEmployeeId,
    ).toBe(approverEmployeeId);
    expect(
      repository.lastDecision?.requestId,
    ).toBe(requestId);
  });

  it("requires rejection comments and valid request UUIDs", async () => {
    const service =
      new OvertimeService(
        new FakeOvertimeRepository(),
      );

    await expect(
      service.decideAssignedOvertime({
        approverEmployeeId,
        correlationId:
          approver.correlationId,
        requestId,
        body: {
          decision: "REJECTED",
          comment: "",
        },
      }),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await expect(
      service.cancelSelfOvertime({
        employeeId,
        correlationId:
          actor.correlationId,
        requestId: "not-a-uuid",
      }),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects signed-out controller calls", async () => {
    const controller =
      new OvertimeController(
        new OvertimeService(
          new FakeOvertimeRepository(),
        ),
      );

    await expect(
      controller.getSelf({}),
    ).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("declares explicit SELF and approval permissions", () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        OvertimeController.prototype.getSelf,
      ),
    ).toEqual({
      permission: "overtime.self.read",
      scope: "SELF",
    });
    expect(
      Reflect.getMetadata(
        SELF_AUTHORIZATION_TARGET_KEY,
        OvertimeController.prototype.getSelf,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        OvertimeController.prototype.create,
      ),
    ).toEqual({
      permission: "overtime.self.write",
      scope: "SELF",
    });
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        OvertimeController.prototype.getAssigned,
      ),
    ).toEqual({
      permission: "overtime.approve",
      scope: "GLOBAL",
    });
    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        OvertimeController.prototype.decide,
      ),
    ).toEqual({
      permission: "overtime.approve",
      scope: "GLOBAL",
    });
  });
});
