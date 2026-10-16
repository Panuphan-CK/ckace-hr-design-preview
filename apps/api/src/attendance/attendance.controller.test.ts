import type { InternalActorContext } from "@ckace/auth";
import type {
  AttendanceCheckInInput,
  AttendanceCheckOutInput,
  AttendanceSelfOverview,
  TimeCorrectionCreateInput,
  TimeCorrectionDecisionInput,
  TimeCorrectionRequestView,
} from "@ckace/contracts";
import type { AttendanceRepository } from "@ckace/database";
import {
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { describe, expect, it } from "vitest";

import {
  REQUIRE_PERMISSION_KEY,
  SELF_AUTHORIZATION_TARGET_KEY,
} from "../security/require-permission.decorator";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";

class FakeAttendanceRepository
  implements AttendanceRepository
{
  lastCheckIn:
    | {
        employeeId: string;
        correlationId: string;
        request: AttendanceCheckInInput;
        canonicalPayload: string;
      }
    | undefined;

  lastCheckOut:
    | {
        employeeId: string;
        correlationId: string;
        request: AttendanceCheckOutInput;
        canonicalPayload: string;
      }
    | undefined;

  lastCorrection:
    | {
        employeeId: string;
        correlationId: string;
        request: TimeCorrectionCreateInput;
        canonicalPayload: string;
      }
    | undefined;

  lastDecision:
    | {
        approverEmployeeId: string;
        correlationId: string;
        requestId: string;
        decision: TimeCorrectionDecisionInput;
      }
    | undefined;

  async getSelfOverview(): Promise<AttendanceSelfOverview> {
    return {
      dayKind: "WORKDAY",
      canCheckIn: true,
      canCheckOut: false,
      currentAttendanceRecordId: null,
      records: [],
    };
  }

  async checkIn(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: AttendanceCheckInInput;
    readonly canonicalPayload: string;
  }) {
    this.lastCheckIn = input;
    return {
      attendanceRecordId:
        "00000000-0000-4000-8000-000000000010",
      replayed: false,
    };
  }

  async checkOut(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: AttendanceCheckOutInput;
    readonly canonicalPayload: string;
  }) {
    this.lastCheckOut = input;
    return {
      attendanceRecordId:
        input.request.attendanceRecordId,
      replayed: false,
    };
  }

  async getSelfTimeCorrections(): Promise<
    readonly TimeCorrectionRequestView[]
  > {
    return [];
  }

  async getAssignedTimeCorrections(): Promise<
    readonly TimeCorrectionRequestView[]
  > {
    return [];
  }

  async createSelfTimeCorrection(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: TimeCorrectionCreateInput;
    readonly canonicalPayload: string;
  }) {
    this.lastCorrection = input;
    return {
      requestId:
        "00000000-0000-4000-8000-000000000020",
      replayed: false,
    };
  }

  async cancelSelfTimeCorrection(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
  }) {
    return {
      requestId: input.requestId,
      status: "CANCELLED" as const,
    };
  }

  async previewTimeCorrectionApprover() {
    return { autoApproved: false, steps: [] };
  }

  async resubmitTimeCorrection(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly request: { readonly clientKey: string; readonly correctedTime: string; readonly reason: string };
    readonly canonicalPayload: string;
  }) {
    return { requestId: input.requestId, returnedToStep: 1, replayed: false };
  }

  async withdrawApprovedTimeCorrection(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly reason: string;
  }) {
    return { requestId: input.requestId, status: "CANCELLED" as const };
  }

  async decideAssignedTimeCorrection(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly requestId: string;
    readonly decision: TimeCorrectionDecisionInput;
  }) {
    this.lastDecision = input;
    return {
      requestId: input.requestId,
      status: input.decision.decision,
    };
  }
}

const employeeId =
  "00000000-0000-4000-8000-000000000001";
const attendanceRecordId =
  "00000000-0000-4000-8000-000000000010";
const correctionRequestId =
  "00000000-0000-4000-8000-000000000020";

const actor: InternalActorContext = {
  employeeId,
  legacyUid: "USER-001",
  roles: ["EMPLOYEE"],
  permissions: [
    "attendance.self.read",
    "attendance.self.write",
    "time_correction.self.read",
    "time_correction.self.write",
  ],
  agencyId: "00000000-0000-4000-8000-000000000002",
  departmentId:
    "00000000-0000-4000-8000-000000000003",
  authenticatedBy: "PROJECT_B_WEB",
  correlationId: "corr-attendance",
};

const approver: InternalActorContext = {
  ...actor,
  employeeId:
    "00000000-0000-4000-8000-000000000099",
  roles: ["SUPERUSER"],
  permissions: ["time_correction.approve"],
  correlationId: "corr-approver",
};

function validLocationBody() {
  return {
    clientKey: "attendance-client-001",
    latitude: 13.7563,
    longitude: 100.5018,
    accuracyMeters: 12,
  };
}

describe("AttendanceController / AttendanceService", () => {
  it("derives check-in actor only from server context and excludes client key/forged identity from payload hash", async () => {
    const repository = new FakeAttendanceRepository();
    const controller = new AttendanceController(
      new AttendanceService(repository),
    );

    await controller.checkIn(
      { actor },
      {
        ...validLocationBody(),
        employeeId:
          "00000000-0000-4000-8000-000000000999",
        role: "SUPERADMIN",
      },
    );

    expect(repository.lastCheckIn?.employeeId).toBe(
      actor.employeeId,
    );
    expect(repository.lastCheckIn?.canonicalPayload).not.toContain(
      "attendance-client-001",
    );
    expect(repository.lastCheckIn?.canonicalPayload).not.toContain(
      "00000000-0000-4000-8000-000000000999",
    );
    expect(repository.lastCheckIn?.canonicalPayload).not.toContain(
      "SUPERADMIN",
    );
  });

  it("normalizes checkout and binds the explicit attendance record ID", async () => {
    const repository = new FakeAttendanceRepository();
    const service = new AttendanceService(repository);

    await service.checkOut({
      employeeId: actor.employeeId,
      correlationId: actor.correlationId,
      body: {
        ...validLocationBody(),
        attendanceRecordId,
      },
    });

    expect(
      repository.lastCheckOut?.request.attendanceRecordId,
    ).toBe(attendanceRecordId);
    expect(repository.lastCheckOut?.canonicalPayload).toContain(
      attendanceRecordId,
    );
    expect(repository.lastCheckOut?.canonicalPayload).not.toContain(
      "attendance-client-001",
    );
  });

  it("fails invalid GPS input closed", async () => {
    const service = new AttendanceService(
      new FakeAttendanceRepository(),
    );

    await expect(
      service.checkIn({
        employeeId: actor.employeeId,
        correlationId: actor.correlationId,
        body: {
          ...validLocationBody(),
          latitude: "13.7563",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("keeps Time Correction actor/approver server-derived and hashes only business payload", async () => {
    const repository = new FakeAttendanceRepository();
    const controller = new AttendanceController(
      new AttendanceService(repository),
    );

    await controller.createTimeCorrection(
      { actor },
      {
        clientKey: "correction-client-001",
        attendanceRecordId,
        correctionType: "CHECK_IN",
        correctedTime: "09:00",
        reason: "เครื่องสแกนมีปัญหา",
        employeeId: approver.employeeId,
        approverId: approver.employeeId,
      },
    );

    expect(repository.lastCorrection?.employeeId).toBe(
      actor.employeeId,
    );
    expect(repository.lastCorrection?.canonicalPayload).not.toContain(
      "correction-client-001",
    );
    expect(repository.lastCorrection?.canonicalPayload).not.toContain(
      approver.employeeId,
    );

    await controller.decideTimeCorrection(
      { actor: approver },
      correctionRequestId,
      {
        decision: "APPROVED",
        comment: "verified",
        employeeId: actor.employeeId,
      },
    );

    expect(repository.lastDecision?.approverEmployeeId).toBe(
      approver.employeeId,
    );
    expect(repository.lastDecision?.requestId).toBe(
      correctionRequestId,
    );
  });

  it("requires a rejection comment and validates request IDs", async () => {
    const service = new AttendanceService(
      new FakeAttendanceRepository(),
    );

    await expect(
      service.decideAssignedTimeCorrection({
        approverEmployeeId: approver.employeeId,
        correlationId: approver.correlationId,
        requestId: correctionRequestId,
        body: {
          decision: "REJECTED",
          comment: "",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.cancelSelfTimeCorrection({
        employeeId: actor.employeeId,
        correlationId: actor.correlationId,
        requestId: "not-a-uuid",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects signed-out controller calls", async () => {
    const controller = new AttendanceController(
      new AttendanceService(
        new FakeAttendanceRepository(),
      ),
    );

    await expect(
      controller.getSelf({}),
    ).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("declares explicit SELF and approver permissions on routes", () => {
    const selfRequirement = Reflect.getMetadata(
      REQUIRE_PERMISSION_KEY,
      AttendanceController.prototype.getSelf,
    );
    const selfTarget = Reflect.getMetadata(
      SELF_AUTHORIZATION_TARGET_KEY,
      AttendanceController.prototype.getSelf,
    );
    const checkInRequirement = Reflect.getMetadata(
      REQUIRE_PERMISSION_KEY,
      AttendanceController.prototype.checkIn,
    );
    const correctionCreateRequirement = Reflect.getMetadata(
      REQUIRE_PERMISSION_KEY,
      AttendanceController.prototype.createTimeCorrection,
    );
    const correctionCancelRequirement = Reflect.getMetadata(
      REQUIRE_PERMISSION_KEY,
      AttendanceController.prototype.cancelTimeCorrection,
    );
    const assignedRequirement = Reflect.getMetadata(
      REQUIRE_PERMISSION_KEY,
      AttendanceController.prototype
        .getAssignedTimeCorrections,
    );
    const decisionRequirement = Reflect.getMetadata(
      REQUIRE_PERMISSION_KEY,
      AttendanceController.prototype
        .decideTimeCorrection,
    );

    expect(selfRequirement).toEqual({
      permission: "attendance.self.read",
      scope: "SELF",
    });
    expect(selfTarget).toBe(true);
    expect(checkInRequirement).toEqual({
      permission: "attendance.self.write",
      scope: "SELF",
    });
    expect(correctionCreateRequirement).toEqual({
      permission: "time_correction.self.write",
      scope: "SELF",
    });
    expect(correctionCancelRequirement).toEqual({
      permission: "time_correction.self.write",
      scope: "SELF",
    });
    expect(assignedRequirement).toEqual({
      permission: "time_correction.approve",
      scope: "GLOBAL",
    });
    expect(decisionRequirement).toEqual({
      permission: "time_correction.approve",
      scope: "GLOBAL",
    });
  });
});
