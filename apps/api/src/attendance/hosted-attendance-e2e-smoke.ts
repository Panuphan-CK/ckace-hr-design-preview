import { randomUUID } from "node:crypto";

import {
  signActorEnvelope,
  type InternalActorContext,
} from "@ckace/auth";
import {
  attendanceBusinessParts,
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

function dateValue(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function bangkokTimestamp(
  dateKey: string,
  clock: string,
): Date {
  return new Date(`${dateKey}T${clock}:00+07:00`);
}

function clockToMinutes(clock: string): number {
  const [hourText, minuteText] = clock.split(":");
  return Number(hourText) * 60 + Number(minuteText);
}

function minutesToClock(minutes: number): string {
  const bounded = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hour = Math.floor(bounded / 60);
  const minute = bounded % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isoWeekday(dateKey: string): number {
  const weekday = dateValue(dateKey).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

async function main(): Promise<void> {
  const prisma = getPrismaClient();
  const secret = requireEnv("CKACE_LEGACY_BRIDGE_SECRET");
  const targetUrl = requireEnv("CKACE_ATTENDANCE_SMOKE_TARGET_URL")
    .replace(/\/$/, "");
  const marker = randomUUID().replace(/-/g, "");
  const correlationId = `m7-attendance-e2e-${marker}`;
  const now = new Date();
  const business = attendanceBusinessParts(now);
  const workDate = dateValue(business.dateKey);

  let agencyId: string | null = null;
  let departmentId: string | null = null;
  let requesterEmployeeId: string | null = null;
  let approverEmployeeId: string | null = null;
  let requesterAccountId: string | null = null;
  let approverAccountId: string | null = null;
  let employeeRoleId: string | null = null;
  let superuserRoleId: string | null = null;
  let createdEmployeeRole = false;
  let createdSuperuserRole = false;
  let createdWeeklyRuleId: string | null = null;
  let createdAttendancePolicyId: string | null = null;
  let overtimeRequestId: string | null = null;
  let attendanceRecordId: string | null = null;
  let correctionRequestId: string | null = null;
  let correctionApprovalInstanceId: string | null = null;

  try {
    const agency = await prisma.agency.create({
      data: { name: `M7 Attendance E2E Agency ${marker}` },
    });
    agencyId = agency.id;

    const department = await prisma.department.create({
      data: { name: `M7 Attendance E2E Department ${marker}` },
    });
    departmentId = department.id;

    const requester = await prisma.employee.create({
      data: {
        fullName: "M7 Attendance E2E Requester",
        agencyId,
        departmentId,
      },
    });
    requesterEmployeeId = requester.id;

    const approver = await prisma.employee.create({
      data: {
        fullName: "M7 Attendance E2E Approver",
        agencyId,
        departmentId,
      },
    });
    approverEmployeeId = approver.id;

    const requesterLogin =
      `m7-attendance-requester-${marker}@example.invalid`;
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
      `m7-attendance-approver-${marker}@example.invalid`;
    const approverAccount = await prisma.userAccount.create({
      data: {
        employeeId: approverEmployeeId,
        loginName: approverLogin,
        normalizedLogin: approverLogin.toLowerCase(),
        state: "ACTIVE",
      },
    });
    approverAccountId = approverAccount.id;

    const existingEmployeeRole = await prisma.role.findUnique({
      where: { key: "EMPLOYEE" },
      select: { id: true },
    });
    if (existingEmployeeRole) {
      employeeRoleId = existingEmployeeRole.id;
    } else {
      const role = await prisma.role.create({
        data: { key: "EMPLOYEE", name: "Employee" },
      });
      employeeRoleId = role.id;
      createdEmployeeRole = true;
    }

    const existingSuperuserRole = await prisma.role.findUnique({
      where: { key: "SUPERUSER" },
      select: { id: true },
    });
    if (existingSuperuserRole) {
      superuserRoleId = existingSuperuserRole.id;
    } else {
      const role = await prisma.role.create({
        data: { key: "SUPERUSER", name: "SuperUser" },
      });
      superuserRoleId = role.id;
      createdSuperuserRole = true;
    }

    await prisma.userRole.createMany({
      data: [
        {
          userAccountId: requesterAccountId,
          roleId: employeeRoleId,
        },
        {
          userAccountId: approverAccountId,
          roleId: superuserRoleId,
        },
      ],
    });

    const weekday = isoWeekday(business.dateKey);
    const weeklyRule = await prisma.weeklyWorkRule.findUnique({
      where: { isoWeekday: weekday },
      select: { id: true },
    });

    if (!weeklyRule) {
      const created = await prisma.weeklyWorkRule.create({
        data: {
          isoWeekday: weekday,
          isWorking: false,
        },
      });
      createdWeeklyRuleId = created.id;
    }

    let policy = await prisma.attendancePolicy.findFirst({
      where: {
        active: true,
        effectiveFrom: { lte: workDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: workDate } },
        ],
      },
      select: {
        id: true,
        officeLatitude: true,
        officeLongitude: true,
      },
      orderBy: [
        { effectiveFrom: "desc" },
        { id: "asc" },
      ],
    });

    if (!policy) {
      policy = await prisma.attendancePolicy.create({
        data: {
          name: `M7 Attendance E2E Policy ${marker}`,
          timezone: "Asia/Bangkok",
          officeLatitude: 13.7563,
          officeLongitude: 100.5018,
          radiusKm: 5,
          lateAfter: new Date("1970-01-01T09:05:00.000Z"),
          workStart: new Date("1970-01-01T09:00:00.000Z"),
          workEnd: new Date("1970-01-01T17:30:00.000Z"),
          breakStart: new Date("1970-01-01T12:00:00.000Z"),
          breakEnd: new Date("1970-01-01T13:00:00.000Z"),
          effectiveFrom: workDate,
          active: true,
        },
        select: {
          id: true,
          officeLatitude: true,
          officeLongitude: true,
        },
      });
      createdAttendancePolicyId = policy.id;
    }

    const overtime = await prisma.overtimeRequest.create({
      data: {
        employeeId: requesterEmployeeId,
        reason: "Synthetic hosted attendance E2E",
        status: "APPROVED",
        segments: {
          create: {
            workDate,
            startTime: new Date("1970-01-01T17:30:00.000Z"),
            endTime: new Date("1970-01-01T18:30:00.000Z"),
            requestedMinutes: 60,
          },
        },
      },
      select: { id: true },
    });
    overtimeRequestId = overtime.id;

    const requesterActor: InternalActorContext = {
      employeeId: requesterEmployeeId,
      legacyUid: `M7-ATTENDANCE-${marker}`,
      roles: ["EMPLOYEE"],
      permissions: [
        "attendance.self.read",
        "attendance.self.write",
        "time_correction.self.read",
        "time_correction.self.write",
      ],
      agencyId,
      departmentId,
      authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
      correlationId,
    };
    const approverActor: InternalActorContext = {
      employeeId: approverEmployeeId,
      legacyUid: `M7-ATTENDANCE-APPROVER-${marker}`,
      roles: ["SUPERUSER"],
      permissions: ["time_correction.approve"],
      agencyId,
      departmentId,
      authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
      correlationId: `${correlationId}-approver`,
    };

    const requesterHeaders = {
      "x-ckace-bridge-envelope": encodeEnvelope(
        signActorEnvelope(requesterActor, secret, {
          ttlMs: 120_000,
        }),
      ),
      "content-type": "application/json",
      "x-ckace-role": "SUPERADMIN",
      "x-ckace-employee-id": "forged-other-employee",
    };
    const approverHeaders = {
      "x-ckace-bridge-envelope": encodeEnvelope(
        signActorEnvelope(approverActor, secret, {
          ttlMs: 120_000,
        }),
      ),
      "content-type": "application/json",
      "x-ckace-role": "EMPLOYEE",
      "x-ckace-employee-id": "forged-requester",
    };

    const latitude = policy.officeLatitude.toNumber();
    const longitude = policy.officeLongitude.toNumber();
    const checkInBody = {
      clientKey: `attendance-checkin-${marker}`,
      latitude,
      longitude,
      accuracyMeters: 5,
      employeeId: "forged-other-employee",
      role: "SUPERADMIN",
    };

    const checkInResponse = await fetch(
      `${targetUrl}/api/attendance/check-in`,
      {
        method: "POST",
        headers: requesterHeaders,
        body: JSON.stringify(checkInBody),
      },
    );
    const checkedIn = await checkInResponse.json() as {
      attendanceRecordId: string;
      replayed: boolean;
    };

    if (checkInResponse.status !== 201 || checkedIn.replayed) {
      throw new Error(
        `Hosted attendance check-in returned HTTP ${checkInResponse.status}`,
      );
    }
    attendanceRecordId = checkedIn.attendanceRecordId;

    const persisted = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceRecordId },
      select: { employeeId: true, workDate: true },
    });

    if (
      !persisted ||
      persisted.employeeId !== requesterEmployeeId ||
      persisted.workDate.toISOString().slice(0, 10) !==
        business.dateKey
    ) {
      throw new Error(
        "Hosted attendance check-in persisted forged or unexpected authority",
      );
    }

    const replayResponse = await fetch(
      `${targetUrl}/api/attendance/check-in`,
      {
        method: "POST",
        headers: requesterHeaders,
        body: JSON.stringify(checkInBody),
      },
    );
    const replay = await replayResponse.json() as {
      attendanceRecordId: string;
      replayed: boolean;
    };

    if (
      replayResponse.status !== 201 ||
      replay.attendanceRecordId !== attendanceRecordId ||
      !replay.replayed
    ) {
      throw new Error(
        "Hosted attendance check-in idempotent replay failed",
      );
    }

    const conflictResponse = await fetch(
      `${targetUrl}/api/attendance/check-in`,
      {
        method: "POST",
        headers: requesterHeaders,
        body: JSON.stringify({
          ...checkInBody,
          accuracyMeters: 6,
        }),
      },
    );

    if (conflictResponse.status !== 409) {
      throw new Error(
        `Attendance changed-payload idempotency conflict returned HTTP ${conflictResponse.status}`,
      );
    }

    const currentMinutes = clockToMinutes(business.time);
    const adjustedCheckInMinutes = Math.max(
      0,
      currentMinutes - 60,
    );
    const adjustedCheckInClock =
      minutesToClock(adjustedCheckInMinutes);

    await prisma.attendanceRecord.update({
      where: { id: attendanceRecordId },
      data: {
        checkInAt: bangkokTimestamp(
          business.dateKey,
          adjustedCheckInClock,
        ),
      },
    });

    const checkOutBody = {
      clientKey: `attendance-checkout-${marker}`,
      attendanceRecordId,
      latitude,
      longitude,
      accuracyMeters: 5,
      employeeId: "forged-other-employee",
    };
    const checkOutResponse = await fetch(
      `${targetUrl}/api/attendance/check-out`,
      {
        method: "POST",
        headers: requesterHeaders,
        body: JSON.stringify(checkOutBody),
      },
    );

    if (checkOutResponse.status !== 201) {
      throw new Error(
        `Hosted attendance check-out returned HTTP ${checkOutResponse.status}`,
      );
    }

    const checkoutReplayResponse = await fetch(
      `${targetUrl}/api/attendance/check-out`,
      {
        method: "POST",
        headers: requesterHeaders,
        body: JSON.stringify(checkOutBody),
      },
    );
    const checkoutReplay =
      await checkoutReplayResponse.json() as {
        attendanceRecordId: string;
        replayed: boolean;
      };

    if (
      checkoutReplayResponse.status !== 201 ||
      checkoutReplay.attendanceRecordId !== attendanceRecordId ||
      !checkoutReplay.replayed
    ) {
      throw new Error(
        "Hosted attendance check-out idempotent replay failed",
      );
    }

    const overviewResponse = await fetch(
      `${targetUrl}/api/attendance/me`,
      { headers: requesterHeaders },
    );
    const overview = await overviewResponse.json() as {
      records: Array<{
        attendanceRecordId: string;
        checkOutAt: string | null;
      }>;
    };

    if (
      overviewResponse.status !== 200 ||
      !overview.records.some(
        (entry) =>
          entry.attendanceRecordId === attendanceRecordId &&
          entry.checkOutAt !== null,
      )
    ) {
      throw new Error(
        "Hosted attendance self overview did not return actor-owned checked-out record",
      );
    }

    const correctedClock = minutesToClock(
      Math.max(0, adjustedCheckInMinutes - 5),
    );
    const correctionBody = {
      clientKey: `time-correction-${marker}`,
      attendanceRecordId,
      correctionType: "CHECK_IN",
      correctedTime: correctedClock,
      reason: "Synthetic hosted attendance E2E correction",
      employeeId: approverEmployeeId,
      approverId: approverEmployeeId,
    };

    const correctionResponse = await fetch(
      `${targetUrl}/api/attendance/time-corrections`,
      {
        method: "POST",
        headers: requesterHeaders,
        body: JSON.stringify(correctionBody),
      },
    );
    const correction = await correctionResponse.json() as {
      requestId: string;
      replayed: boolean;
    };

    if (
      correctionResponse.status !== 201 ||
      correction.replayed
    ) {
      throw new Error(
        `Hosted Time Correction create returned HTTP ${correctionResponse.status}`,
      );
    }
    correctionRequestId = correction.requestId;

    const correctionRow =
      await prisma.timeCorrectionRequest.findUnique({
        where: { id: correctionRequestId },
        select: {
          employeeId: true,
          status: true,
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
    correctionApprovalInstanceId =
      correctionRow?.approvalInstanceId ?? null;

    if (
      !correctionRow ||
      correctionRow.employeeId !== requesterEmployeeId ||
      correctionRow.status !== "PENDING" ||
      correctionRow.approvalInstance?.steps[0]
        ?.approverEmployeeId !== approverEmployeeId
    ) {
      throw new Error(
        "Hosted Time Correction persisted unexpected authority or approver",
      );
    }

    const assignedResponse = await fetch(
      `${targetUrl}/api/attendance/time-corrections/assigned`,
      { headers: approverHeaders },
    );
    const assigned = await assignedResponse.json() as Array<{
      requestId: string;
    }>;

    if (
      assignedResponse.status !== 200 ||
      !assigned.some(
        (entry) => entry.requestId === correctionRequestId,
      )
    ) {
      throw new Error(
        "Hosted assigned Time Correction queue did not return assigned request",
      );
    }

    const decisionResponse = await fetch(
      `${targetUrl}/api/attendance/time-corrections/${correctionRequestId}/decision`,
      {
        method: "POST",
        headers: approverHeaders,
        body: JSON.stringify({
          decision: "APPROVED",
          comment: "Synthetic hosted E2E approval",
          employeeId: requesterEmployeeId,
          role: "SUPERADMIN",
        }),
      },
    );
    const decision = await decisionResponse.json() as {
      requestId: string;
      status: string;
    };

    if (
      decisionResponse.status !== 201 ||
      decision.requestId !== correctionRequestId ||
      decision.status !== "APPROVED"
    ) {
      throw new Error(
        `Hosted Time Correction decision returned HTTP ${decisionResponse.status}`,
      );
    }

    const finalRows = await Promise.all([
      prisma.timeCorrectionRequest.findUnique({
        where: { id: correctionRequestId },
        select: { status: true },
      }),
      prisma.attendanceRecord.findUnique({
        where: { id: attendanceRecordId },
        select: { checkInAt: true, checkOutAt: true },
      }),
    ]);

    if (
      finalRows[0]?.status !== "APPROVED" ||
      !finalRows[1]?.checkOutAt ||
      attendanceBusinessParts(
        finalRows[1].checkInAt,
      ).time !== correctedClock
    ) {
      throw new Error(
        "Hosted Time Correction decision did not atomically update canonical state",
      );
    }

    process.stdout.write(
      "M7_ATTENDANCE_E2E_PASS checkin=201 replay=201 conflict=409 checkout=201 checkout_replay=201 overview=200 correction=201 assigned=200 decision=201 forged_headers_ignored=1\n",
    );
  } finally {
    if (correctionRequestId) {
      await prisma.notificationOutbox.deleteMany({
        where: {
          aggregateId: correctionRequestId,
        },
      });
      await prisma.auditLog.deleteMany({
        where: {
          entityType: "TimeCorrectionRequest",
          entityId: correctionRequestId,
        },
      });
      await prisma.timeCorrectionRequest.deleteMany({
        where: { id: correctionRequestId },
      });
    }

    if (correctionApprovalInstanceId) {
      await prisma.approvalStep.deleteMany({
        where: {
          approvalInstanceId: correctionApprovalInstanceId,
        },
      });
      await prisma.approvalInstance.deleteMany({
        where: { id: correctionApprovalInstanceId },
      });
    }

    if (attendanceRecordId) {
      await prisma.notificationOutbox.deleteMany({
        where: { aggregateId: attendanceRecordId },
      });
      await prisma.auditLog.deleteMany({
        where: {
          entityType: "AttendanceRecord",
          entityId: attendanceRecordId,
        },
      });
      await prisma.attendanceRecord.deleteMany({
        where: { id: attendanceRecordId },
      });
    }

    if (requesterEmployeeId) {
      await prisma.idempotencyKey.deleteMany({
        where: { actorEmployeeId: requesterEmployeeId },
      });
    }

    if (overtimeRequestId) {
      await prisma.overtimeRequest.deleteMany({
        where: { id: overtimeRequestId },
      });
    }

    if (requesterAccountId && employeeRoleId) {
      await prisma.userRole.deleteMany({
        where: {
          userAccountId: requesterAccountId,
          roleId: employeeRoleId,
        },
      });
    }
    if (approverAccountId && superuserRoleId) {
      await prisma.userRole.deleteMany({
        where: {
          userAccountId: approverAccountId,
          roleId: superuserRoleId,
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

    if (createdEmployeeRole && employeeRoleId) {
      await prisma.role.deleteMany({
        where: { id: employeeRoleId },
      });
    }
    if (createdSuperuserRole && superuserRoleId) {
      await prisma.role.deleteMany({
        where: { id: superuserRoleId },
      });
    }

    if (createdAttendancePolicyId) {
      await prisma.attendancePolicy.deleteMany({
        where: { id: createdAttendancePolicyId },
      });
    }
    if (createdWeeklyRuleId) {
      await prisma.weeklyWorkRule.deleteMany({
        where: { id: createdWeeklyRuleId },
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
      const remaining = await prisma.employee.findUnique({
        where: { id: requesterEmployeeId },
        select: { id: true },
      });

      if (remaining) {
        throw new Error(
          "Synthetic hosted Attendance E2E cleanup failed",
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
        : "Unknown hosted Attendance E2E error";

    process.stderr.write(
      `M7_ATTENDANCE_E2E_FAIL ${message}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
