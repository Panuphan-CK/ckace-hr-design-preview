import { IdempotencyConflictError, createIdempotencyClaim } from "@ckace/auth";
import {
  assertMedicalAnnualLimit,
  assertMedicalDateNotFuture,
  normalizeMedicalAmount,
  normalizeMedicalDescription,
  normalizeMedicalIsoDate,
} from "@ckace/business-rules";
import type { MedicalResubmitInput, MedicalResubmitResult, MedicalWithdrawResult } from "@ckace/contracts";
import { Prisma, type PrismaClient } from "@prisma/client";

import { actorHasRoleOverEmployee } from "./approval-route-loader";
import { LEAVE_WITHDRAW_ROLE_KEY } from "./leave-revision-repository";

const MEDICAL_BENEFIT_POLICY_KEY = "MEDICAL";

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function bangkokDateKey(value: Date): string {
  return new Date(value.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function resubmitSentBackMedical(
  prisma: PrismaClient,
  input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly request: MedicalResubmitInput;
    readonly canonicalPayload: string;
    readonly now: Date;
  },
): Promise<MedicalResubmitResult> {
  const claim = createIdempotencyClaim({
    actorEmployeeId: input.employeeId,
    operationKind: "MEDICAL_RESUBMIT",
    clientKey: input.request.clientKey,
    canonicalPayload: input.canonicalPayload,
  });

  const existing = await prisma.idempotencyKey.findUnique({
    where: {
      actorEmployeeId_operationKind_clientKey: {
        actorEmployeeId: claim.actorEmployeeId,
        operationKind: claim.operationKind,
        clientKey: claim.clientKey,
      },
    },
    select: { payloadHash: true, resultReferenceId: true },
  });

  if (existing) {
    if (existing.payloadHash !== claim.payloadHash) {
      throw new IdempotencyConflictError();
    }

    if (!existing.resultReferenceId) {
      throw new Error("Medical idempotency record is incomplete and requires review");
    }

    const row = await prisma.medicalClaim.findUnique({
      where: { id: existing.resultReferenceId },
      select: { approvalInstance: { select: { currentStepOrder: true } } },
    });

    return {
      claimId: existing.resultReferenceId,
      returnedToStep: row?.approvalInstance?.currentStepOrder ?? 0,
      replayed: true,
      capped: false,
    };
  }

  const sicknessDate = normalizeMedicalIsoDate(input.request.sicknessDate);
  const description = normalizeMedicalDescription(input.request.description);

  assertMedicalDateNotFuture({ sicknessDate, today: bangkokDateKey(input.now) });

  return prisma.$transaction(
    async (tx) => {
      await tx.idempotencyKey.create({ data: claim });

      const row = await tx.medicalClaim.findUnique({
        where: { id: input.claimId },
        select: {
          id: true,
          employeeId: true,
          status: true,
          claimDate: true,
          approvalInstanceId: true,
        },
      });

      if (!row || row.employeeId !== input.employeeId) {
        throw new Error("Medical claim is unavailable for this employee");
      }

      if (row.status !== "REVISION_REQUESTED" || !row.approvalInstanceId) {
        throw new Error("Medical claim is not waiting for revision");
      }

      const steps = await tx.approvalStep.findMany({
        where: { approvalInstanceId: row.approvalInstanceId },
        select: { id: true, stepOrder: true, status: true },
        orderBy: { stepOrder: "asc" },
      });
      const returned = steps.filter((step) => step.status === "REVISION_REQUESTED");
      const revision = returned[0];

      if (returned.length !== 1 || !revision) {
        throw new Error("Medical approval state is unavailable");
      }

      if (
        steps.some(
          (step) =>
            (step.stepOrder < revision.stepOrder && step.status !== "APPROVED") ||
            (step.stepOrder > revision.stepOrder && step.status !== "PENDING"),
        )
      ) {
        throw new Error("Medical approval chain is inconsistent");
      }

      const policy = await tx.benefitPolicy.findFirst({
        where: {
          key: MEDICAL_BENEFIT_POLICY_KEY,
          active: true,
          effectiveFrom: { lte: row.claimDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: row.claimDate } }],
        },
        select: { annualLimit: true, perClaimLimit: true },
        orderBy: [{ effectiveFrom: "desc" }, { id: "asc" }],
      });

      if (!policy || policy.annualLimit === null || policy.annualLimit.toNumber() <= 0) {
        throw new Error("Medical benefit policy with annual limit is unavailable");
      }

      const amount = normalizeMedicalAmount(
        input.request.amount,
        policy.perClaimLimit ? policy.perClaimLimit.toNumber() : 1000,
      );
      const year = row.claimDate.getUTCFullYear();
      const committed = await tx.medicalClaim.findMany({
        where: {
          employeeId: input.employeeId,
          id: { not: row.id },
          claimDate: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1)),
          },
          status: { in: ["PENDING", "APPROVED", "REVISION_REQUESTED"] },
        },
        select: { amount: true },
      });

      assertMedicalAnnualLimit({
        committedAmount: committed.reduce((sum, item) => sum + item.amount.toNumber(), 0),
        newAmount: amount.effectiveAmount,
        annualLimit: policy.annualLimit.toNumber(),
      });

      await tx.medicalClaim.update({
        where: { id: row.id },
        data: {
          sicknessDate: new Date(`${sicknessDate}T00:00:00.000Z`),
          amount: amount.effectiveAmount,
          description,
          status: "PENDING",
          decisionReason: null,
        },
      });

      await Promise.all([
        tx.approvalStep.update({
          where: { id: revision.id },
          data: { status: "PENDING", decidedAt: null, comment: null, assignedAt: new Date() },
        }),
        tx.approvalInstance.update({
          where: { id: row.approvalInstanceId },
          data: { status: "PENDING", currentStepOrder: revision.stepOrder, decidedAt: null },
        }),
        tx.idempotencyKey.update({
          where: {
            actorEmployeeId_operationKind_clientKey: {
              actorEmployeeId: claim.actorEmployeeId,
              operationKind: claim.operationKind,
              clientKey: claim.clientKey,
            },
          },
          data: { resultReferenceId: row.id },
        }),
        tx.notificationOutbox.create({
          data: {
            aggregateType: "MEDICAL_CLAIM",
            aggregateId: row.id,
            eventType: "MEDICAL_CLAIM_RESUBMITTED",
            payload: { claimId: row.id, requesterEmployeeId: input.employeeId, returnedToStep: revision.stepOrder },
          },
        }),
        tx.auditLog.create({
          data: {
            actorEmployeeId: input.employeeId,
            action: "MEDICAL_RESUBMIT",
            entityType: "MedicalClaim",
            entityId: row.id,
            correlationId: input.correlationId,
            metadata: { returnedToStep: revision.stepOrder, amount: amount.effectiveAmount, capped: amount.capped },
          },
        }),
      ]);

      return { claimId: row.id, returnedToStep: revision.stepOrder, replayed: false, capped: amount.capped };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function withdrawApprovedMedical(
  prisma: PrismaClient,
  input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly reason: string;
  },
): Promise<MedicalWithdrawResult> {
  const reason = input.reason.trim();

  if (!reason || reason.length > 1000) {
    throw new Error("A withdrawal reason of 1 to 1000 characters is required");
  }

  return prisma.$transaction(
    async (tx) => {
      const claim = await tx.medicalClaim.findUnique({
        where: { id: input.claimId },
        select: { id: true, employeeId: true, status: true, approvalInstanceId: true, claimDate: true },
      });

      if (!claim) {
        throw new Error("Medical claim is unavailable for this employee");
      }

      if (claim.status === "CANCELLED") {
        return { claimId: claim.id, status: "CANCELLED" as const };
      }

      if (claim.status !== "APPROVED") {
        throw new Error("Only an approved medical claim can be withdrawn");
      }

      const allowed = await actorHasRoleOverEmployee(
        tx,
        input.actorEmployeeId,
        LEAVE_WITHDRAW_ROLE_KEY,
        claim.employeeId,
      );

      if (!allowed) {
        throw new Error("Not allowed to withdraw medical claim of this employee");
      }

      // The annual limit is computed from PENDING/APPROVED/REVISION_REQUESTED claims, so
      // cancelling restores the employee's remaining limit in the same transaction.
      await tx.medicalClaim.update({
        where: { id: claim.id },
        data: { status: "CANCELLED", decisionReason: reason },
      });

      await Promise.all([
        claim.approvalInstanceId
          ? tx.approvalInstance.update({
              where: { id: claim.approvalInstanceId },
              data: { status: "CANCELLED", decidedAt: new Date() },
            })
          : Promise.resolve(null),
        tx.notificationOutbox.create({
          data: {
            aggregateType: "MEDICAL_CLAIM",
            aggregateId: claim.id,
            eventType: "MEDICAL_CLAIM_WITHDRAWN",
            payload: {
              claimId: claim.id,
              requesterEmployeeId: claim.employeeId,
              actorEmployeeId: input.actorEmployeeId,
              claimYear: dateOnly(claim.claimDate).slice(0, 4),
            },
          },
        }),
        tx.auditLog.create({
          data: {
            actorEmployeeId: input.actorEmployeeId,
            action: "MEDICAL_WITHDRAW_APPROVED",
            entityType: "MedicalClaim",
            entityId: claim.id,
            correlationId: input.correlationId,
            metadata: { reason },
          },
        }),
      ]);

      return { claimId: claim.id, status: "CANCELLED" as const };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
