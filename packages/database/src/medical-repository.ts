import { randomUUID } from "node:crypto";

import {
  IdempotencyConflictError,
  createIdempotencyClaim,
} from "@ckace/auth";
import {
  assertMedicalAnnualLimit,
  assertMedicalCancelable,
  assertMedicalDateNotFuture,
  assertMedicalReceiptMetadata,
  calculateMedicalEntitlement,
  isMedicalAutoApprovalRole,
  normalizeMedicalCreate,
  normalizeMedicalDecision,
} from "@ckace/business-rules";
import type {
  ApprovalChainPreview,
  MedicalApprovalQueueItem,
  MedicalCancelResult,
  MedicalClaimView,
  MedicalCreateInput,
  MedicalCreateResult,
  MedicalDecisionInput,
  MedicalDecisionResult,
  MedicalResubmitInput,
  MedicalResubmitResult,
  MedicalSelfOverview,
  MedicalWithdrawResult,
} from "@ckace/contracts";
import {
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { actorMayDecideStep, delegatorIdsFor } from "./approval-delegation";
import {
  resubmitSentBackMedical,
  withdrawApprovedMedical,
} from "./medical-revision-repository";
import {
  resolveCompanyApprovalRoute,
  systemSelectedApprovals,
} from "./approval-route-loader";

export interface MedicalRepository {
  previewApprovalChain(employeeId: string): Promise<ApprovalChainPreview>;

  getSelfOverview(
    employeeId: string,
  ): Promise<MedicalSelfOverview>;

  getAssignedApprovals(
    approverEmployeeId: string,
  ): Promise<readonly MedicalApprovalQueueItem[]>;

  createSelfMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: MedicalCreateInput;
    readonly canonicalPayload: string;
  }): Promise<MedicalCreateResult>;

  cancelSelfMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
  }): Promise<MedicalCancelResult>;

  decideAssignedMedical(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly decision: MedicalDecisionInput;
  }): Promise<MedicalDecisionResult>;

  resubmitMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly request: MedicalResubmitInput;
    readonly canonicalPayload: string;
  }): Promise<MedicalResubmitResult>;

  withdrawApprovedMedical(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly reason: string;
  }): Promise<MedicalWithdrawResult>;
}

interface ActiveMedicalEmployee {
  readonly id: string;
  readonly agencyId: string | null;
  readonly departmentId: string | null;
  readonly roleKeys: readonly string[];
}

interface MedicalApprovalResolution {
  readonly policyId: string;
  readonly steps: readonly {
    readonly stepOrder: number;
    readonly approverEmployeeId: string;
  }[];
}

interface MedicalBenefitPolicyResolution {
  readonly id: string;
  readonly annualLimit: number;
}

interface MedicalAttachmentRow {
  readonly id: string;
  readonly ownerEmployeeId: string | null;
  readonly privacyClass:
    | "INTERNAL"
    | "EMPLOYEE_PRIVATE"
    | "MEDICAL_PRIVATE"
    | "ADMIN_PRIVATE";
  readonly storageProvider:
    | "LEGACY_DRIVE"
    | "R2";
  readonly storageKey: string | null;
  readonly originalFilename: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: bigint | null;
  readonly checksumSha256: string | null;
  readonly finalizedAt: Date | null;
  readonly leaveLink: { readonly attachmentId: string } | null;
  readonly overtimeLink: { readonly attachmentId: string } | null;
  readonly medicalLink: { readonly attachmentId: string } | null;
  readonly announcementLink: { readonly attachmentId: string } | null;
  readonly employeeMedia: { readonly id: string } | null;
}

const MEDICAL_BENEFIT_POLICY_KEY = "MEDICAL";
const MEDICAL_PER_CLAIM_LIMIT_DEFAULT = 1_000;

function asNumber(
  value: Prisma.Decimal,
  label: string,
): number {
  const numberValue = value.toNumber();

  if (!Number.isFinite(numberValue)) {
    throw new Error(
      `${label} decimal value is not finite`,
    );
  }

  return numberValue;
}

async function approverNames(
  prisma: Pick<PrismaClient, "employee">,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const rows = await prisma.employee.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, fullName: true },
  });

  return new Map(rows.map((row) => [row.id, row.fullName]));
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateValue(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function bangkokDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = new Map(
    parts.map((part) => [part.type, part.value]),
  );
  const year = map.get("year");
  const month = map.get("month");
  const day = map.get("day");

  if (!year || !month || !day) {
    throw new Error(
      "Unable to derive Asia/Bangkok medical date",
    );
  }

  return `${year}-${month}-${day}`;
}

export function medicalCalendarYearRange(
  today: string,
): {
  readonly start: Date;
  readonly endExclusive: Date;
} {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(
    today,
  );

  if (!match) {
    throw new Error(
      "Medical calendar year requires YYYY-MM-DD",
    );
  }

  const year = Number(match[1]);

  return {
    start: new Date(
      Date.UTC(year, 0, 1),
    ),
    endExclusive: new Date(
      Date.UTC(year + 1, 0, 1),
    ),
  };
}

async function activeMedicalEmployee(
  prisma: Pick<
    Prisma.TransactionClient,
    "employee"
  >,
  employeeId: string,
): Promise<ActiveMedicalEmployee> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      agencyId: true,
      departmentId: true,
      userAccount: {
        select: {
          state: true,
          roles: {
            select: {
              role: {
                select: { key: true },
              },
            },
          },
        },
      },
    },
  });

  if (
    !employee?.userAccount ||
    employee.userAccount.state !== "ACTIVE"
  ) {
    throw new Error(
      "Active employee account is required",
    );
  }

  return {
    id: employee.id,
    agencyId: employee.agencyId,
    departmentId: employee.departmentId,
    roleKeys:
      employee.userAccount.roles.map(
        (assignment) =>
          assignment.role.key,
      ),
  };
}

export function buildMedicalApproverScopeWhere(
  scope:
    | "SAME_AGENCY"
    | "SAME_DEPARTMENT"
    | "GLOBAL",
  requester: {
    readonly agencyId: string | null;
    readonly departmentId: string | null;
  },
): Prisma.EmployeeWhereInput {
  if (scope === "SAME_AGENCY") {
    if (!requester.agencyId) {
      throw new Error(
        "Medical approval scope SAME_AGENCY requires requester agency",
      );
    }

    return {
      agencyId: requester.agencyId,
    };
  }

  if (scope === "SAME_DEPARTMENT") {
    if (!requester.departmentId) {
      throw new Error(
        "Medical approval scope SAME_DEPARTMENT requires requester department",
      );
    }

    return {
      departmentId:
        requester.departmentId,
    };
  }

  return {};
}

async function resolveMedicalApproval(
  prisma: Pick<
    Prisma.TransactionClient,
    "approvalPolicy" | "employee" | "agency"
  >,
  requester: ActiveMedicalEmployee,
): Promise<MedicalApprovalResolution> {
  const policies =
    await prisma.approvalPolicy.findMany({
      where: {
        active: true,
        requestKind: "MEDICAL",
        OR: [
          { agencyId: requester.agencyId },
          { agencyId: null },
        ],
      },
      select: {
        id: true,
        agencyId: true,
        steps: {
          select: {
            stepOrder: true,
            requiredRoleId: true,
            scope: true,
            requiredRole: { select: { key: true } },
          },
          orderBy: {
            stepOrder: "asc",
          },
        },
      },
    });

  const policy =
    policies.find(
      (candidate) =>
        candidate.agencyId ===
        requester.agencyId,
    ) ??
    policies.find(
      (candidate) =>
        candidate.agencyId === null,
    );

  if (
    !policy ||
    policy.steps.length === 0
  ) {
    throw new Error(
      "Medical approval policy is unavailable",
    );
  }

  // Company-aware routing (Owner organisation). Teams that are not attached to
  // a company keep the legacy per-agency lookup below.
  const routed = await resolveCompanyApprovalRoute(
    prisma,
    requester.id,
    policy.steps.map((step) => ({
      kind: "ROLE" as const,
      roleKey: step.requiredRole.key,
      selection: "SYSTEM_PICKS_FIRST" as const,
      peerFallback: true,
    })),
    { defaultSelection: "SYSTEM_PICKS_FIRST" },
  );

  if (routed) {
    if (routed.route.steps.length === 0) {
      throw new Error("No eligible approver for medical");
    }

    return {
      policyId: policy.id,
      steps: [...systemSelectedApprovals(routed.route)],
    };
  }

  const steps: {
    stepOrder: number;
    approverEmployeeId: string;
  }[] = [];

  for (const step of policy.steps) {
    const approver =
      await prisma.employee.findFirst({
        where: {
          id: {
            not: requester.id,
          },
          ...buildMedicalApproverScopeWhere(
            step.scope,
            requester,
          ),
          userAccount: {
            is: {
              state: "ACTIVE",
              roles: {
                some: {
                  roleId:
                    step.requiredRoleId,
                },
              },
            },
          },
        },
        select: { id: true },
        orderBy: [
          { createdAt: "asc" },
          { id: "asc" },
        ],
      });

    if (!approver) {
      throw new Error(
        `No eligible approver for medical step ${step.stepOrder}`,
      );
    }

    steps.push({
      stepOrder: step.stepOrder,
      approverEmployeeId:
        approver.id,
    });
  }

  return {
    policyId: policy.id,
    steps,
  };
}

/** Per-claim limit of the active medical policy; falls back to the company default of 1,000. */
async function perClaimLimitFor(
  prisma: Pick<Prisma.TransactionClient, "benefitPolicy">,
  today: string,
): Promise<number> {
  const effectiveDate = dateValue(today);
  const policy = await prisma.benefitPolicy.findFirst({
    where: {
      key: MEDICAL_BENEFIT_POLICY_KEY,
      active: true,
      effectiveFrom: { lte: effectiveDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }],
    },
    select: { perClaimLimit: true },
    orderBy: [{ effectiveFrom: "desc" }, { id: "asc" }],
  });

  return policy?.perClaimLimit ? policy.perClaimLimit.toNumber() : MEDICAL_PER_CLAIM_LIMIT_DEFAULT;
}

async function activeMedicalBenefitPolicy(
  prisma: Pick<
    Prisma.TransactionClient,
    "benefitPolicy"
  >,
  effectiveDate: Date,
): Promise<MedicalBenefitPolicyResolution> {
  const policy =
    await prisma.benefitPolicy.findFirst({
      where: {
        key: MEDICAL_BENEFIT_POLICY_KEY,
        active: true,
        effectiveFrom: {
          lte: effectiveDate,
        },
        OR: [
          { effectiveTo: null },
          {
            effectiveTo: {
              gte: effectiveDate,
            },
          },
        ],
      },
      select: {
        id: true,
        annualLimit: true,
      },
      orderBy: [
        { effectiveFrom: "desc" },
        { id: "asc" },
      ],
    });

  if (
    !policy ||
    policy.annualLimit === null
  ) {
    throw new Error(
      "Medical benefit policy with annual limit is unavailable",
    );
  }

  const annualLimit = asNumber(
    policy.annualLimit,
    "Medical annual limit",
  );

  if (annualLimit <= 0) {
    throw new Error(
      "Medical annual limit must be positive",
    );
  }

  return {
    id: policy.id,
    annualLimit,
  };
}

function attachmentSizeNumber(
  value: bigint | null,
): number | null {
  if (value === null) {
    return null;
  }

  const numeric = Number(value);

  if (
    !Number.isSafeInteger(numeric) ||
    numeric <= 0
  ) {
    throw new Error(
      "Medical receipt size metadata is invalid",
    );
  }

  return numeric;
}

function validSha256(
  value: string | null,
): boolean {
  return Boolean(
    value &&
      /^[0-9a-f]{64}$/i.test(
        value.trim(),
      ),
  );
}

export function validateFinalizedMedicalAttachments(
  input: {
    readonly employeeId: string;
    readonly requestedIds:
      readonly string[];
    readonly rows:
      readonly MedicalAttachmentRow[];
  },
): void {
  if (
    input.rows.length !==
    input.requestedIds.length
  ) {
    throw new Error(
      "Medical receipt attachment set is incomplete",
    );
  }

  const requested = new Set(
    input.requestedIds,
  );

  if (
    requested.size !==
    input.requestedIds.length
  ) {
    throw new Error(
      "Medical receipt attachment IDs must be unique",
    );
  }

  for (const row of input.rows) {
    if (!requested.has(row.id)) {
      throw new Error(
        "Medical receipt attachment set is invalid",
      );
    }

    if (
      row.ownerEmployeeId !==
      input.employeeId
    ) {
      throw new Error(
        "Medical receipt attachment owner mismatch",
      );
    }

    if (
      row.privacyClass !==
      "MEDICAL_PRIVATE"
    ) {
      throw new Error(
        "Medical receipt must use MEDICAL_PRIVATE",
      );
    }

    if (
      row.storageProvider !== "R2" ||
      !row.storageKey?.trim() ||
      !row.finalizedAt
    ) {
      throw new Error(
        "Medical receipt must be finalized in R2",
      );
    }

    if (
      !row.mimeType ||
      row.sizeBytes === null ||
      !validSha256(row.checksumSha256)
    ) {
      throw new Error(
        "Medical receipt finalization metadata is incomplete",
      );
    }

    if (
      row.leaveLink ||
      row.overtimeLink ||
      row.medicalLink ||
      row.announcementLink ||
      row.employeeMedia
    ) {
      throw new Error(
        "Medical receipt attachment is already linked",
      );
    }
  }

  assertMedicalReceiptMetadata(
    input.rows.map((row) => ({
      attachmentId: row.id,
      mimeType: row.mimeType,
      sizeBytes:
        attachmentSizeNumber(
          row.sizeBytes,
        ),
    })),
  );
}

function medicalAttachmentView(
  attachment: {
    readonly id: string;
    readonly originalFilename: string | null;
    readonly mimeType: string | null;
    readonly sizeBytes: bigint | null;
  },
) {
  return {
    attachmentId: attachment.id,
    fileName:
      attachment.originalFilename,
    mimeType: attachment.mimeType,
    sizeBytes:
      attachment.sizeBytes === null
        ? null
        : attachmentSizeNumber(
            attachment.sizeBytes,
          ),
  };
}

function medicalClaimView(
  claim: {
    readonly id: string;
    readonly employeeId: string;
    readonly leaveRequestId: string | null;
    readonly benefitPolicyId: string | null;
    readonly sicknessDate: Date;
    readonly amount: Prisma.Decimal;
    readonly description: string;
    readonly status:
      | "PENDING"
      | "APPROVED"
      | "REJECTED"
      | "CANCELLED"
      | "REVISION_REQUESTED";
    readonly decisionReason: string | null;
    readonly submittedAt: Date;
    readonly attachments: readonly {
      readonly attachment: {
        readonly id: string;
        readonly originalFilename:
          string | null;
        readonly mimeType:
          string | null;
        readonly sizeBytes:
          bigint | null;
      };
    }[];
  },
): MedicalClaimView {
  return {
    id: claim.id,
    employeeId: claim.employeeId,
    leaveRequestId:
      claim.leaveRequestId,
    benefitPolicyId:
      claim.benefitPolicyId,
    sicknessDate: dateOnly(
      claim.sicknessDate,
    ),
    amount: asNumber(
      claim.amount,
      "Medical claim amount",
    ),
    description: claim.description,
    status: claim.status,
    decisionReason:
      claim.decisionReason,
    submittedAt:
      claim.submittedAt.toISOString(),
    attachments:
      claim.attachments.map((link) =>
        medicalAttachmentView(
          link.attachment,
        ),
      ),
  };
}

const medicalClaimSelection = {
  id: true,
  employeeId: true,
  leaveRequestId: true,
  benefitPolicyId: true,
  sicknessDate: true,
  amount: true,
  description: true,
  status: true,
  decisionReason: true,
  submittedAt: true,
  attachments: {
    select: {
      attachment: {
        select: {
          id: true,
          originalFilename: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
    },
    orderBy: {
      attachmentId: "asc" as const,
    },
  },
} as const;

async function loadMedicalClaimById(
  prisma: Pick<
    PrismaClient,
    "medicalClaim"
  >,
  input: {
    readonly claimId: string;
    readonly employeeId: string;
  },
): Promise<MedicalClaimView> {
  const claim =
    await prisma.medicalClaim.findUnique({
      where: {
        id: input.claimId,
      },
      select: medicalClaimSelection,
    });

  if (
    !claim ||
    claim.employeeId !==
      input.employeeId
  ) {
    throw new Error(
      "Medical idempotency result is unavailable for this employee",
    );
  }

  return medicalClaimView(claim);
}

async function existingMedicalReference(
  prisma: Pick<
    PrismaClient,
    "idempotencyKey"
  >,
  claim: {
    readonly actorEmployeeId: string;
    readonly operationKind: string;
    readonly clientKey: string;
    readonly payloadHash: string;
  },
): Promise<string | null> {
  const existing =
    await prisma.idempotencyKey.findUnique({
      where: {
        actorEmployeeId_operationKind_clientKey:
          {
            actorEmployeeId:
              claim.actorEmployeeId,
            operationKind:
              claim.operationKind,
            clientKey:
              claim.clientKey,
          },
      },
      select: {
        payloadHash: true,
        resultReferenceId: true,
      },
    });

  if (!existing) {
    return null;
  }

  if (
    existing.payloadHash !==
    claim.payloadHash
  ) {
    throw new IdempotencyConflictError();
  }

  if (!existing.resultReferenceId) {
    throw new Error(
      "Medical idempotency record is incomplete and requires review",
    );
  }

  return existing.resultReferenceId;
}

async function validateOptionalLeaveLink(
  prisma: Pick<
    Prisma.TransactionClient,
    "leaveRequest"
  >,
  input: {
    readonly employeeId: string;
    readonly leaveRequestId:
      string | null;
  },
): Promise<void> {
  if (!input.leaveRequestId) {
    return;
  }

  const request =
    await prisma.leaveRequest.findUnique({
      where: {
        id: input.leaveRequestId,
      },
      select: {
        requesterEmployeeId: true,
      },
    });

  if (
    !request ||
    request.requesterEmployeeId !==
      input.employeeId
  ) {
    throw new Error(
      "Medical linked leave request is unavailable for this employee",
    );
  }
}

async function medicalAttachmentRows(
  prisma: Pick<
    Prisma.TransactionClient,
    "attachment"
  >,
  attachmentIds:
    readonly string[],
): Promise<readonly MedicalAttachmentRow[]> {
  return prisma.attachment.findMany({
    where: {
      id: {
        in: [...attachmentIds],
      },
    },
    select: {
      id: true,
      ownerEmployeeId: true,
      privacyClass: true,
      storageProvider: true,
      storageKey: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      checksumSha256: true,
      finalizedAt: true,
      leaveLink: {
        select: {
          attachmentId: true,
        },
      },
      overtimeLink: {
        select: {
          attachmentId: true,
        },
      },
      medicalLink: {
        select: {
          attachmentId: true,
        },
      },
      announcementLink: {
        select: {
          attachmentId: true,
        },
      },
      employeeMedia: {
        select: { id: true },
      },
    },
  });
}

export class PrismaMedicalRepository
  implements MedicalRepository
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly clock:
      () => Date = () => new Date(),
  ) {}

  async getSelfOverview(
    employeeId: string,
  ): Promise<MedicalSelfOverview> {
    await activeMedicalEmployee(
      this.prisma,
      employeeId,
    );

    const now = this.clock();
    const today = bangkokDateKey(now);
    const claimDate = dateValue(today);
    const year =
      medicalCalendarYearRange(today);
    const policy =
      await activeMedicalBenefitPolicy(
        this.prisma,
        claimDate,
      );

    const claims =
      await this.prisma.medicalClaim.findMany({
        where: {
          employeeId,
        },
        select: {
          ...medicalClaimSelection,
          claimDate: true,
        },
        orderBy: [
          { submittedAt: "desc" },
          { id: "desc" },
        ],
      });

    const currentYearClaims =
      claims.filter(
        (claim) =>
          claim.claimDate >=
            year.start &&
          claim.claimDate <
            year.endExclusive,
      );

    return {
      entitlement:
        calculateMedicalEntitlement({
          annualLimit:
            policy.annualLimit,
          claims:
            currentYearClaims.map(
              (claim) => ({
                status:
                  claim.status as
                    | "PENDING"
                    | "APPROVED"
                    | "REJECTED"
                    | "CANCELLED"
                    | "REVISION_REQUESTED",
                amount: asNumber(
                  claim.amount,
                  "Medical claim amount",
                ),
              }),
            ),
        }),
      claims: claims.map(
        medicalClaimView,
      ),
    };
  }

  async getAssignedApprovals(
    approverEmployeeId: string,
  ): Promise<
    readonly MedicalApprovalQueueItem[]
  > {
    await activeMedicalEmployee(
      this.prisma,
      approverEmployeeId,
    );

    const delegators = await delegatorIdsFor(this.prisma, approverEmployeeId);
    const steps =
      await this.prisma.approvalStep.findMany({
        where: {
          approverEmployeeId: { in: [approverEmployeeId, ...delegators] },
          status: "PENDING",
          approvalInstance: {
            is: {
              requestKind:
                "MEDICAL",
              status: "PENDING",
            },
          },
        },
        select: {
          id: true,
          stepOrder: true,
          approvalInstance: {
            select: {
              currentStepOrder: true,
              medicalClaim: {
                select: {
                  ...medicalClaimSelection,
                  employee: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { assignedAt: "asc" },
          { id: "asc" },
        ],
      });

    return steps
      .filter(
        (step) =>
          step.approvalInstance
            .currentStepOrder ===
            step.stepOrder &&
          step.approvalInstance
            .medicalClaim !== null,
      )
      .map((step) => {
        const claim =
          step.approvalInstance
            .medicalClaim;

        if (!claim) {
          throw new Error(
            "Medical approval queue claim disappeared",
          );
        }

        return {
          ...medicalClaimView(claim),
          approvalStepId: step.id,
          stepOrder:
            step.stepOrder,
          employeeDisplayName:
            claim.employee.fullName,
        };
      });
  }

  async createSelfMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly request: MedicalCreateInput;
    readonly canonicalPayload: string;
  }): Promise<MedicalCreateResult> {
    const perClaimLimit = await perClaimLimitFor(
      this.prisma,
      bangkokDateKey(this.clock()),
    );
    const normalized =
      normalizeMedicalCreate(
        input.request,
        perClaimLimit,
      );
    const idempotency =
      createIdempotencyClaim({
        actorEmployeeId:
          input.employeeId,
        operationKind:
          "MEDICAL_CREATE",
        clientKey:
          normalized.clientKey,
        canonicalPayload:
          input.canonicalPayload,
      });

    await activeMedicalEmployee(
      this.prisma,
      input.employeeId,
    );

    const existingClaimId =
      await existingMedicalReference(
        this.prisma,
        idempotency,
      );

    const cappedWarnings =
      normalized.capped
        ? [
            `MEDICAL_AMOUNT_CAPPED_TO_${perClaimLimit}`,
          ]
        : [];

    if (existingClaimId) {
      return {
        claim:
          await loadMedicalClaimById(
            this.prisma,
            {
              claimId:
                existingClaimId,
              employeeId:
                input.employeeId,
            },
          ),
        replayed: true,
        warnings: cappedWarnings,
      };
    }

    const now = this.clock();
    const today = bangkokDateKey(now);
    const claimDate = dateValue(today);
    const sicknessDate = dateValue(
      normalized.sicknessDate,
    );
    const year =
      medicalCalendarYearRange(today);
    const claimId = randomUUID();

    assertMedicalDateNotFuture({
      sicknessDate:
        normalized.sicknessDate,
      today,
    });

    try {
      const created =
        await this.prisma.$transaction(
          async (tx) => {
            await tx.idempotencyKey.create({
              data: {
                ...idempotency,
                resultReferenceId:
                  claimId,
              },
            });

            const requester =
              await activeMedicalEmployee(
                tx,
                input.employeeId,
              );
            const policy =
              await activeMedicalBenefitPolicy(
                tx,
                claimDate,
              );

            const committed =
              await tx.medicalClaim.findMany({
                where: {
                  employeeId:
                    input.employeeId,
                  claimDate: {
                    gte: year.start,
                    lt: year.endExclusive,
                  },
                  status: {
                    in: [
                      "PENDING",
                      "APPROVED",
                      "REVISION_REQUESTED",
                    ],
                  },
                },
                select: {
                  amount: true,
                },
              });

            const committedAmount =
              committed.reduce(
                (sum, claim) =>
                  sum +
                  asNumber(
                    claim.amount,
                    "Medical claim amount",
                  ),
                0,
              );

            assertMedicalAnnualLimit({
              committedAmount,
              newAmount:
                normalized.amount,
              annualLimit:
                policy.annualLimit,
            });

            await validateOptionalLeaveLink(
              tx,
              {
                employeeId:
                  input.employeeId,
                leaveRequestId:
                  normalized.leaveRequestId,
              },
            );

            const attachmentRows =
              await medicalAttachmentRows(
                tx,
                normalized.attachmentIds,
              );

            validateFinalizedMedicalAttachments(
              {
                employeeId:
                  input.employeeId,
                requestedIds:
                  normalized.attachmentIds,
                rows: attachmentRows,
              },
            );

            const autoApproved =
              isMedicalAutoApprovalRole(
                requester.roleKeys,
              );
            const approval = autoApproved
              ? null
              : await resolveMedicalApproval(
                  tx,
                  requester,
                );

            const approvalInstance =
              approval
                ? await tx.approvalInstance.create({
                    data: {
                      requestKind:
                        "MEDICAL",
                      requesterEmployeeId:
                        input.employeeId,
                      policyId:
                        approval.policyId,
                      status: "PENDING",
                      currentStepOrder:
                        approval.steps[0]
                          ?.stepOrder ??
                        null,
                      steps: {
                        create:
                          approval.steps.map(
                            (step) => ({
                              stepOrder:
                                step.stepOrder,
                              approverEmployeeId:
                                step.approverEmployeeId,
                              status:
                                "PENDING",
                              assignedAt:
                                now,
                            }),
                          ),
                      },
                    },
                    select: {
                      id: true,
                    },
                  })
                : null;

            const claim =
              await tx.medicalClaim.create({
                data: {
                  id: claimId,
                  employeeId:
                    input.employeeId,
                  leaveRequestId:
                    normalized.leaveRequestId,
                  benefitPolicyId:
                    policy.id,
                  approvalInstanceId:
                    approvalInstance?.id ??
                    null,
                  claimDate,
                  sicknessDate,
                  amount:
                    new Prisma.Decimal(
                      normalized.amount,
                    ),
                  description:
                    normalized.description,
                  status:
                    autoApproved
                      ? "APPROVED"
                      : "PENDING",
                  decisionReason:
                    autoApproved
                      ? "AUTO_APPROVED_BY_ADMIN_ROLE"
                      : null,
                  submittedAt: now,
                  attachments: {
                    create:
                      normalized.attachmentIds.map(
                        (attachmentId) => ({
                          attachmentId,
                        }),
                      ),
                  },
                },
                select:
                  medicalClaimSelection,
              });

            await Promise.all([
              tx.notificationOutbox.create({
                data: {
                  aggregateType:
                    "MEDICAL_CLAIM",
                  aggregateId:
                    claimId,
                  eventType:
                    autoApproved
                      ? "MEDICAL_CLAIM_AUTO_APPROVED"
                      : "MEDICAL_CLAIM_CREATED",
                  payload: {
                    claimId,
                    requesterEmployeeId:
                      input.employeeId,
                    status:
                      autoApproved
                        ? "APPROVED"
                        : "PENDING",
                  },
                },
              }),
              tx.auditLog.create({
                data: {
                  actorEmployeeId:
                    input.employeeId,
                  action:
                    "MEDICAL_CREATE",
                  entityType:
                    "MedicalClaim",
                  entityId:
                    claimId,
                  correlationId:
                    input.correlationId,
                  metadata: {
                    autoApproved,
                    benefitPolicyId:
                      policy.id,
                    requestedAmount:
                      normalized.requestedAmount,
                    effectiveAmount:
                      normalized.amount,
                    capped:
                      normalized.capped,
                    attachmentCount:
                      normalized
                        .attachmentIds
                        .length,
                  },
                },
              }),
            ]);

            return medicalClaimView(
              claim,
            );
          },
          {
            isolationLevel:
              Prisma
                .TransactionIsolationLevel
                .Serializable,
          },
        );

      return {
        claim: created,
        replayed: false,
        warnings: cappedWarnings,
      };
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const racedClaimId =
          await existingMedicalReference(
            this.prisma,
            idempotency,
          );

        if (racedClaimId) {
          return {
            claim:
              await loadMedicalClaimById(
                this.prisma,
                {
                  claimId:
                    racedClaimId,
                  employeeId:
                    input.employeeId,
                },
              ),
            replayed: true,
            warnings:
              cappedWarnings,
          };
        }
      }

      throw error;
    }
  }

  async cancelSelfMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
  }): Promise<MedicalCancelResult> {
    return this.prisma.$transaction(
      async (tx) => {
        await activeMedicalEmployee(
          tx,
          input.employeeId,
        );

        const claim =
          await tx.medicalClaim.findUnique({
            where: {
              id: input.claimId,
            },
            select: {
              id: true,
              employeeId: true,
              status: true,
              approvalInstanceId:
                true,
            },
          });

        if (
          !claim ||
          claim.employeeId !==
            input.employeeId
        ) {
          throw new Error(
            "Medical claim is unavailable for this employee",
          );
        }

        if (
          claim.status ===
          "CANCELLED"
        ) {
          return {
            claimId: claim.id,
            status: "CANCELLED",
          };
        }

        assertMedicalCancelable(
          claim.status,
        );

        const decidedAt =
          this.clock();

        await tx.medicalClaim.update({
          where: {
            id: claim.id,
          },
          data: {
            status: "CANCELLED",
          },
        });

        if (
          claim.approvalInstanceId
        ) {
          await Promise.all([
            tx.approvalInstance.update({
              where: {
                id:
                  claim.approvalInstanceId,
              },
              data: {
                status:
                  "CANCELLED",
                currentStepOrder:
                  null,
                decidedAt,
              },
            }),
            tx.approvalStep.updateMany({
              where: {
                approvalInstanceId:
                  claim.approvalInstanceId,
                status: "PENDING",
              },
              data: {
                status:
                  "CANCELLED",
                decidedAt,
              },
            }),
          ]);
        }

        await Promise.all([
          tx.notificationOutbox.create({
            data: {
              aggregateType:
                "MEDICAL_CLAIM",
              aggregateId:
                claim.id,
              eventType:
                "MEDICAL_CLAIM_CANCELLED",
              payload: {
                claimId:
                  claim.id,
                requesterEmployeeId:
                  input.employeeId,
              },
            },
          }),
          tx.auditLog.create({
            data: {
              actorEmployeeId:
                input.employeeId,
              action:
                "MEDICAL_CANCEL",
              entityType:
                "MedicalClaim",
              entityId:
                claim.id,
              correlationId:
                input.correlationId,
            },
          }),
        ]);

        return {
          claimId: claim.id,
          status: "CANCELLED",
        };
      },
      {
        isolationLevel:
          Prisma
            .TransactionIsolationLevel
            .Serializable,
      },
    );
  }

  async decideAssignedMedical(input: {
    readonly approverEmployeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly decision: MedicalDecisionInput;
  }): Promise<MedicalDecisionResult> {
    const normalized =
      normalizeMedicalDecision(
        input.decision,
      );
    const decidedAt = this.clock();

    return this.prisma.$transaction(
      async (tx) => {
        await activeMedicalEmployee(
          tx,
          input.approverEmployeeId,
        );

        const claim =
          await tx.medicalClaim.findUnique({
            where: {
              id: input.claimId,
            },
            select: {
              ...medicalClaimSelection,
              approvalInstanceId:
                true,
              approvalInstance: {
                select: {
                  id: true,
                  currentStepOrder:
                    true,
                  status: true,
                  steps: {
                    select: {
                      id: true,
                      stepOrder: true,
                      approverEmployeeId:
                        true,
                      status: true,
                    },
                    orderBy: {
                      stepOrder: "asc",
                    },
                  },
                },
              },
            },
          });

        if (
          !claim?.approvalInstance
        ) {
          throw new Error(
            "Medical approval state is unavailable",
          );
        }

        const currentStep =
          claim.approvalInstance.steps.find(
            (step) =>
              step.stepOrder ===
              claim.approvalInstance
                ?.currentStepOrder,
          );

        const mayDecide = currentStep
          ? await actorMayDecideStep(tx, {
              stepApproverId: currentStep.approverEmployeeId,
              actorEmployeeId: input.approverEmployeeId,
              requesterEmployeeId: claim.employeeId,
            })
          : false;

        if (!currentStep || !mayDecide) {
          throw new Error(
            "Medical claim is not assigned to this approver",
          );
        }

        await tx.approvalStep.update({
          where: { id: currentStep.id },
          data: { decidedByEmployeeId: input.approverEmployeeId },
        });

        if (
          claim.status !==
            "PENDING" ||
          currentStep.status !==
            "PENDING"
        ) {
          throw new Error(
            "Medical claim has already been decided",
          );
        }

        if (normalized.decision === "REVISION_REQUESTED") {
          await Promise.all([
            tx.approvalStep.update({
              where: { id: currentStep.id },
              data: {
                status: "REVISION_REQUESTED",
                comment: normalized.comment,
                decidedAt,
              },
            }),
            tx.medicalClaim.update({
              where: { id: claim.id },
              data: {
                status: "REVISION_REQUESTED",
                decisionReason: normalized.comment,
              },
            }),
            tx.approvalInstance.update({
              where: { id: claim.approvalInstance.id },
              data: { status: "REVISION_REQUESTED", decidedAt: null },
            }),
            tx.notificationOutbox.create({
              data: {
                aggregateType: "MEDICAL_CLAIM",
                aggregateId: claim.id,
                eventType: "MEDICAL_CLAIM_REVISION_REQUESTED",
                payload: {
                  claimId: claim.id,
                  requesterEmployeeId: claim.employeeId,
                  stepOrder: currentStep.stepOrder,
                },
              },
            }),
            tx.auditLog.create({
              data: {
                actorEmployeeId: input.approverEmployeeId,
                action: "MEDICAL_REVISION_REQUEST",
                entityType: "MedicalClaim",
                entityId: claim.id,
                correlationId: input.correlationId,
                metadata: {
                  requesterEmployeeId: claim.employeeId,
                  stepOrder: currentStep.stepOrder,
                },
              },
            }),
          ]);

          const sentBack = await tx.medicalClaim.findUniqueOrThrow({
            where: { id: claim.id },
            select: medicalClaimSelection,
          });

          return {
            claim: medicalClaimView(sentBack),
            completed: false,
            warnings: [],
          };
        }

        const nextStep =
          normalized.decision ===
          "APPROVED"
            ? claim.approvalInstance.steps.find(
                (step) =>
                  step.stepOrder >
                    currentStep.stepOrder &&
                  step.status ===
                    "PENDING",
              )
            : undefined;
        const finalStatus =
          normalized.decision ===
          "REJECTED"
            ? "REJECTED"
            : nextStep
              ? "PENDING"
              : "APPROVED";
        const completed =
          finalStatus !== "PENDING";

        await Promise.all([
          tx.approvalStep.update({
            where: {
              id: currentStep.id,
            },
            data: {
              status:
                normalized.decision,
              comment:
                normalized.comment,
              decidedAt,
            },
          }),
          tx.medicalClaim.update({
            where: {
              id: claim.id,
            },
            data: {
              status:
                finalStatus,
              decisionReason:
                normalized.decision ===
                "REJECTED"
                  ? normalized.comment
                  : null,
            },
          }),
          tx.approvalInstance.update({
            where: {
              id:
                claim.approvalInstance
                  .id,
            },
            data: {
              status:
                finalStatus,
              currentStepOrder:
                nextStep?.stepOrder ??
                null,
              decidedAt:
                completed
                  ? decidedAt
                  : null,
            },
          }),
          tx.notificationOutbox.create({
            data: {
              aggregateType:
                "MEDICAL_CLAIM",
              aggregateId:
                claim.id,
              eventType:
                normalized.decision ===
                "REJECTED"
                  ? "MEDICAL_CLAIM_REJECTED"
                  : completed
                    ? "MEDICAL_CLAIM_APPROVED"
                    : "MEDICAL_APPROVAL_ADVANCED",
              payload: {
                claimId:
                  claim.id,
                requesterEmployeeId:
                  claim.employeeId,
                nextStepOrder:
                  nextStep?.stepOrder ??
                  null,
              },
            },
          }),
          tx.auditLog.create({
            data: {
              actorEmployeeId:
                input.approverEmployeeId,
              action:
                normalized.decision ===
                "REJECTED"
                  ? "MEDICAL_REJECT"
                  : "MEDICAL_APPROVE",
              entityType:
                "MedicalClaim",
              entityId:
                claim.id,
              correlationId:
                input.correlationId,
              metadata: {
                requesterEmployeeId:
                  claim.employeeId,
                stepOrder:
                  currentStep.stepOrder,
                completed,
              },
            },
          }),
        ]);

        const updated =
          await tx.medicalClaim.findUnique({
            where: {
              id: claim.id,
            },
            select:
              medicalClaimSelection,
          });

        if (!updated) {
          throw new Error(
            "Medical claim disappeared during decision",
          );
        }

        return {
          claim:
            medicalClaimView(
              updated,
            ),
          completed,
          warnings: [],
        };
      },
      {
        isolationLevel:
          Prisma
            .TransactionIsolationLevel
            .Serializable,
      },
    );
  }

  async previewApprovalChain(employeeId: string): Promise<ApprovalChainPreview> {
    const requester = await activeMedicalEmployee(this.prisma, employeeId);

    if (isMedicalAutoApprovalRole(requester.roleKeys)) {
      return { autoApproved: true, steps: [] };
    }

    const approval = await resolveMedicalApproval(this.prisma, requester);
    const names = await approverNames(this.prisma, approval.steps.map((step) => step.approverEmployeeId));

    return {
      autoApproved: false,
      steps: approval.steps.map((step) => ({
        stepOrder: step.stepOrder,
        approverEmployeeId: step.approverEmployeeId,
        approverName: names.get(step.approverEmployeeId) ?? null,
      })),
    };
  }

  resubmitMedical(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly request: MedicalResubmitInput;
    readonly canonicalPayload: string;
  }): Promise<MedicalResubmitResult> {
    return resubmitSentBackMedical(this.prisma, { ...input, now: this.clock() });
  }

  withdrawApprovedMedical(input: {
    readonly actorEmployeeId: string;
    readonly correlationId: string;
    readonly claimId: string;
    readonly reason: string;
  }): Promise<MedicalWithdrawResult> {
    return withdrawApprovedMedical(this.prisma, input);
  }
}
