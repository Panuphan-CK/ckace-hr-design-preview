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
    throw new Error(`Missing required environment variable: ${name}`);
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

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isoWeekday(date: Date): number {
  const weekday = date.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

async function findSyntheticWorkDate(
  prisma: ReturnType<typeof getPrismaClient>,
): Promise<{
  readonly date: string;
  readonly createdRuleId: string | null;
}> {
  const activeRules = await prisma.weeklyWorkRule.findMany({
    where: { isWorking: true },
    select: { isoWeekday: true },
  });

  let createdRuleId: string | null = null;
  let workingDays = new Set(
    activeRules.map((rule) => rule.isoWeekday),
  );

  if (workingDays.size === 0) {
    const usedRules = await prisma.weeklyWorkRule.findMany({
      select: { isoWeekday: true },
    });
    const used = new Set(
      usedRules.map((rule) => rule.isoWeekday),
    );
    const available = [1, 2, 3, 4, 5, 6, 7].find(
      (day) => !used.has(day),
    );

    if (!available) {
      throw new Error(
        "No working-day policy is available for hosted leave smoke",
      );
    }

    const created = await prisma.weeklyWorkRule.create({
      data: {
        isoWeekday: available,
        isWorking: true,
      },
    });
    createdRuleId = created.id;
    workingDays = new Set([available]);
  }

  for (let offset = 1; offset <= 60; offset += 1) {
    const candidate = new Date(
      Date.UTC(2035, 0, 1 + offset),
    );

    if (!workingDays.has(isoWeekday(candidate))) {
      continue;
    }

    const holiday = await prisma.holiday.findUnique({
      where: { holidayDate: candidate },
      select: { id: true },
    });

    if (!holiday) {
      return {
        date: dateOnly(candidate),
        createdRuleId,
      };
    }
  }

  throw new Error(
    "Could not find a non-holiday working date for hosted leave smoke",
  );
}

async function main(): Promise<void> {
  const prisma = getPrismaClient();
  const secret = requireEnv("CKACE_LEGACY_BRIDGE_SECRET");
  const targetUrl = requireEnv("CKACE_LEAVE_SMOKE_TARGET_URL")
    .replace(/\/$/, "");
  const marker = randomUUID().replace(/-/g, "");
  const correlationId = `m7-leave-e2e-${marker}`;

  let agencyId: string | null = null;
  let departmentId: string | null = null;
  let requesterEmployeeId: string | null = null;
  let approverEmployeeId: string | null = null;
  let requesterAccountId: string | null = null;
  let approverAccountId: string | null = null;
  let roleId: string | null = null;
  let leaveTypeId: string | null = null;
  let entitlementId: string | null = null;
  let policyId: string | null = null;
  let createdRuleId: string | null = null;
  let requestId: string | null = null;

  try {
    const work = await findSyntheticWorkDate(prisma);
    createdRuleId = work.createdRuleId;

    const agency = await prisma.agency.create({
      data: { name: `M7 Leave E2E Agency ${marker}` },
    });
    agencyId = agency.id;

    const department = await prisma.department.create({
      data: { name: `M7 Leave E2E Department ${marker}` },
    });
    departmentId = department.id;

    const requester = await prisma.employee.create({
      data: {
        fullName: "M7 Leave E2E Requester",
        agencyId,
        departmentId,
      },
    });
    requesterEmployeeId = requester.id;

    const approver = await prisma.employee.create({
      data: {
        fullName: "M7 Leave E2E Approver",
        agencyId,
        departmentId,
      },
    });
    approverEmployeeId = approver.id;

    const requesterLogin =
      `m7-leave-requester-${marker}@example.invalid`;
    const requesterAccount = await prisma.userAccount.create({
      data: {
        employeeId: requesterEmployeeId,
        loginName: requesterLogin,
        normalizedLogin: requesterLogin.toLowerCase(),
        state: "ACTIVE",
      },
    });
    requesterAccountId = requesterAccount.id;

    const approverLogin =
      `m7-leave-approver-${marker}@example.invalid`;
    const approverAccount = await prisma.userAccount.create({
      data: {
        employeeId: approverEmployeeId,
        loginName: approverLogin,
        normalizedLogin: approverLogin.toLowerCase(),
        state: "ACTIVE",
      },
    });
    approverAccountId = approverAccount.id;

    const role = await prisma.role.create({
      data: {
        key: `M7_LEAVE_APPROVER_${marker}`,
        name: "M7 Leave E2E Approver",
      },
    });
    roleId = role.id;

    await prisma.userRole.create({
      data: {
        userAccountId: approverAccountId,
        roleId,
      },
    });

    const leaveType = await prisma.leaveType.create({
      data: {
        key: `M7_ANNUAL_${marker}`.toUpperCase(),
        name: "M7 Annual Leave",
      },
    });
    leaveTypeId = leaveType.id;

    const entitlement = await prisma.leaveEntitlement.create({
      data: {
        employeeId: requesterEmployeeId,
        leaveTypeId,
        quota: 5,
      },
    });
    entitlementId = entitlement.id;

    const policy = await prisma.approvalPolicy.create({
      data: {
        agencyId,
        requestKind: "LEAVE",
        name: `M7 Leave E2E Policy ${marker}`,
        steps: {
          create: [
            {
              stepOrder: 1,
              requiredRoleId: roleId,
              scope: "SAME_AGENCY",
            },
          ],
        },
      },
    });
    policyId = policy.id;

    const actor: InternalActorContext = {
      employeeId: requesterEmployeeId,
      legacyUid: `M7-LEAVE-${marker}`,
      roles: ["EMPLOYEE"],
      permissions: [
        "leave.self.read",
        "leave.self.write",
      ],
      agencyId,
      departmentId,
      authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
      correlationId,
    };
    const authHeader = {
      "x-ckace-bridge-envelope": encodeEnvelope(
        signActorEnvelope(actor, secret, {
          ttlMs: 120_000,
        }),
      ),
      "content-type": "application/json",
      "x-ckace-role": "SUPERADMIN",
      "x-ckace-employee-id": "forged-other-employee",
    };

    const optionsResponse = await fetch(
      `${targetUrl}/api/leave/approval-options`,
      { headers: authHeader },
    );

    if (optionsResponse.status !== 200) {
      throw new Error(
        `Hosted leave approval options returned HTTP ${optionsResponse.status}`,
      );
    }

    const options = await optionsResponse.json() as Array<{
      stepOrder: number;
      candidates: Array<{ employeeId: string }>;
    }>;

    if (
      options.length !== 1 ||
      options[0]?.stepOrder !== 1 ||
      !options[0].candidates.some(
        (candidate) =>
          candidate.employeeId === approverEmployeeId,
      )
    ) {
      throw new Error(
        "Hosted leave approval options did not enforce expected server policy",
      );
    }

    const clientKey = `leave-${marker}`;
    const body = {
      clientKey,
      entitlementId,
      description: "Synthetic hosted leave E2E",
      startDate: work.date,
      endDate: work.date,
      durationCode: "FULL_DAY",
      approverEmployeeIds: [approverEmployeeId],
      employeeId: "forged-other-employee",
      role: "SUPERADMIN",
    };

    const createResponse = await fetch(
      `${targetUrl}/api/leave/requests`,
      {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify(body),
      },
    );

    if (createResponse.status !== 201) {
      throw new Error(
        `Hosted leave create returned HTTP ${createResponse.status}`,
      );
    }

    const created = await createResponse.json() as {
      requestId: string;
      replayed: boolean;
    };
    requestId = created.requestId;

    if (created.replayed) {
      throw new Error(
        "First hosted leave create unexpectedly replayed",
      );
    }

    const persisted = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      select: {
        requesterEmployeeId: true,
        entitlementId: true,
        status: true,
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
      persisted.requesterEmployeeId !== requesterEmployeeId ||
      persisted.entitlementId !== entitlementId ||
      persisted.status !== "PENDING" ||
      persisted.approvalInstance?.steps[0]?.approverEmployeeId !==
        approverEmployeeId
    ) {
      throw new Error(
        "Hosted leave create persisted unexpected authority or relationship",
      );
    }

    const replayResponse = await fetch(
      `${targetUrl}/api/leave/requests`,
      {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify(body),
      },
    );
    const replay = await replayResponse.json() as {
      requestId: string;
      replayed: boolean;
    };

    if (
      replayResponse.status !== 201 ||
      replay.requestId !== requestId ||
      !replay.replayed
    ) {
      throw new Error(
        "Hosted leave idempotent replay contract failed",
      );
    }

    const conflictResponse = await fetch(
      `${targetUrl}/api/leave/requests`,
      {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          ...body,
          description: "Changed payload for same client key",
        }),
      },
    );

    if (conflictResponse.status !== 409) {
      throw new Error(
        `Changed-payload idempotency conflict returned HTTP ${conflictResponse.status}`,
      );
    }

    const overviewResponse = await fetch(
      `${targetUrl}/api/leave/me`,
      { headers: authHeader },
    );
    const overview = await overviewResponse.json() as {
      entitlements: Array<{ entitlementId: string }>;
      requests: Array<{ requestId: string }>;
    };

    if (
      overviewResponse.status !== 200 ||
      !overview.entitlements.some(
        (entry) => entry.entitlementId === entitlementId,
      ) ||
      !overview.requests.some(
        (entry) => entry.requestId === requestId,
      )
    ) {
      throw new Error(
        "Hosted leave self overview did not return actor-owned data",
      );
    }

    const cancelResponse = await fetch(
      `${targetUrl}/api/leave/requests/${requestId}/cancel`,
      {
        method: "POST",
        headers: authHeader,
      },
    );
    const cancelled = await cancelResponse.json() as {
      requestId: string;
      status: string;
    };

    if (
      cancelResponse.status !== 201 ||
      cancelled.requestId !== requestId ||
      cancelled.status !== "CANCELLED"
    ) {
      throw new Error(
        "Hosted leave cancellation contract failed",
      );
    }

    const rowAfterCancel =
      await prisma.leaveRequest.findUnique({
        where: { id: requestId },
        select: { status: true },
      });

    if (rowAfterCancel?.status !== "CANCELLED") {
      throw new Error(
        "Hosted leave cancellation did not persist CANCELLED state",
      );
    }

    process.stdout.write(
      "M7_LEAVE_E2E_PASS options=200 create=201 replay=201 conflict=409 overview=200 cancel=201 forged_headers_ignored=1\n",
    );
  } finally {
    if (requestId) {
      await prisma.notificationOutbox.deleteMany({
        where: {
          aggregateType: "LEAVE_REQUEST",
          aggregateId: requestId,
        },
      });
      await prisma.auditLog.deleteMany({
        where: {
          entityType: "LeaveRequest",
          entityId: requestId,
        },
      });
      await prisma.leaveRequest.deleteMany({
        where: { id: requestId },
      });
    }

    if (policyId) {
      await prisma.approvalInstance.deleteMany({
        where: { policyId },
      });
      await prisma.approvalPolicy.deleteMany({
        where: { id: policyId },
      });
    }

    if (requesterEmployeeId) {
      await prisma.idempotencyKey.deleteMany({
        where: { actorEmployeeId: requesterEmployeeId },
      });
    }

    if (entitlementId) {
      await prisma.leaveEntitlement.deleteMany({
        where: { id: entitlementId },
      });
    }

    if (leaveTypeId) {
      await prisma.leaveType.deleteMany({
        where: { id: leaveTypeId },
      });
    }

    if (approverAccountId && roleId) {
      await prisma.userRole.deleteMany({
        where: {
          userAccountId: approverAccountId,
          roleId,
        },
      });
    }

    if (roleId) {
      await prisma.role.deleteMany({
        where: { id: roleId },
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
    if (agencyId) {
      await prisma.agency.deleteMany({
        where: { id: agencyId },
      });
    }
    if (departmentId) {
      await prisma.department.deleteMany({
        where: { id: departmentId },
      });
    }
    if (createdRuleId) {
      await prisma.weeklyWorkRule.deleteMany({
        where: { id: createdRuleId },
      });
    }

    if (requesterEmployeeId) {
      const remaining = await prisma.employee.findUnique({
        where: { id: requesterEmployeeId },
        select: { id: true },
      });

      if (remaining) {
        throw new Error(
          "Synthetic hosted leave E2E cleanup failed",
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
        : "Unknown hosted leave E2E error";

    process.stderr.write(
      `M7_LEAVE_E2E_FAIL ${message}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
