/* eslint-disable @typescript-eslint/no-explicit-any -- loose Prisma transaction mocks */
import { describe, expect, it, vi } from "vitest";

import {
  resubmitSentBackLeave,
  withdrawApprovedLeave,
} from "./leave-revision-repository";

const EMPLOYEE = "11111111-1111-4111-8111-111111111111";
const ADMIN = "22222222-2222-4222-8222-222222222222";
const REQUEST = "33333333-3333-4333-8333-333333333333";
const INSTANCE = "44444444-4444-4444-8444-444444444444";
const ENTITLEMENT = "55555555-5555-4555-8555-555555555555";
const TEAM = "66666666-6666-4666-8666-666666666666";
const COMPANY = "77777777-7777-4777-8777-777777777777";

const revisionInput = {
  clientKey: "resubmit-key-0001",
  description: "แก้ไขรายละเอียด",
  startDate: "2026-10-20",
  endDate: "2026-10-20",
  durationCode: "FULL_DAY" as const,
};

function baseTx(overrides: Record<string, unknown> = {}) {
  const tx: Record<string, any> = {
    idempotencyKey: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    leaveRequest: {
      findUnique: vi.fn().mockResolvedValue({
        id: REQUEST,
        requesterEmployeeId: EMPLOYEE,
        status: "REVISION_REQUESTED",
        entitlementId: ENTITLEMENT,
        approvalInstanceId: INSTANCE,
        leaveType: { key: "SICK" },
        _count: { attachments: 0 },
      }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    approvalStep: {
      findMany: vi.fn().mockResolvedValue([
        { id: "s1", stepOrder: 1, status: "APPROVED" },
        { id: "s2", stepOrder: 2, status: "REVISION_REQUESTED" },
        { id: "s3", stepOrder: 3, status: "PENDING" },
      ]),
      update: vi.fn(),
    },
    approvalInstance: { update: vi.fn() },
    leaveEntitlement: {
      findUnique: vi.fn().mockResolvedValue({
        id: ENTITLEMENT,
        quota: "6",
        validFrom: null,
        validTo: null,
        leaveType: { active: true },
      }),
    },
    weeklyWorkRule: {
      findMany: vi.fn().mockResolvedValue(
        [1, 2, 3, 4, 5].map((day) => ({ isoWeekday: day, isWorking: true })),
      ),
    },
    holiday: { findMany: vi.fn().mockResolvedValue([]) },
    notificationOutbox: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    employee: { findUnique: vi.fn() },
    agency: { findMany: vi.fn().mockResolvedValue([]) },
    ...overrides,
  };

  return tx;
}

function prismaFor(tx: Record<string, any>) {
  return {
    idempotencyKey: tx.idempotencyKey,
    leaveRequest: tx.leaveRequest,
    $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
  } as never;
}

describe("leave resubmission after send-back", () => {
  it("re-enters the step that sent the request back and keeps earlier approvals", async () => {
    const tx = baseTx();
    const result = await resubmitSentBackLeave(prismaFor(tx), {
      employeeId: EMPLOYEE,
      correlationId: "c1",
      requestId: REQUEST,
      request: revisionInput,
      canonicalPayload: "payload",
    });

    expect(result).toEqual({ requestId: REQUEST, returnedToStep: 2, replayed: false });
    expect(tx.leaveRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING", decisionReason: null }),
      }),
    );
    expect(tx.approvalStep.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s2" },
        data: expect.objectContaining({ status: "PENDING", decidedAt: null }),
      }),
    );
    expect(tx.approvalInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING", currentStepOrder: 2 }),
      }),
    );
    expect(tx.notificationOutbox.create).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalled();
  });

  it("links a validated certificate on resubmission and rejects an unowned one", async () => {
    const ATT = "88888888-8888-4888-8888-888888888888";
    const attRow = (owner: string) => ({
      id: ATT,
      ownerEmployeeId: owner,
      privacyClass: "MEDICAL_PRIVATE",
      storageProvider: "R2",
      storageKey: "k",
      mimeType: "application/pdf",
      sizeBytes: 100n,
      checksumSha256: "b".repeat(64),
      finalizedAt: new Date(),
      leaveLink: null,
      overtimeLink: null,
      medicalLink: null,
      announcementLink: null,
      employeeMedia: null,
    });
    const input = { ...revisionInput, clientKey: "resubmit-key-0002", attachmentIds: [ATT] };

    const ok = baseTx({ attachment: { findMany: vi.fn().mockResolvedValue([attRow(EMPLOYEE)]) } });
    await resubmitSentBackLeave(prismaFor(ok), {
      employeeId: EMPLOYEE, correlationId: "c1", requestId: REQUEST, request: input, canonicalPayload: "p",
    });
    expect(ok.leaveRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attachments: { create: [{ attachmentId: ATT }] } }),
      }),
    );

    const bad = baseTx({ attachment: { findMany: vi.fn().mockResolvedValue([attRow(ADMIN)]) } });
    await expect(
      resubmitSentBackLeave(prismaFor(bad), {
        employeeId: EMPLOYEE, correlationId: "c1", requestId: REQUEST, request: input, canonicalPayload: "p",
      }),
    ).rejects.toThrow(/owner mismatch/);
    expect(bad.leaveRequest.update).not.toHaveBeenCalled();
  });

  it("refuses a request that was not sent back or belongs to someone else", async () => {
    const wrongStatus = baseTx();
    wrongStatus.leaveRequest.findUnique.mockResolvedValue({
      id: REQUEST,
      requesterEmployeeId: EMPLOYEE,
      status: "PENDING",
      entitlementId: ENTITLEMENT,
      approvalInstanceId: INSTANCE,
    });
    await expect(
      resubmitSentBackLeave(prismaFor(wrongStatus), {
        employeeId: EMPLOYEE,
        correlationId: "c",
        requestId: REQUEST,
        request: revisionInput,
        canonicalPayload: "p",
      }),
    ).rejects.toThrow("sent back");

    const foreign = baseTx();
    await expect(
      resubmitSentBackLeave(prismaFor(foreign), {
        employeeId: ADMIN,
        correlationId: "c",
        requestId: REQUEST,
        request: revisionInput,
        canonicalPayload: "p",
      }),
    ).rejects.toThrow("not found");
  });

  it("rechecks quota and overlap with the edited dates", async () => {
    const overlapping = baseTx();
    overlapping.leaveRequest.findMany.mockResolvedValue([
      {
        entitlementId: ENTITLEMENT,
        startDate: new Date("2026-10-20T00:00:00.000Z"),
        endDate: new Date("2026-10-20T00:00:00.000Z"),
        durationCode: "FULL_DAY",
        startTime: null,
        endTime: null,
      },
    ]);
    await expect(
      resubmitSentBackLeave(prismaFor(overlapping), {
        employeeId: EMPLOYEE,
        correlationId: "c",
        requestId: REQUEST,
        request: revisionInput,
        canonicalPayload: "p",
      }),
    ).rejects.toThrow("overlaps");

    const overQuota = baseTx();
    overQuota.leaveEntitlement.findUnique.mockResolvedValue({
      id: ENTITLEMENT,
      quota: "0.5",
      validFrom: null,
      validTo: null,
      leaveType: { active: true },
    });
    await expect(
      resubmitSentBackLeave(prismaFor(overQuota), {
        employeeId: EMPLOYEE,
        correlationId: "c",
        requestId: REQUEST,
        request: revisionInput,
        canonicalPayload: "p",
      }),
    ).rejects.toThrow();
  });

  it("is idempotent for the same client key", async () => {
    const tx = baseTx();
    tx.idempotencyKey.findUnique.mockResolvedValue(null);
    const first = prismaFor(tx);
    await resubmitSentBackLeave(first, {
      employeeId: EMPLOYEE,
      correlationId: "c",
      requestId: REQUEST,
      request: revisionInput,
      canonicalPayload: "same",
    });

    const claimed = tx.idempotencyKey.create.mock.calls[0]?.[0]?.data;
    const replayTx = baseTx();
    replayTx.idempotencyKey.findUnique.mockResolvedValue({
      payloadHash: claimed.payloadHash,
      resultReferenceId: REQUEST,
    });
    replayTx.leaveRequest.findUnique.mockResolvedValue({
      approvalInstance: { currentStepOrder: 2 },
    });

    await expect(
      resubmitSentBackLeave(prismaFor(replayTx), {
        employeeId: EMPLOYEE,
        correlationId: "c",
        requestId: REQUEST,
        request: revisionInput,
        canonicalPayload: "same",
      }),
    ).resolves.toEqual({ requestId: REQUEST, returnedToStep: 2, replayed: true });
  });
});

function adminTx(roles: unknown[], target = { agencyId: TEAM }) {
  const tx = baseTx();
  tx.leaveRequest.findUnique.mockResolvedValue({
    id: REQUEST,
    requesterEmployeeId: EMPLOYEE,
    status: "APPROVED",
    approvalInstanceId: INSTANCE,
  });
  tx.employee.findUnique.mockImplementation(async (args: any) =>
    args.where.id === ADMIN
      ? { userAccount: { state: "ACTIVE", roles } }
      : target,
  );
  tx.agency.findMany.mockResolvedValue([{ id: TEAM, companyId: COMPANY }]);
  return tx;
}

describe("withdrawal of approved leave by the highest-level user", () => {
  const platform = [
    {
      scopeType: "PLATFORM",
      scopeCompanyId: null,
      scopeAgencyIds: [],
      role: { key: "SUPERADMIN" },
    },
  ];

  it("cancels an approved request, audits it, and releases the quota", async () => {
    const tx = adminTx(platform);
    const result = await withdrawApprovedLeave(prismaFor(tx), {
      actorEmployeeId: ADMIN,
      correlationId: "c",
      requestId: REQUEST,
      reason: " ลาออกกะทันหัน ",
    });

    expect(result).toEqual({ requestId: REQUEST, status: "CANCELLED" });
    expect(tx.leaveRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "CANCELLED", decisionReason: "ลาออกกะทันหัน" },
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "LEAVE_WITHDRAW_APPROVED" }),
      }),
    );
  });

  it("only allows a SUPERADMIN whose scope covers the employee's team", async () => {
    const otherCompany = adminTx([
      {
        scopeType: "COMPANY",
        scopeCompanyId: "88888888-8888-4888-8888-888888888888",
        scopeAgencyIds: [],
        role: { key: "SUPERADMIN" },
      },
    ]);
    await expect(
      withdrawApprovedLeave(prismaFor(otherCompany), {
        actorEmployeeId: ADMIN,
        correlationId: "c",
        requestId: REQUEST,
        reason: "x",
      }),
    ).rejects.toThrow("Not allowed");

    const ownCompany = adminTx([
      {
        scopeType: "COMPANY",
        scopeCompanyId: COMPANY,
        scopeAgencyIds: [],
        role: { key: "SUPERADMIN" },
      },
    ]);
    await expect(
      withdrawApprovedLeave(prismaFor(ownCompany), {
        actorEmployeeId: ADMIN,
        correlationId: "c",
        requestId: REQUEST,
        reason: "x",
      }),
    ).resolves.toMatchObject({ status: "CANCELLED" });

    const justAdmin = adminTx([
      {
        scopeType: "PLATFORM",
        scopeCompanyId: null,
        scopeAgencyIds: [],
        role: { key: "ADMIN" },
      },
    ]);
    await expect(
      withdrawApprovedLeave(prismaFor(justAdmin), {
        actorEmployeeId: ADMIN,
        correlationId: "c",
        requestId: REQUEST,
        reason: "x",
      }),
    ).rejects.toThrow("Not allowed");
  });

  it("requires a reason and an approved request", async () => {
    const tx = adminTx(platform);
    await expect(
      withdrawApprovedLeave(prismaFor(tx), {
        actorEmployeeId: ADMIN,
        correlationId: "c",
        requestId: REQUEST,
        reason: "  ",
      }),
    ).rejects.toThrow("reason");

    tx.leaveRequest.findUnique.mockResolvedValue({
      id: REQUEST,
      requesterEmployeeId: EMPLOYEE,
      status: "PENDING",
      approvalInstanceId: INSTANCE,
    });
    await expect(
      withdrawApprovedLeave(prismaFor(tx), {
        actorEmployeeId: ADMIN,
        correlationId: "c",
        requestId: REQUEST,
        reason: "x",
      }),
    ).rejects.toThrow("approved");
  });
});
