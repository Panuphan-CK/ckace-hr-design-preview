import { randomUUID } from "node:crypto";

import {
  signActorEnvelope,
  type InternalActorContext,
} from "@ckace/auth";
import {
  disconnectPrismaClient,
  getPrismaClient,
} from "@ckace/database";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

function encodeEnvelope(
  envelope: ReturnType<typeof signActorEnvelope>,
): string {
  return Buffer.from(
    JSON.stringify(envelope),
    "utf8",
  ).toString("base64url");
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
      "Unable to derive Bangkok date for OT smoke",
    );
  }

  return `${year}-${month}-${day}`;
}

function isoWeekday(dateKey: string): number {
  const weekday = new Date(
    `${dateKey}T00:00:00.000Z`,
  ).getUTCDay();

  return weekday === 0 ? 7 : weekday;
}

async function main(): Promise<void> {
  const prisma = getPrismaClient();
  const secret = requireEnv(
    "CKACE_LEGACY_BRIDGE_SECRET",
  );
  const targetUrl = requireEnv(
    "CKACE_OVERTIME_SMOKE_TARGET_URL",
  ).replace(/\/$/, "");
  const marker = randomUUID().replace(/-/g, "");
  const today = bangkokDateKey(new Date());

  let agencyId: string | null = null;
  let departmentId: string | null = null;
  let requesterEmployeeId: string | null = null;
  let approverEmployeeId: string | null = null;
  let requesterAccountId: string | null = null;
  let approverAccountId: string | null = null;
  let approverRoleId: string | null = null;
  let policyId: string | null = null;
  let createdWeeklyRuleId: string | null = null;
  const requestIds: string[] = [];
  const approvalInstanceIds: string[] = [];

  try {
    const agency = await prisma.agency.create({
      data: {
        name: `M7 OT E2E Agency ${marker}`,
      },
    });
    agencyId = agency.id;

    const department =
      await prisma.department.create({
        data: {
          name: `M7 OT E2E Department ${marker}`,
        },
      });
    departmentId = department.id;

    const requester = await prisma.employee.create({
      data: {
        fullName: "M7 OT E2E Requester",
        agencyId,
        departmentId,
      },
    });
    requesterEmployeeId = requester.id;

    const approver = await prisma.employee.create({
      data: {
        fullName: "M7 OT E2E Approver",
        agencyId,
        departmentId,
      },
    });
    approverEmployeeId = approver.id;

    const requesterLogin =
      `m7-ot-requester-${marker}@example.invalid`;
    const requesterAccount =
      await prisma.userAccount.create({
        data: {
          employeeId: requesterEmployeeId,
          loginName: requesterLogin,
          normalizedLogin:
            requesterLogin.toLowerCase(),
          state: "ACTIVE",
        },
      });
    requesterAccountId = requesterAccount.id;

    const approverLogin =
      `m7-ot-approver-${marker}@example.invalid`;
    const approverAccount =
      await prisma.userAccount.create({
        data: {
          employeeId: approverEmployeeId,
          loginName: approverLogin,
          normalizedLogin:
            approverLogin.toLowerCase(),
          state: "ACTIVE",
        },
      });
    approverAccountId = approverAccount.id;

    const role = await prisma.role.create({
      data: {
        key: `M7_OT_APPROVER_${marker}`.toUpperCase(),
        name: "M7 OT E2E Approver",
      },
    });
    approverRoleId = role.id;

    await prisma.userRole.create({
      data: {
        userAccountId: approverAccountId,
        roleId: approverRoleId,
      },
    });

    const policy =
      await prisma.approvalPolicy.create({
        data: {
          agencyId,
          requestKind: "OVERTIME",
          name: `M7 OT E2E Policy ${marker}`,
          steps: {
            create: {
              stepOrder: 1,
              requiredRoleId: approverRoleId,
              scope: "SAME_AGENCY",
            },
          },
        },
      });
    policyId = policy.id;

    const weekday = isoWeekday(today);
    const weeklyRule =
      await prisma.weeklyWorkRule.findUnique({
        where: { isoWeekday: weekday },
        select: { id: true },
      });

    if (!weeklyRule) {
      const created =
        await prisma.weeklyWorkRule.create({
          data: {
            isoWeekday: weekday,
            isWorking: true,
          },
        });
      createdWeeklyRuleId = created.id;
    }

    const requesterActor: InternalActorContext = {
      employeeId: requesterEmployeeId,
      legacyUid: `M7-OT-${marker}`,
      roles: ["EMPLOYEE"],
      permissions: [
        "overtime.self.read",
        "overtime.self.write",
      ],
      agencyId,
      departmentId,
      authenticatedBy:
        "LEGACY_DESKTOP_BRIDGE",
      correlationId:
        `m7-ot-e2e-${marker}`,
    };
    const approverActor: InternalActorContext = {
      employeeId: approverEmployeeId,
      legacyUid:
        `M7-OT-APPROVER-${marker}`,
      roles: ["SUPERUSER"],
      permissions: ["overtime.approve"],
      agencyId,
      departmentId,
      authenticatedBy:
        "LEGACY_DESKTOP_BRIDGE",
      correlationId:
        `m7-ot-e2e-approver-${marker}`,
    };

    const requesterHeaders = {
      "x-ckace-bridge-envelope":
        encodeEnvelope(
          signActorEnvelope(
            requesterActor,
            secret,
            { ttlMs: 120_000 },
          ),
        ),
      "content-type": "application/json",
      "x-ckace-role": "SUPERADMIN",
      "x-ckace-employee-id":
        "forged-other-employee",
    };
    const approverHeaders = {
      "x-ckace-bridge-envelope":
        encodeEnvelope(
          signActorEnvelope(
            approverActor,
            secret,
            { ttlMs: 120_000 },
          ),
        ),
      "content-type": "application/json",
      "x-ckace-role": "EMPLOYEE",
      "x-ckace-employee-id":
        "forged-requester",
    };

    const createBody = {
      startDate: today,
      endDate: today,
      startTime: "13:00",
      endTime: "14:00",
      reason: "Synthetic hosted OT E2E",
      clientKey: `ot-${marker}`,
      employeeId: approverEmployeeId,
      approverId: approverEmployeeId,
      role: "SUPERADMIN",
    };

    const createResponse = await fetch(
      `${targetUrl}/api/overtime/requests`,
      {
        method: "POST",
        headers: requesterHeaders,
        body: JSON.stringify(createBody),
      },
    );
    const created =
      await createResponse.json() as {
        requests: Array<{
          id: string;
          employeeId: string;
          status: string;
          segments: Array<{
            attendanceRecordId: string | null;
          }>;
        }>;
        replayed: boolean;
      };

    if (
      createResponse.status !== 201 ||
      created.replayed ||
      created.requests.length !== 1
    ) {
      throw new Error(
        `Hosted OT create returned HTTP ${createResponse.status}`,
      );
    }

    const firstRequest = created.requests[0];

    if (
      !firstRequest ||
      firstRequest.employeeId !==
        requesterEmployeeId ||
      firstRequest.status !== "PENDING" ||
      firstRequest.segments[0]
        ?.attendanceRecordId !== null
    ) {
      throw new Error(
        "Hosted OT create persisted unexpected authority or segment linkage",
      );
    }

    requestIds.push(firstRequest.id);

    const persisted =
      await prisma.overtimeRequest.findUnique({
        where: { id: firstRequest.id },
        select: {
          employeeId: true,
          approvalInstanceId: true,
          approvalInstance: {
            select: {
              steps: {
                select: {
                  approverEmployeeId: true,
                },
              },
            },
          },
        },
      });

    if (
      !persisted ||
      persisted.employeeId !==
        requesterEmployeeId ||
      persisted.approvalInstance?.steps[0]
        ?.approverEmployeeId !==
        approverEmployeeId
    ) {
      throw new Error(
        "Hosted OT persisted forged authority or unexpected approver",
      );
    }

    if (persisted.approvalInstanceId) {
      approvalInstanceIds.push(
        persisted.approvalInstanceId,
      );
    }

    const replayResponse = await fetch(
      `${targetUrl}/api/overtime/requests`,
      {
        method: "POST",
        headers: requesterHeaders,
        body: JSON.stringify(createBody),
      },
    );
    const replay =
      await replayResponse.json() as {
        requests: Array<{ id: string }>;
        replayed: boolean;
      };

    if (
      replayResponse.status !== 201 ||
      !replay.replayed ||
      replay.requests[0]?.id !==
        firstRequest.id
    ) {
      throw new Error(
        "Hosted OT idempotent replay failed",
      );
    }

    const conflictResponse = await fetch(
      `${targetUrl}/api/overtime/requests`,
      {
        method: "POST",
        headers: requesterHeaders,
        body: JSON.stringify({
          ...createBody,
          reason:
            "Changed payload with same client key",
        }),
      },
    );

    if (conflictResponse.status !== 409) {
      throw new Error(
        `Hosted OT idempotency conflict returned HTTP ${conflictResponse.status}`,
      );
    }

    const overviewResponse = await fetch(
      `${targetUrl}/api/overtime/me`,
      { headers: requesterHeaders },
    );
    const overview =
      await overviewResponse.json() as {
        requests: Array<{ id: string }>;
      };

    if (
      overviewResponse.status !== 200 ||
      !overview.requests.some(
        (entry) =>
          entry.id === firstRequest.id,
      )
    ) {
      throw new Error(
        "Hosted OT self overview did not return actor-owned request",
      );
    }

    const assignedResponse = await fetch(
      `${targetUrl}/api/overtime/assigned`,
      { headers: approverHeaders },
    );
    const assigned =
      await assignedResponse.json() as Array<{
        id: string;
      }>;

    if (
      assignedResponse.status !== 200 ||
      !assigned.some(
        (entry) =>
          entry.id === firstRequest.id,
      )
    ) {
      throw new Error(
        "Hosted OT assigned queue did not return assigned request",
      );
    }

    const decisionResponse = await fetch(
      `${targetUrl}/api/overtime/requests/${firstRequest.id}/decision`,
      {
        method: "POST",
        headers: approverHeaders,
        body: JSON.stringify({
          decision: "APPROVED",
          comment: "Synthetic hosted E2E approval",
          employeeId: requesterEmployeeId,
          approverId: requesterEmployeeId,
        }),
      },
    );
    const decision =
      await decisionResponse.json() as {
        request: {
          id: string;
          status: string;
        };
        completed: boolean;
      };

    if (
      decisionResponse.status !== 201 ||
      decision.request.id !==
        firstRequest.id ||
      decision.request.status !== "APPROVED" ||
      !decision.completed
    ) {
      throw new Error(
        `Hosted OT decision returned HTTP ${decisionResponse.status}`,
      );
    }

    const cancelBody = {
      ...createBody,
      startTime: "14:00",
      endTime: "15:00",
      clientKey: `ot-cancel-${marker}`,
      reason: "Synthetic hosted OT cancel E2E",
    };
    const cancelCreateResponse = await fetch(
      `${targetUrl}/api/overtime/requests`,
      {
        method: "POST",
        headers: requesterHeaders,
        body: JSON.stringify(cancelBody),
      },
    );
    const cancelCreated =
      await cancelCreateResponse.json() as {
        requests: Array<{ id: string }>;
        replayed: boolean;
      };
    const cancelRequestId =
      cancelCreated.requests[0]?.id;

    if (
      cancelCreateResponse.status !== 201 ||
      cancelCreated.replayed ||
      !cancelRequestId
    ) {
      throw new Error(
        "Hosted OT cancel setup create failed",
      );
    }
    requestIds.push(cancelRequestId);

    const cancelPersisted =
      await prisma.overtimeRequest.findUnique({
        where: { id: cancelRequestId },
        select: {
          approvalInstanceId: true,
        },
      });

    if (cancelPersisted?.approvalInstanceId) {
      approvalInstanceIds.push(
        cancelPersisted.approvalInstanceId,
      );
    }

    const cancelResponse = await fetch(
      `${targetUrl}/api/overtime/requests/${cancelRequestId}/cancel`,
      {
        method: "POST",
        headers: requesterHeaders,
      },
    );
    const cancelled =
      await cancelResponse.json() as {
        requestId: string;
        status: string;
      };

    if (
      cancelResponse.status !== 201 ||
      cancelled.requestId !==
        cancelRequestId ||
      cancelled.status !== "CANCELLED"
    ) {
      throw new Error(
        `Hosted OT cancel returned HTTP ${cancelResponse.status}`,
      );
    }

    const finalRows = await prisma.overtimeRequest.findMany({
      where: {
        id: { in: requestIds },
      },
      select: {
        id: true,
        employeeId: true,
        status: true,
      },
    });

    if (
      finalRows.length !== 2 ||
      finalRows.some(
        (row) =>
          row.employeeId !==
          requesterEmployeeId,
      ) ||
      !finalRows.some(
        (row) =>
          row.id === firstRequest.id &&
          row.status === "APPROVED",
      ) ||
      !finalRows.some(
        (row) =>
          row.id === cancelRequestId &&
          row.status === "CANCELLED",
      )
    ) {
      throw new Error(
        "Hosted OT final canonical state is unexpected",
      );
    }

    process.stdout.write(
      "M7_OVERTIME_E2E_PASS create=201 replay=201 conflict=409 overview=200 assigned=200 decision=201 cancel_create=201 cancel=201 forged_headers_ignored=1\n",
    );
  } finally {
    if (requestIds.length > 0) {
      await prisma.notificationOutbox.deleteMany({
        where: {
          aggregateType: "OVERTIME_REQUEST",
          aggregateId: { in: requestIds },
        },
      });
      await prisma.auditLog.deleteMany({
        where: {
          entityType: "OvertimeRequest",
          entityId: { in: requestIds },
        },
      });
      await prisma.overtimeRequest.deleteMany({
        where: {
          id: { in: requestIds },
        },
      });
    }

    if (approvalInstanceIds.length > 0) {
      await prisma.approvalInstance.deleteMany({
        where: {
          id: {
            in: approvalInstanceIds,
          },
        },
      });
    }

    if (requesterEmployeeId) {
      await prisma.idempotencyKey.deleteMany({
        where: {
          actorEmployeeId:
            requesterEmployeeId,
        },
      });
    }

    if (policyId) {
      await prisma.approvalPolicy.deleteMany({
        where: { id: policyId },
      });
    }

    if (
      approverAccountId &&
      approverRoleId
    ) {
      await prisma.userRole.deleteMany({
        where: {
          userAccountId:
            approverAccountId,
          roleId: approverRoleId,
        },
      });
    }

    if (requesterAccountId) {
      await prisma.userAccount.deleteMany({
        where: { id: requesterAccountId },
      });
    }
    if (approverAccountId) {
      await prisma.userAccount.deleteMany({
        where: { id: approverAccountId },
      });
    }

    if (requesterEmployeeId) {
      await prisma.employee.deleteMany({
        where: { id: requesterEmployeeId },
      });
    }
    if (approverEmployeeId) {
      await prisma.employee.deleteMany({
        where: { id: approverEmployeeId },
      });
    }

    if (approverRoleId) {
      await prisma.role.deleteMany({
        where: { id: approverRoleId },
      });
    }

    if (createdWeeklyRuleId) {
      await prisma.weeklyWorkRule.deleteMany({
        where: {
          id: createdWeeklyRuleId,
        },
      });
    }

    if (departmentId) {
      await prisma.department.deleteMany({
        where: { id: departmentId },
      });
    }
    if (agencyId) {
      await prisma.agency.deleteMany({
        where: { id: agencyId },
      });
    }

    if (requesterEmployeeId) {
      const remaining =
        await prisma.employee.findUnique({
          where: {
            id: requesterEmployeeId,
          },
          select: { id: true },
        });

      if (remaining) {
        throw new Error(
          "Synthetic hosted OT E2E cleanup failed",
        );
      }
    }
  }
}

void main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown hosted OT E2E error";

    process.stderr.write(
      `M7_OVERTIME_E2E_FAIL ${message}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
