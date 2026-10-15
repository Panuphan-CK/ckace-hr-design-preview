import type {
  InternalActorContext,
} from "@ckace/auth";
import {
  IdempotencyConflictError,
} from "@ckace/auth";
import type {
  MedicalApprovalQueueItem,
  MedicalCreateInput,
  MedicalDecisionInput,
  MedicalClaimView,
  MedicalSelfOverview,
} from "@ckace/contracts";
import type {
  MedicalRepository,
} from "@ckace/database";
import {
  BadRequestException,
  ConflictException,
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
import { MedicalController } from "./medical.controller";
import { MedicalService } from "./medical.service";

const employeeId =
  "00000000-0000-4000-8000-000000000001";
const approverEmployeeId =
  "00000000-0000-4000-8000-000000000099";
const claimId =
  "00000000-0000-5000-8000-000000000010";
const attachmentA =
  "00000000-0000-4000-8000-000000000101";
const attachmentB =
  "00000000-0000-4000-8000-000000000102";

function claimView(
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED" = "PENDING",
): MedicalClaimView {
  return {
    id: claimId,
    employeeId,
    leaveRequestId: null,
    benefitPolicyId:
      "00000000-0000-4000-8000-000000000020",
    sicknessDate: "2026-10-05",
    amount: 1000,
    description: "Receipt",
    status,
    decisionReason: null,
    submittedAt:
      "2026-10-05T10:00:00.000Z",
    attachments: [
      {
        attachmentId: attachmentA,
        fileName: "receipt.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      },
    ],
  };
}

class FakeMedicalRepository
  implements MedicalRepository
{
  lastCreate:
    | {
        employeeId: string;
        correlationId: string;
        request: MedicalCreateInput;
        canonicalPayload: string;
      }
    | undefined;

  lastDecision:
    | {
        approverEmployeeId: string;
        correlationId: string;
        claimId: string;
        decision: MedicalDecisionInput;
      }
    | undefined;

  createError: unknown;

  async getSelfOverview(): Promise<MedicalSelfOverview> {
    return {
      entitlement: {
        annualLimit: 10000,
        approved: 1000,
        committed: 1500,
        remaining: 8500,
      },
      claims: [],
    };
  }

  async getAssignedApprovals(): Promise<
    readonly MedicalApprovalQueueItem[]
  > {
    return [];
  }

  async createSelfMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: MedicalCreateInput;
    readonly canonicalPayload: string;
  }) {
    if (this.createError) {
      throw this.createError;
    }

    this.lastCreate = input;

    return {
      claim: claimView(),
      replayed: false,
      warnings: [],
    };
  }

  async cancelSelfMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
  }) {
    return {
      claimId: input.claimId,
      status: "CANCELLED" as const,
    };
  }

  async decideAssignedMedical(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly decision: MedicalDecisionInput;
  }) {
    this.lastDecision = input;

    return {
      claim: claimView(
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
    "medical.self.read",
    "medical.self.write",
  ],
  agencyId:
    "00000000-0000-4000-8000-000000000002",
  departmentId:
    "00000000-0000-4000-8000-000000000003",
  authenticatedBy:
    "PROJECT_B_WEB",
  correlationId: "corr-medical",
};

const approver: InternalActorContext = {
  ...actor,
  employeeId:
    approverEmployeeId,
  roles: ["SUPERUSER"],
  permissions: ["medical.approve"],
  correlationId:
    "corr-medical-approver",
};

describe("MedicalController / MedicalService", () => {
  it("derives requester from server actor and excludes clientKey/forged authority from canonical payload", async () => {
    const repository =
      new FakeMedicalRepository();
    const controller =
      new MedicalController(
        new MedicalService(repository),
      );

    await controller.create(
      { actor },
      {
        sicknessDate: "2026-10-05",
        amount: 1500,
        description: " receipt ",
        attachmentIds: [
          attachmentB,
          attachmentA,
        ],
        leaveRequestId: null,
        clientKey:
          "medical-client-0001",
        employeeId:
          approverEmployeeId,
        approverId:
          approverEmployeeId,
        role: "SUPERADMIN",
      },
    );

    expect(
      repository.lastCreate?.employeeId,
    ).toBe(employeeId);
    expect(
      repository.lastCreate?.request,
    ).toMatchObject({
      amount: 1500,
      description: "receipt",
      attachmentIds: [
        attachmentB,
        attachmentA,
      ],
    });

    const canonical =
      repository.lastCreate
        ?.canonicalPayload ?? "";

    expect(canonical).toContain(
      '"requestedAmount":1500',
    );
    expect(canonical.indexOf(attachmentA))
      .toBeLessThan(
        canonical.indexOf(attachmentB),
      );
    expect(canonical).not.toContain(
      "medical-client-0001",
    );
    expect(canonical).not.toContain(
      approverEmployeeId,
    );
    expect(canonical).not.toContain(
      "SUPERADMIN",
    );
  });

  it("normalizes optional leave UUID and rejects invalid attachment bodies", async () => {
    const repository =
      new FakeMedicalRepository();
    const service =
      new MedicalService(repository);

    await service.createSelfMedical({
      employeeId,
      correlationId:
        actor.correlationId,
      body: {
        sicknessDate:
          "2026-10-05",
        amount: 800,
        description: " receipt ",
        attachmentIds: [
          attachmentA,
        ],
        leaveRequestId: "",
        clientKey:
          "medical-client-0002",
      },
    });

    expect(
      repository.lastCreate?.request
        .leaveRequestId,
    ).toBeNull();

    await expect(
      service.createSelfMedical({
        employeeId,
        correlationId:
          actor.correlationId,
        body: {
          sicknessDate:
            "2026-10-05",
          amount: 800,
          description: "receipt",
          attachmentIds: [
            "not-a-uuid",
          ],
          clientKey:
            "medical-client-0003",
        },
      }),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("keeps approver identity server-derived", async () => {
    const repository =
      new FakeMedicalRepository();
    const controller =
      new MedicalController(
        new MedicalService(repository),
      );

    await controller.decide(
      { actor: approver },
      claimId,
      {
        decision: "APPROVED",
        comment: "verified",
        approverEmployeeId:
          employeeId,
        role: "SUPERADMIN",
      },
    );

    expect(
      repository.lastDecision
        ?.approverEmployeeId,
    ).toBe(
      approverEmployeeId,
    );
    expect(
      repository.lastDecision
        ?.claimId,
    ).toBe(claimId);
  });

  it("requires rejection comments and valid claim UUIDs", async () => {
    const service =
      new MedicalService(
        new FakeMedicalRepository(),
      );

    await expect(
      service.decideAssignedMedical({
        approverEmployeeId,
        correlationId:
          approver.correlationId,
        claimId,
        body: {
          decision: "REJECTED",
          comment: "",
        },
      }),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await expect(
      service.cancelSelfMedical({
        employeeId,
        correlationId:
          actor.correlationId,
        claimId: "not-a-uuid",
      }),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("maps idempotency conflicts to HTTP conflict", async () => {
    const repository =
      new FakeMedicalRepository();
    repository.createError =
      new IdempotencyConflictError();

    const service =
      new MedicalService(repository);

    await expect(
      service.createSelfMedical({
        employeeId,
        correlationId:
          actor.correlationId,
        body: {
          sicknessDate:
            "2026-10-05",
          amount: 800,
          description: "receipt",
          attachmentIds: [
            attachmentA,
          ],
          clientKey:
            "medical-client-0004",
        },
      }),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("rejects signed-out controller calls", async () => {
    const controller =
      new MedicalController(
        new MedicalService(
          new FakeMedicalRepository(),
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
        MedicalController.prototype
          .getSelf,
      ),
    ).toEqual({
      permission:
        "medical.self.read",
      scope: "SELF",
    });
    expect(
      Reflect.getMetadata(
        SELF_AUTHORIZATION_TARGET_KEY,
        MedicalController.prototype
          .getSelf,
      ),
    ).toBe(true);

    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        MedicalController.prototype
          .create,
      ),
    ).toEqual({
      permission:
        "medical.self.write",
      scope: "SELF",
    });
    expect(
      Reflect.getMetadata(
        SELF_AUTHORIZATION_TARGET_KEY,
        MedicalController.prototype
          .create,
      ),
    ).toBe(true);

    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        MedicalController.prototype
          .cancel,
      ),
    ).toEqual({
      permission:
        "medical.self.write",
      scope: "SELF",
    });
    expect(
      Reflect.getMetadata(
        SELF_AUTHORIZATION_TARGET_KEY,
        MedicalController.prototype
          .cancel,
      ),
    ).toBe(true);

    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        MedicalController.prototype
          .getAssigned,
      ),
    ).toEqual({
      permission:
        "medical.approve",
      scope: "GLOBAL",
    });

    expect(
      Reflect.getMetadata(
        REQUIRE_PERMISSION_KEY,
        MedicalController.prototype
          .decide,
      ),
    ).toEqual({
      permission:
        "medical.approve",
      scope: "GLOBAL",
    });
  });
});
