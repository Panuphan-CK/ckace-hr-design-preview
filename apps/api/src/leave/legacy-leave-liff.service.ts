import {
  createHash,
  randomUUID,
} from "node:crypto";

import {
  createIdempotencyClaim,
  IdentityInactiveError,
  IdentityService,
  IdentityUnavailableError,
  type InternalActorContext,
} from "@ckace/auth";
import {
  calculateLeaveUnits,
  normalizeLeavePeriod,
  type LeaveWorkingCalendar,
} from "@ckace/business-rules";
import {
  getPrismaClient,
  PrismaIdentityRepository,
} from "@ckace/database";
import {
  createPrivateAttachmentStorageKey,
  R2AwsRequestSigner,
  R2PrivateObjectStore,
} from "@ckace/storage";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  Prisma,
  type LeaveDurationCode,
  type PrismaClient,
  type RequestStatus,
} from "@prisma/client";

import {
  LineVerifyApiTokenVerifier,
} from "../onboarding/onboarding-auth";
import { ModuleRoutingService } from "../routing/module-routing.service";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 3;

const ROLE_LEVEL: Readonly<Record<string, number>> = Object.freeze({
  USER: 1,
  SUPERUSER: 2,
  ADMIN: 3,
  SUPERADMIN: 4,
});

type LegacyAction =
  | "leave"
  | "requests"
  | "decision"
  | "attachment";

interface LegacyUploadedFile {
  readonly attachmentId: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly bytes: Uint8Array;
  readonly checksumSha256: string;
  readonly storageKey: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isoDate(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value;
}

function legacyDate(value: Date): string {
  const iso = value.toISOString().slice(0, 10);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function timeText(value: Date | null): string | null {
  return value ? value.toISOString().slice(11, 16) : null;
}

function durationCode(value: unknown): LeaveDurationCode {
  switch (String(value ?? "").trim().toUpperCase()) {
    case "F":
      return "FULL_DAY";
    case "H":
      return "HOURLY";
    case "AM":
      return "MORNING";
    case "PM":
      return "AFTERNOON";
    default:
      throw new BadRequestException("Invalid leave duration");
  }
}

function legacyStatus(status: RequestStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    case "REVISION_REQUESTED":
      return "Revise";
  }
}

function legacyLeaveType(key: string, name: string): string {
  switch (key) {
    case "ANNUAL":
      return "Vacation";
    case "PERSONAL":
      return "Personal";
    case "SICK":
      return "Sick";
    default:
      return name || key;
  }
}

function canonicalPayload(value: unknown): string {
  return JSON.stringify(value);
}

function fileSignatureMatches(
  mimeType: string,
  bytes: Uint8Array,
): boolean {
  const signatures: Readonly<Record<string, readonly number[]>> = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
  };
  const signature = signatures[mimeType];
  return Boolean(
    signature &&
      signature.every((expected, index) => bytes[index] === expected),
  );
}

function parseUploadedFiles(value: unknown): readonly {
  readonly filename: string;
  readonly mimeType: string;
  readonly bytes: Uint8Array;
  readonly checksumSha256: string;
}[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_FILES) {
    throw new BadRequestException("Invalid leave attachments");
  }

  let total = 0;
  return value.map((raw) => {
    if (!raw || typeof raw !== "object") {
      throw new BadRequestException("Invalid leave attachment");
    }
    const file = raw as Record<string, unknown>;
    const filename =
      typeof file.filename === "string" ? file.filename.trim() : "";
    const mimeType =
      typeof file.filetype === "string" ? file.filetype.trim() : "";
    const dataUrl =
      typeof file.imageDataUrl === "string"
        ? file.imageDataUrl
        : "";
    const extensions: Readonly<Record<string, RegExp>> = {
      "image/jpeg": /\.jpe?g$/i,
      "image/png": /\.png$/i,
      "application/pdf": /\.pdf$/i,
    };
    if (
      !filename ||
      filename.length > 150 ||
      /[\x00-\x1f\x7f\\/]/.test(filename) ||
      !extensions[mimeType]?.test(filename)
    ) {
      throw new BadRequestException("Invalid leave attachment");
    }
    const prefix = `data:${mimeType};base64,`;
    if (!dataUrl.startsWith(prefix)) {
      throw new BadRequestException("Invalid leave attachment");
    }
    const encoded = dataUrl.slice(prefix.length);
    if (
      !encoded ||
      encoded.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
    ) {
      throw new BadRequestException("Invalid leave attachment");
    }
    const bytes = new Uint8Array(Buffer.from(encoded, "base64"));
    if (
      bytes.byteLength === 0 ||
      bytes.byteLength > MAX_FILE_BYTES ||
      !fileSignatureMatches(mimeType, bytes)
    ) {
      throw new BadRequestException("Invalid leave attachment");
    }
    total += bytes.byteLength;
    if (total > MAX_TOTAL_FILE_BYTES) {
      throw new BadRequestException("Invalid leave attachments");
    }
    return {
      filename,
      mimeType,
      bytes,
      checksumSha256: createHash("sha256")
        .update(bytes)
        .digest("hex"),
    };
  });
}

function requestCalendar(
  rules: readonly {
    readonly isoWeekday: number;
    readonly isWorking: boolean;
  }[],
  holidays: readonly { readonly holidayDate: Date }[],
): LeaveWorkingCalendar {
  return {
    workingIsoWeekdays: new Set(
      rules.filter((rule) => rule.isWorking).map((rule) => rule.isoWeekday),
    ),
    holidayDates: new Set(
      holidays.map((holiday) =>
        holiday.holidayDate.toISOString().slice(0, 10),
      ),
    ),
  };
}

@Injectable()
export class LegacyLeaveLiffService {
  private readonly prisma: PrismaClient = getPrismaClient();
  private readonly identity = new IdentityService(
    new PrismaIdentityRepository(this.prisma),
  );

  constructor(
    @Inject(ModuleRoutingService)
    private readonly routing: ModuleRoutingService,
  ) {}

  async dispatch(
    action: LegacyAction,
    body: unknown,
  ): Promise<Record<string, unknown>> {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Body is required");
    }
    const payload = body as Record<string, unknown>;
    const actor = await this.resolveActor(payload.idToken);

    if (action === "requests") {
      this.assertAuthority("READ");
      return this.listRequests(actor, payload);
    }
    if (action === "attachment") {
      this.assertAuthority("READ");
      return this.readAttachment(actor, payload);
    }

    this.assertAuthority("WRITE");
    if (action === "leave") {
      return this.createLeave(actor, payload);
    }
    return this.decideLeave(actor, payload);
  }

  private assertAuthority(access: "READ" | "WRITE"): void {
    const route = this.routing.resolve(
      access === "READ" ? "LEAVE_READ" : "LEAVE_WRITE",
    );
    if (route.authority !== "NEW") {
      throw new ServiceUnavailableException(
        "LEAVE_NEW_AUTHORITY_NOT_ACTIVE",
      );
    }
    if (access === "WRITE" && route.writeFrozen) {
      throw new ServiceUnavailableException(
        "LEAVE_WRITE_FROZEN",
      );
    }
  }

  private async resolveActor(
    idToken: unknown,
  ): Promise<InternalActorContext> {
    if (typeof idToken !== "string" || !idToken.trim()) {
      throw new UnauthorizedException("LINE ID token is required");
    }
    try {
      const verifier = new LineVerifyApiTokenVerifier(
        requiredEnv("LINE_LOGIN_CHANNEL_ID"),
      );
      const lineUserId = await verifier.verify(idToken);
      return await this.identity.resolveLineActor({
        lineUserId,
      });
    } catch (error) {
      if (error instanceof IdentityInactiveError) {
        throw new ForbiddenException("Employee account is inactive");
      }
      if (error instanceof IdentityUnavailableError) {
        throw new UnauthorizedException("LINE account is not linked");
      }
      throw new UnauthorizedException("LINE authentication failed");
    }
  }

  private async calendar(): Promise<LeaveWorkingCalendar> {
    const [rules, holidays] = await Promise.all([
      this.prisma.weeklyWorkRule.findMany({
        select: { isoWeekday: true, isWorking: true },
      }),
      this.prisma.holiday.findMany({
        where: { active: true },
        select: { holidayDate: true },
      }),
    ]);
    return requestCalendar(rules, holidays);
  }

  private async listRequests(
    actor: InternalActorContext,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const selfOnly = String(body.scope ?? "") === "self";
    const calendar = await this.calendar();
    const rows = await this.prisma.leaveRequest.findMany({
      where: selfOnly
        ? { requesterEmployeeId: actor.employeeId }
        : {
            OR: [
              { requesterEmployeeId: actor.employeeId },
              {
                approvalInstance: {
                  is: {
                    steps: {
                      some: {
                        approverEmployeeId: actor.employeeId,
                      },
                    },
                  },
                },
              },
            ],
          },
      select: {
        id: true,
        requesterEmployeeId: true,
        description: true,
        startDate: true,
        endDate: true,
        durationCode: true,
        startTime: true,
        endTime: true,
        status: true,
        decisionReason: true,
        submittedAt: true,
        requester: {
          select: { fullName: true },
        },
        leaveType: {
          select: { key: true, name: true },
        },
        approvalInstance: {
          select: {
            currentStepOrder: true,
            steps: {
              where: {
                approverEmployeeId: actor.employeeId,
              },
              select: {
                id: true,
                stepOrder: true,
                status: true,
              },
            },
          },
        },
        attachments: {
          select: {
            attachment: {
              select: {
                id: true,
                originalFilename: true,
              },
            },
          },
        },
      },
      orderBy: [
        { submittedAt: "desc" },
        { id: "desc" },
      ],
      take: 100,
    });

    return {
      success: true,
      requests: rows.map((row) => {
        const currentStep = row.approvalInstance?.steps.find(
          (step) =>
            step.status === "PENDING" &&
            step.stepOrder ===
              row.approvalInstance?.currentStepOrder,
        );
        const usageDays = calculateLeaveUnits(
          normalizeLeavePeriod({
            startDate: row.startDate.toISOString().slice(0, 10),
            endDate: row.endDate.toISOString().slice(0, 10),
            durationCode: row.durationCode,
            startTime: timeText(row.startTime),
            endTime: timeText(row.endTime),
          }),
          calendar,
        );
        return {
          id: row.id,
          employee: row.requester.fullName,
          description: row.description,
          start: legacyDate(row.startDate),
          end: legacyDate(row.endDate),
          leaveType: legacyLeaveType(
            row.leaveType.key,
            row.leaveType.name,
          ),
          status: legacyStatus(row.status),
          comment: row.decisionReason ?? "",
          days: usageDays,
          stepId: currentStep?.id ?? "",
          canDecide: Boolean(currentStep),
          attachments: row.attachments.map((link, index) => ({
            id: link.attachment.id,
            label:
              link.attachment.originalFilename ||
              `เอกสารแนบ ${index + 1}`,
          })),
        };
      }),
    };
  }

  private async createLeave(
    actor: InternalActorContext,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const input =
      body.input && typeof body.input === "object"
        ? body.input as Record<string, unknown>
        : {};
    const clientKey =
      typeof input.clientKey === "string"
        ? input.clientKey.trim()
        : "";
    const policyId =
      typeof input.policyId === "string"
        ? input.policyId.trim()
        : "";
    const description =
      typeof input.description === "string"
        ? input.description.trim()
        : "";
    if (!clientKey || !policyId || !description) {
      throw new BadRequestException("Invalid leave request");
    }

    const startDate = isoDate(input.startDate, "startDate");
    const endDate = isoDate(input.endDate, "endDate");
    if (endDate < startDate) {
      throw new BadRequestException(
        "Leave end date must not precede start date",
      );
    }
    if (startDate.slice(0, 4) !== endDate.slice(0, 4)) {
      throw new BadRequestException(
        "Leave request must stay within one year",
      );
    }
    const duration = durationCode(input.duration);
    const startTime =
      typeof input.startTime === "string" && input.startTime
        ? input.startTime
        : null;
    const endTime =
      typeof input.endTime === "string" && input.endTime
        ? input.endTime
        : null;
    if (
      duration !== "FULL_DAY" &&
      startDate !== endDate
    ) {
      throw new BadRequestException(
        "Partial-day leave must be within one date",
      );
    }
    if (
      duration === "HOURLY" &&
      (!/^\d{2}:\d{2}$/.test(startTime ?? "") ||
        !/^\d{2}:\d{2}$/.test(endTime ?? ""))
    ) {
      throw new BadRequestException("Hourly leave time is required");
    }

    const rawFiles = parseUploadedFiles(input.uploadedFiles);
    const canonical = canonicalPayload({
      policyId,
      description,
      startDate,
      endDate,
      duration,
      startTime,
      endTime,
      files: rawFiles.map((file) => ({
        filename: file.filename,
        mimeType: file.mimeType,
        checksumSha256: file.checksumSha256,
        sizeBytes: file.bytes.byteLength,
      })),
    });
    const claim = createIdempotencyClaim({
      actorEmployeeId: actor.employeeId,
      operationKind: "LEAVE_CREATE",
      clientKey,
      canonicalPayload: canonical,
    });
    const replay =
      await this.prisma.idempotencyKey.findUnique({
        where: {
          actorEmployeeId_operationKind_clientKey: {
            actorEmployeeId: claim.actorEmployeeId,
            operationKind: claim.operationKind,
            clientKey: claim.clientKey,
          },
        },
        select: {
          payloadHash: true,
          resultReferenceId: true,
        },
      });
    if (replay) {
      if (
        replay.payloadHash !== claim.payloadHash ||
        !replay.resultReferenceId
      ) {
        throw new BadRequestException(
          "Leave idempotency conflict requires review",
        );
      }
      return {
        success: true,
        requestId: replay.resultReferenceId,
        message: `ส่งคำขอลา ${replay.resultReferenceId} สำเร็จ`,
        replayed: true,
      };
    }

    const legacyEntitlement =
      await this.prisma.legacyRecord.findUnique({
        where: {
          sourceSystem_sourceWorkbook_sourceTab_sourcePeriod_legacyId: {
            sourceSystem: "APP_LEAVE_GAS",
            sourceWorkbook: "CK&RR_Requests",
            sourceTab: "UserPolicies",
            sourcePeriod: "CURRENT",
            legacyId: policyId,
          },
        },
        select: {
          targetEntityId: true,
        },
      });
    if (!legacyEntitlement?.targetEntityId) {
      throw new BadRequestException(
        "Leave entitlement is unavailable",
      );
    }

    const entitlement =
      await this.prisma.leaveEntitlement.findUnique({
        where: { id: legacyEntitlement.targetEntityId },
        select: {
          id: true,
          employeeId: true,
          quota: true,
          leaveTypeId: true,
          leaveType: {
            select: { id: true, key: true, active: true },
          },
        },
      });
    if (
      !entitlement ||
      entitlement.employeeId !== actor.employeeId ||
      !entitlement.leaveType.active
    ) {
      throw new ForbiddenException(
        "Leave entitlement is not owned by this employee",
      );
    }

    const calendar = await this.calendar();
    const requestedUsage = calculateLeaveUnits(
      normalizeLeavePeriod({
        startDate,
        endDate,
        durationCode: duration,
        startTime,
        endTime,
      }),
      calendar,
    );
    if (requestedUsage <= 0) {
      throw new BadRequestException(
        "Selected period has no eligible leave usage",
      );
    }
    const approved =
      await this.prisma.leaveRequest.findMany({
        where: {
          requesterEmployeeId: actor.employeeId,
          entitlementId: entitlement.id,
          status: "APPROVED",
        },
        select: {
          startDate: true,
          endDate: true,
          durationCode: true,
          startTime: true,
          endTime: true,
        },
      });
    const used = approved.reduce(
      (sum, row) =>
        sum +
        calculateLeaveUnits(
          normalizeLeavePeriod({
            startDate: row.startDate.toISOString().slice(0, 10),
            endDate: row.endDate.toISOString().slice(0, 10),
            durationCode: row.durationCode,
            startTime: timeText(row.startTime),
            endTime: timeText(row.endTime),
          }),
          calendar,
        ),
      0,
    );
    if (
      used + requestedUsage >
      entitlement.quota.toNumber()
    ) {
      throw new BadRequestException(
        "Leave entitlement is insufficient",
      );
    }

    const chain = await this.legacyApprovalChain(actor);
    if (chain.approvers.length === 0) {
      throw new BadRequestException(
        "Leave approval chain is unavailable",
      );
    }

    const uploaded = await this.uploadFiles(actor, rawFiles);
    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          await tx.idempotencyKey.create({
            data: claim,
          });
          const approval =
            await tx.approvalInstance.create({
              data: {
                requestKind: "LEAVE",
                requesterEmployeeId: actor.employeeId,
                policyId: chain.policyId,
                status: "PENDING",
                currentStepOrder: 1,
                steps: {
                  create: chain.approvers.map(
                    (employeeId, index) => ({
                      stepOrder: index + 1,
                      approverEmployeeId: employeeId,
                      status: "PENDING",
                      assignedAt: new Date(),
                    }),
                  ),
                },
              },
              select: { id: true },
            });
          const request =
            await tx.leaveRequest.create({
              data: {
                requesterEmployeeId: actor.employeeId,
                leaveTypeId: entitlement.leaveTypeId,
                entitlementId: entitlement.id,
                approvalInstanceId: approval.id,
                description,
                startDate: new Date(
                  `${startDate}T00:00:00.000Z`,
                ),
                endDate: new Date(
                  `${endDate}T00:00:00.000Z`,
                ),
                durationCode: duration,
                startTime: startTime
                  ? new Date(
                      `1970-01-01T${startTime}:00.000Z`,
                    )
                  : null,
                endTime: endTime
                  ? new Date(
                      `1970-01-01T${endTime}:00.000Z`,
                    )
                  : null,
                status: "PENDING",
              },
              select: { id: true },
            });

          for (const file of uploaded) {
            await tx.attachment.create({
              data: {
                id: file.attachmentId,
                ownerEmployeeId: actor.employeeId,
                privacyClass: "EMPLOYEE_PRIVATE",
                storageProvider: "R2",
                storageKey: file.storageKey,
                originalFilename: file.filename,
                mimeType: file.mimeType,
                sizeBytes: BigInt(file.bytes.byteLength),
                checksumSha256: file.checksumSha256,
                finalizedAt: new Date(),
              },
            });
            await tx.leaveRequestAttachment.create({
              data: {
                attachmentId: file.attachmentId,
                leaveRequestId: request.id,
              },
            });
          }

          await Promise.all([
            tx.idempotencyKey.update({
              where: {
                actorEmployeeId_operationKind_clientKey: {
                  actorEmployeeId: claim.actorEmployeeId,
                  operationKind: claim.operationKind,
                  clientKey: claim.clientKey,
                },
              },
              data: {
                resultReferenceId: request.id,
              },
            }),
            tx.auditLog.create({
              data: {
                actorEmployeeId: actor.employeeId,
                action: "LEAVE_CREATE",
                entityType: "LeaveRequest",
                entityId: request.id,
                correlationId: actor.correlationId,
                metadata: {
                  compatibilitySurface: "LEGACY_LIFF",
                  usageDays: requestedUsage,
                },
              },
            }),
            tx.notificationOutbox.create({
              data: {
                aggregateType: "LEAVE_REQUEST",
                aggregateId: request.id,
                eventType: "LEAVE_REQUEST_CREATED",
                payload: {
                  requestId: request.id,
                  requesterEmployeeId: actor.employeeId,
                  compatibilitySurface: "LEGACY_LIFF",
                },
              },
            }),
          ]);

          return request.id;
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );
      return {
        success: true,
        requestId: result,
        message: `ส่งคำขอลา ${result} สำเร็จ`,
      };
    } catch (error) {
      await this.cleanupUploadedFiles(uploaded);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const retry =
          await this.prisma.idempotencyKey.findUnique({
            where: {
              actorEmployeeId_operationKind_clientKey: {
                actorEmployeeId: claim.actorEmployeeId,
                operationKind: claim.operationKind,
                clientKey: claim.clientKey,
              },
            },
            select: {
              payloadHash: true,
              resultReferenceId: true,
            },
          });
        if (
          retry?.payloadHash === claim.payloadHash &&
          retry.resultReferenceId
        ) {
          return {
            success: true,
            requestId: retry.resultReferenceId,
            message:
              `ส่งคำขอลา ${retry.resultReferenceId} สำเร็จ`,
            replayed: true,
          };
        }
      }
      throw error;
    }
  }

  private async legacyApprovalChain(
    actor: InternalActorContext,
  ): Promise<{
    readonly policyId: string;
    readonly approvers: readonly string[];
  }> {
    const requesterLevel = Math.max(
      0,
      ...actor.roles.map(
        (role) => ROLE_LEVEL[role.toUpperCase()] ?? 0,
      ),
    );
    const policies =
      await this.prisma.approvalPolicy.findMany({
        where: {
          active: true,
          requestKind: "LEAVE",
          OR: [
            { agencyId: actor.agencyId },
            { agencyId: null },
          ],
        },
        select: {
          id: true,
          agencyId: true,
          steps: {
            select: {
              stepOrder: true,
              scope: true,
              requiredRole: {
                select: { key: true },
              },
            },
            orderBy: { stepOrder: "asc" },
          },
        },
      });
    const policy =
      policies.find(
        (candidate) =>
          candidate.agencyId === actor.agencyId,
      ) ??
      policies.find(
        (candidate) => candidate.agencyId === null,
      );
    if (!policy) {
      return { policyId: "", approvers: [] };
    }

    const approvers: string[] = [];
    let started = false;
    for (const step of policy.steps) {
      const roleKey =
        step.requiredRole.key.toUpperCase();
      const stepLevel = ROLE_LEVEL[roleKey] ?? 0;
      const candidates =
        await this.prisma.employee.findMany({
          where: {
            id: { not: actor.employeeId },
            ...(step.scope === "SAME_AGENCY"
              ? { agencyId: actor.agencyId }
              : step.scope === "SAME_DEPARTMENT"
                ? { departmentId: actor.departmentId }
                : {}),
            userAccount: {
              is: {
                state: "ACTIVE",
                roles: {
                  some: {
                    role: { key: roleKey },
                  },
                },
              },
            },
          },
          select: { id: true },
        });
      const ordered = await this.orderByLegacyUid(
        candidates.map((candidate) => candidate.id),
      );
      if (!started) {
        if (
          stepLevel > requesterLevel &&
          ordered.length > 0
        ) {
          started = true;
        } else {
          continue;
        }
      }
      for (const employeeId of ordered) {
        if (!approvers.includes(employeeId)) {
          approvers.push(employeeId);
        }
      }
    }
    return {
      policyId: policy.id,
      approvers,
    };
  }

  private async orderByLegacyUid(
    employeeIds: readonly string[],
  ): Promise<readonly string[]> {
    if (employeeIds.length <= 1) return employeeIds;
    const legacy =
      await this.prisma.legacyRecord.findMany({
        where: {
          sourceSystem: "APP_LEAVE_GAS",
          sourceWorkbook: "CK&RR_Requests",
          sourceTab: "Users",
          sourcePeriod: "CURRENT",
          targetEntityType: "employee",
          targetEntityId: { in: [...employeeIds] },
        },
        select: {
          legacyId: true,
          targetEntityId: true,
        },
        orderBy: { legacyId: "asc" },
      });
    const ordered = legacy
      .map((row) => row.targetEntityId)
      .filter(
        (value): value is string =>
          Boolean(value) &&
          employeeIds.includes(value as string),
      );
    const missing = employeeIds
      .filter((id) => !ordered.includes(id))
      .sort();
    return [...ordered, ...missing];
  }

  private async decideLeave(
    actor: InternalActorContext,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const requestId =
      typeof body.requestId === "string"
        ? body.requestId.trim()
        : "";
    const stepId =
      typeof body.stepId === "string"
        ? body.stepId.trim()
        : "";
    const decision =
      body.decision === "Approved"
        ? "APPROVED"
        : body.decision === "Rejected"
          ? "REJECTED"
          : null;
    const comment =
      typeof body.comment === "string"
        ? body.comment.trim()
        : "";
    if (
      !requestId ||
      !stepId ||
      !decision ||
      comment.length > 1000 ||
      (decision === "REJECTED" && !comment)
    ) {
      throw new BadRequestException(
        "Invalid leave approval decision",
      );
    }

    const status = await this.prisma.$transaction(
      async (tx) => {
        const request =
          await tx.leaveRequest.findUnique({
            where: { id: requestId },
            select: {
              id: true,
              status: true,
              approvalInstanceId: true,
              approvalInstance: {
                select: {
                  id: true,
                  currentStepOrder: true,
                  status: true,
                },
              },
            },
          });
        if (
          !request?.approvalInstanceId ||
          request.status !== "PENDING" ||
          request.approvalInstance?.status !== "PENDING"
        ) {
          throw new BadRequestException(
            "Leave request state changed",
          );
        }
        const step =
          await tx.approvalStep.findUnique({
            where: { id: stepId },
            select: {
              id: true,
              approvalInstanceId: true,
              stepOrder: true,
              approverEmployeeId: true,
              status: true,
            },
          });
        if (
          !step ||
          step.approvalInstanceId !==
            request.approvalInstanceId ||
          step.approverEmployeeId !== actor.employeeId ||
          step.status !== "PENDING" ||
          step.stepOrder !==
            request.approvalInstance.currentStepOrder
        ) {
          throw new ForbiddenException(
            "Leave approval step is unavailable",
          );
        }

        await tx.approvalStep.update({
          where: { id: step.id },
          data: {
            status: decision,
            decidedAt: new Date(),
            comment: comment || null,
          },
        });

        let nextStatus: RequestStatus;
        if (decision === "REJECTED") {
          nextStatus = "REJECTED";
          await Promise.all([
            tx.approvalInstance.update({
              where: {
                id: request.approvalInstanceId,
              },
              data: {
                status: "REJECTED",
                decidedAt: new Date(),
              },
            }),
            tx.leaveRequest.update({
              where: { id: request.id },
              data: {
                status: "REJECTED",
                decisionReason: comment,
              },
            }),
          ]);
        } else {
          const next =
            await tx.approvalStep.findFirst({
              where: {
                approvalInstanceId:
                  request.approvalInstanceId,
                status: "PENDING",
                stepOrder: { gt: step.stepOrder },
              },
              select: { stepOrder: true },
              orderBy: { stepOrder: "asc" },
            });
          if (next) {
            nextStatus = "PENDING";
            await tx.approvalInstance.update({
              where: {
                id: request.approvalInstanceId,
              },
              data: {
                currentStepOrder: next.stepOrder,
              },
            });
          } else {
            nextStatus = "APPROVED";
            await Promise.all([
              tx.approvalInstance.update({
                where: {
                  id: request.approvalInstanceId,
                },
                data: {
                  status: "APPROVED",
                  decidedAt: new Date(),
                },
              }),
              tx.leaveRequest.update({
                where: { id: request.id },
                data: {
                  status: "APPROVED",
                  decisionReason: null,
                },
              }),
            ]);
          }
        }

        await Promise.all([
          tx.auditLog.create({
            data: {
              actorEmployeeId: actor.employeeId,
              action: "LEAVE_DECISION",
              entityType: "LeaveRequest",
              entityId: request.id,
              correlationId: actor.correlationId,
              metadata: {
                decision,
                compatibilitySurface: "LEGACY_LIFF",
              },
            },
          }),
          tx.notificationOutbox.create({
            data: {
              aggregateType: "LEAVE_REQUEST",
              aggregateId: request.id,
              eventType: "LEAVE_REQUEST_DECIDED",
              payload: {
                requestId: request.id,
                decision,
                actorEmployeeId: actor.employeeId,
              },
            },
          }),
        ]);
        return nextStatus;
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return {
      success: true,
      status: legacyStatus(status),
      message: "บันทึกผลแล้ว",
      warnings: [],
    };
  }

  private objectStore(): R2PrivateObjectStore {
    return new R2PrivateObjectStore(
      {
        accountId: requiredEnv("R2_ACCOUNT_ID"),
        bucketName: requiredEnv("R2_BUCKET_NAME"),
      },
      new R2AwsRequestSigner({
        accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv(
          "R2_SECRET_ACCESS_KEY",
        ),
      }),
    );
  }

  private async uploadFiles(
    actor: InternalActorContext,
    files: readonly {
      readonly filename: string;
      readonly mimeType: string;
      readonly bytes: Uint8Array;
      readonly checksumSha256: string;
    }[],
  ): Promise<readonly LegacyUploadedFile[]> {
    const store = this.objectStore();
    const uploaded: LegacyUploadedFile[] = [];
    try {
      for (const file of files) {
        const attachmentId = randomUUID();
        const storageKey =
          createPrivateAttachmentStorageKey(
            attachmentId,
          );
        const grant = await store.createUploadGrant({
          storageKey,
          mimeType: file.mimeType,
          sizeBytes: file.bytes.byteLength,
          checksumSha256: file.checksumSha256,
          expiresInSeconds: 300,
        });
        const response = await fetch(grant.url, {
          method: "PUT",
          headers: grant.requiredHeaders,
          body: Buffer.from(file.bytes),
        });
        if (!response.ok) {
          throw new Error(
            `R2 upload failed with status ${response.status}`,
          );
        }
        const inspection =
          await store.inspectObject(storageKey);
        if (
          inspection.sizeBytes !==
            file.bytes.byteLength ||
          inspection.mimeType !== file.mimeType ||
          inspection.checksumSha256.toLowerCase() !==
            file.checksumSha256.toLowerCase()
        ) {
          throw new Error(
            "R2 attachment verification failed",
          );
        }
        uploaded.push({
          attachmentId,
          storageKey,
          ...file,
        });
      }
      return uploaded;
    } catch (error) {
      await Promise.allSettled(
        uploaded.map((file) =>
          store.deleteObject(file.storageKey),
        ),
      );
      throw error;
    } finally {
      void actor;
    }
  }

  private async cleanupUploadedFiles(
    files: readonly LegacyUploadedFile[],
  ): Promise<void> {
    const store = this.objectStore();
    await Promise.allSettled(
      files.map((file) =>
        store.deleteObject(file.storageKey),
      ),
    );
  }

  private async readAttachment(
    actor: InternalActorContext,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const requestId =
      typeof body.requestId === "string"
        ? body.requestId.trim()
        : "";
    const attachmentId =
      typeof body.fileId === "string"
        ? body.fileId.trim()
        : "";
    if (!requestId || !attachmentId) {
      throw new BadRequestException(
        "Invalid leave attachment request",
      );
    }

    const request =
      await this.prisma.leaveRequest.findUnique({
        where: { id: requestId },
        select: {
          requesterEmployeeId: true,
          approvalInstance: {
            select: {
              steps: {
                where: {
                  approverEmployeeId: actor.employeeId,
                },
                select: { id: true },
                take: 1,
              },
            },
          },
          attachments: {
            where: { attachmentId },
            select: {
              attachment: {
                select: {
                  id: true,
                  storageProvider: true,
                  storageKey: true,
                  originalFilename: true,
                  mimeType: true,
                  sizeBytes: true,
                  checksumSha256: true,
                  privacyClass: true,
                  legacyDriveUrl: true,
                },
              },
            },
          },
        },
      });
    const authorized =
      request &&
      (request.requesterEmployeeId === actor.employeeId ||
        Boolean(request.approvalInstance?.steps.length));
    const attachment =
      request?.attachments[0]?.attachment;
    if (
      !authorized ||
      !attachment ||
      attachment.privacyClass !== "EMPLOYEE_PRIVATE"
    ) {
      throw new ForbiddenException(
        "Leave attachment access denied",
      );
    }

    if (
      attachment.storageProvider === "LEGACY_DRIVE" &&
      attachment.legacyDriveUrl
    ) {
      const [requestLegacy, attachmentLegacy] =
        await Promise.all([
          this.prisma.legacyRecord.findFirst({
            where: {
              sourceSystem: "APP_LEAVE_GAS",
              sourceWorkbook: "Data_CK&RR_Requests",
              sourceTab: "LeaveRequests",
              sourcePeriod: "CURRENT",
              targetEntityType: "leave_request",
              targetEntityId: requestId,
            },
            select: { legacyId: true },
          }),
          this.prisma.legacyRecord.findFirst({
            where: {
              sourceSystem: "APP_LEAVE_GAS",
              sourceWorkbook: "Data_CK&RR_Requests",
              sourceTab: "Attachments",
              sourcePeriod: "CURRENT",
              targetEntityType: "leave_attachment_reference",
              targetEntityId: attachmentId,
            },
            select: { legacyId: true },
          }),
        ]);

      if (
        !requestLegacy?.legacyId ||
        !attachmentLegacy?.legacyId
      ) {
        throw new ServiceUnavailableException(
          "Legacy leave attachment provenance is unavailable",
        );
      }

      return {
        success: true,
        legacyFallback: true,
        legacyRequestId: requestLegacy.legacyId,
        legacyFileId:
          attachmentLegacy.legacyId.split("::ROW:")[0],
      };
    }

    if (
      attachment.storageProvider !== "R2" ||
      !attachment.storageKey
    ) {
      throw new ServiceUnavailableException(
        "Leave attachment storage is unavailable",
      );
    }

    const grant =
      await this.objectStore().createDownloadGrant({
        storageKey: attachment.storageKey,
        downloadFilename:
          attachment.originalFilename,
        expiresInSeconds: 300,
      });
    const response = await fetch(grant.url, {
      headers: grant.requiredHeaders,
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        "Leave attachment is unavailable",
      );
    }
    const bytes = Buffer.from(
      await response.arrayBuffer(),
    );
    if (
      attachment.sizeBytes !== null &&
      BigInt(bytes.byteLength) !== attachment.sizeBytes
    ) {
      throw new ServiceUnavailableException(
        "Leave attachment size mismatch",
      );
    }
    if (
      attachment.checksumSha256 &&
      createHash("sha256")
        .update(bytes)
        .digest("hex") !==
        attachment.checksumSha256.toLowerCase()
    ) {
      throw new ServiceUnavailableException(
        "Leave attachment checksum mismatch",
      );
    }
    return {
      success: true,
      name:
        attachment.originalFilename ||
        attachment.id,
      type:
        attachment.mimeType ||
        "application/octet-stream",
      base64: bytes.toString("base64"),
    };
  }
}
