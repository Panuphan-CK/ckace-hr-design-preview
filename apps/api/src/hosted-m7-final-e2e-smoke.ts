import {
  createHash,
  randomUUID,
} from "node:crypto";

import {
  IdentityInactiveError,
  IdentityService,
  signActorEnvelope,
  type InternalActorContext,
} from "@ckace/auth";
import {
  disconnectPrismaClient,
  getPrismaClient,
  PrismaIdentityRepository,
  PrismaOnboardingRepository,
} from "@ckace/database";
import { OnboardingService } from "./onboarding/onboarding.service";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function envelopeHeader(
  actor: InternalActorContext,
  secret: string,
): string {
  return Buffer.from(
    JSON.stringify(
      signActorEnvelope(actor, secret, { ttlMs: 300_000 }),
    ),
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
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  if (!year || !month || !day) throw new Error("Unable to derive Bangkok date");
  return `${year}-${month}-${day}`;
}

async function responseJson<T>(
  response: Response,
  expected: number,
  label: string,
): Promise<T> {
  const text = await response.text();
  if (response.status !== expected) {
    throw new Error(`${label} returned HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text) as T;
}

async function main(): Promise<void> {
  const prisma = getPrismaClient();
  const secret = required("CKACE_LEGACY_BRIDGE_SECRET");
  const target = required("M7_FINAL_SMOKE_TARGET_URL").replace(/\/$/, "");
  const marker = randomUUID().replace(/-/g, "");
  const today = bangkokDateKey(new Date());
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  const payload = Buffer.from(`ckace-m7-final:${marker}`, "utf8");
  const checksum = createHash("sha256").update(payload).digest("hex");

  let agencyId: string | null = null;
  let departmentId: string | null = null;
  let requesterEmployeeId: string | null = null;
  let adminEmployeeId: string | null = null;
  let onboardingEmployeeId: string | null = null;
  let requesterAccountId: string | null = null;
  let adminAccountId: string | null = null;
  let medicalClaimId: string | null = null;
  let approvalInstanceId: string | null = null;
  let overtimeRequestId: string | null = null;
  let benefitPolicyId: string | null = null;
  let createdBenefitPolicy = false;
  let announcementId: string | null = null;
  let attachmentId: string | null = null;
  let adminHeaders: Record<string, string> | null = null;
  let failedOutboxId: string | null = null;
  let employeeRoleId: string | null = null;
  let createdEmployeeRole = false;
  const createdLeaveTypeIds: string[] = [];
  const createdEmployeeIds: string[] = [];

  try {
    const agency = await prisma.agency.create({
      data: { name: `M7 Final Agency ${marker}` },
    });
    agencyId = agency.id;
    const department = await prisma.department.create({
      data: { name: `M7 Final Department ${marker}` },
    });
    departmentId = department.id;

    const requester = await prisma.employee.create({
      data: {
        fullName: "M7 Final Requester",
        agencyId,
        departmentId,
      },
    });
    requesterEmployeeId = requester.id;
    createdEmployeeIds.push(requester.id);
    const admin = await prisma.employee.create({
      data: {
        fullName: "M7 Final Admin",
        agencyId,
        departmentId,
      },
    });
    adminEmployeeId = admin.id;
    createdEmployeeIds.push(admin.id);

    const requesterLogin = `m7-final-requester-${marker}@example.invalid`;
    const requesterAccount = await prisma.userAccount.create({
      data: {
        employeeId: requester.id,
        loginName: requesterLogin,
        normalizedLogin: requesterLogin,
        state: "ACTIVE",
      },
    });
    requesterAccountId = requesterAccount.id;
    const adminLogin = `m7-final-admin-${marker}@example.invalid`;
    const adminAccount = await prisma.userAccount.create({
      data: {
        employeeId: admin.id,
        loginName: adminLogin,
        normalizedLogin: adminLogin,
        state: "ACTIVE",
      },
    });
    adminAccountId = adminAccount.id;

    let policy = await prisma.benefitPolicy.findFirst({
      where: {
        key: "MEDICAL",
        active: true,
        effectiveFrom: { lte: todayDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: todayDate } }],
      },
      select: { id: true },
      orderBy: [{ effectiveFrom: "desc" }, { id: "asc" }],
    });
    if (!policy) {
      policy = await prisma.benefitPolicy.create({
        data: {
          key: "MEDICAL",
          name: `M7 Final Medical ${marker}`,
          annualLimit: 10000,
          effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
          active: true,
        },
        select: { id: true },
      });
      createdBenefitPolicy = true;
    }
    benefitPolicyId = policy.id;

    const approval = await prisma.approvalInstance.create({
      data: {
        requestKind: "MEDICAL",
        requesterEmployeeId: requester.id,
        status: "PENDING",
        currentStepOrder: 1,
        steps: {
          create: {
            stepOrder: 1,
            approverEmployeeId: admin.id,
            status: "PENDING",
            assignedAt: new Date(),
          },
        },
      },
      select: { id: true },
    });
    approvalInstanceId = approval.id;

    const claim = await prisma.medicalClaim.create({
      data: {
        employeeId: requester.id,
        benefitPolicyId: policy.id,
        approvalInstanceId: approval.id,
        claimDate: todayDate,
        sicknessDate: todayDate,
        amount: 500,
        description: "M7 final synthetic medical",
        status: "PENDING",
      },
      select: { id: true },
    });
    medicalClaimId = claim.id;

    const overtime = await prisma.overtimeRequest.create({
      data: {
        employeeId: requester.id,
        reason: "M7 final synthetic overtime",
        status: "APPROVED",
        segments: {
          create: {
            workDate: todayDate,
            startTime: new Date("1970-01-01T18:00:00.000Z"),
            endTime: new Date("1970-01-01T20:00:00.000Z"),
            requestedMinutes: 120,
          },
        },
      },
      select: { id: true },
    });
    overtimeRequestId = overtime.id;

    const requesterActor: InternalActorContext = {
      employeeId: requester.id,
      legacyUid: null,
      roles: ["EMPLOYEE"],
      permissions: [
        "benefits.self.read",
        "requests.self.read",
        "announcements.read",
      ],
      agencyId,
      departmentId,
      authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
      correlationId: `m7-final-requester-${marker}`,
    };
    const adminActor: InternalActorContext = {
      employeeId: admin.id,
      legacyUid: null,
      roles: ["SUPERADMIN"],
      permissions: [
        "requests.approval.read",
        "announcements.read",
        "announcements.admin.write",
        "storage.attachment.internal.write",
        "storage.attachment.internal.read",
        "storage.attachment.internal.delete",
        "notifications.admin.read",
        "notifications.admin.retry",
        "admin.settings.read",
        "onboarding.admin.approve",
      ],
      agencyId,
      departmentId,
      authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
      correlationId: `m7-final-admin-${marker}`,
    };
    const requesterHeaders = {
      "x-ckace-bridge-envelope": envelopeHeader(requesterActor, secret),
      "content-type": "application/json",
      "x-ckace-role": "SUPERADMIN",
      "x-ckace-employee-id": admin.id,
    };
    adminHeaders = {
      "x-ckace-bridge-envelope": envelopeHeader(adminActor, secret),
      "content-type": "application/json",
      "x-ckace-role": "EMPLOYEE",
      "x-ckace-employee-id": requester.id,
    };

    const benefitsResponse = await fetch(`${target}/api/benefits/me`, {
      headers: requesterHeaders,
    });
    const benefits = await responseJson<{
      requests: Array<{ id: string; kind: string }>;
    }>(benefitsResponse, 200, "Benefits");
    if (
      !benefits.requests.some((item) => item.id === claim.id && item.kind === "MEDICAL") ||
      !benefits.requests.some((item) => item.id === overtime.id && item.kind === "OVERTIME")
    ) throw new Error("Benefits projection did not include synthetic OT and Medical");

    const selfRequests = await responseJson<{
      requests: Array<{ id: string; kind: string }>;
    }>(
      await fetch(`${target}/api/requests/me`, { headers: requesterHeaders }),
      200,
      "Request status self",
    );
    if (!selfRequests.requests.some((item) => item.id === claim.id && item.kind === "MEDICAL")) {
      throw new Error("Request status self omitted synthetic Medical claim");
    }

    const assigned = await responseJson<{
      requests: Array<{ id: string; canDecide: boolean }>;
    }>(
      await fetch(`${target}/api/requests/assigned`, { headers: adminHeaders }),
      200,
      "Request status assigned",
    );
    if (!assigned.requests.some((item) => item.id === claim.id && item.canDecide)) {
      throw new Error("Assigned requests omitted current Medical approval");
    }

    const uploadIntent = await responseJson<{
      attachmentId: string;
      upload: {
        url: string;
        method: "PUT";
        requiredHeaders: Record<string, string>;
      };
    }>(
      await fetch(`${target}/api/attachments/upload-intent`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          privacyClass: "INTERNAL",
          originalFilename: "m7-final.txt",
          mimeType: "text/plain",
          sizeBytes: payload.byteLength,
          checksumSha256: checksum,
        }),
      }),
      201,
      "Attachment upload intent",
    );
    attachmentId = uploadIntent.attachmentId;
    const upload = await fetch(uploadIntent.upload.url, {
      method: "PUT",
      headers: uploadIntent.upload.requiredHeaders,
      body: payload,
    });
    if (!upload.ok) throw new Error(`Signed R2 upload returned HTTP ${upload.status}`);

    await responseJson<{ attachmentId: string; finalized: true }>(
      await fetch(`${target}/api/attachments/${attachmentId}/finalize`, {
        method: "POST",
        headers: adminHeaders,
      }),
      201,
      "Attachment finalize",
    );
    const storedAttachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: { finalizedAt: true },
    });
    if (!storedAttachment?.finalizedAt) {
      throw new Error("Attachment metadata was not finalized");
    }

    const announcementCreated = await responseJson<{
      announcement: {
        id: string;
        attachmentIds: string[];
        hasAttachment: boolean;
      };
    }>(
      await fetch(`${target}/api/announcements`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          content: "M7 final global announcement",
          scope: "GLOBAL",
          attachmentIds: [attachmentId],
          publishNow: true,
        }),
      }),
      201,
      "Announcement create",
    );
    announcementId = announcementCreated.announcement.id;
    if (
      !announcementCreated.announcement.hasAttachment ||
      announcementCreated.announcement.attachmentIds[0] !== attachmentId
    ) throw new Error("Announcement create did not return safe attachment relation");

    const announcementsResponse = await fetch(`${target}/api/announcements`, {
      headers: requesterHeaders,
    });
    const announcementsText = await announcementsResponse.text();
    if (announcementsResponse.status !== 200) {
      throw new Error(`Announcement list returned HTTP ${announcementsResponse.status}`);
    }
    if (/storageKey|legacyDrive|cloudflarestorage\.com/i.test(announcementsText)) {
      throw new Error("Announcement list leaked storage provider metadata");
    }
    const announcements = JSON.parse(announcementsText) as {
      announcements: Array<{
        id: string;
        attachmentIds: string[];
      }>;
    };
    if (!announcements.announcements.some(
      (item) => item.id === announcementId && item.attachmentIds.includes(attachmentId as string),
    )) throw new Error("Requester could not see global announcement attachment relation");

    const directDownload = await fetch(
      `${target}/api/attachments/${attachmentId}/download`,
      { method: "POST", headers: requesterHeaders },
    );
    if (directDownload.status !== 403) {
      throw new Error(`Generic attachment access should fail closed, got HTTP ${directDownload.status}`);
    }

    const relationDownload = await responseJson<{
      attachmentId: string;
      download: { url: string; method: "GET" };
    }>(
      await fetch(
        `${target}/api/announcements/${announcementId}/attachments/${attachmentId}/download`,
        { method: "POST", headers: requesterHeaders },
      ),
      201,
      "Announcement attachment download",
    );
    const downloaded = await fetch(relationDownload.download.url);
    if (!downloaded.ok) throw new Error(`Announcement signed download returned HTTP ${downloaded.status}`);
    const downloadedBytes = Buffer.from(await downloaded.arrayBuffer());
    if (!downloadedBytes.equals(payload)) {
      throw new Error("Announcement attachment bytes mismatch");
    }

    const failedOutbox = await prisma.notificationOutbox.create({
      data: {
        aggregateType: "M7_FINAL_SMOKE",
        aggregateId: marker,
        eventType: "SYNTHETIC_FAILED",
        payload: { marker },
        status: "FAILED",
        attempts: 1,
        lastError: "synthetic",
      },
      select: { id: true },
    });
    failedOutboxId = failedOutbox.id;

    const notificationList = await responseJson<{
      notifications: Array<{ id: string; status: string }>;
    }>(
      await fetch(`${target}/api/admin/notifications`, { headers: adminHeaders }),
      200,
      "Admin notification list",
    );
    if (!notificationList.notifications.some((item) => item.id === failedOutbox.id)) {
      throw new Error("Admin notification list omitted synthetic outbox row");
    }

    const retry = await responseJson<{ id: string; status: string }>(
      await fetch(`${target}/api/admin/notifications/${failedOutbox.id}/retry`, {
        method: "POST",
        headers: adminHeaders,
      }),
      201,
      "Admin notification retry",
    );
    if (retry.status !== "PENDING") throw new Error("Notification retry did not reset to PENDING");

    const settings = await responseJson<{
      runtimeStage: string;
      moduleRouting: string;
      storageProvider: string;
      permanentPublicStorageUrls: boolean;
      protectedActorRequiresActiveAccount: boolean;
      pendingLineBindingSupported: boolean;
    }>(
      await fetch(`${target}/api/admin/settings`, { headers: adminHeaders }),
      200,
      "Admin settings",
    );
    if (
      settings.runtimeStage !== "test" ||
      settings.moduleRouting !== "LEGACY" ||
      settings.storageProvider !== "R2" ||
      settings.permanentPublicStorageUrls ||
      !settings.protectedActorRequiresActiveAccount ||
      !settings.pendingLineBindingSupported
    ) throw new Error("Admin settings contract mismatch");

    let employeeRole = await prisma.role.findUnique({
      where: { key: "EMPLOYEE" },
      select: { id: true },
    });
    if (!employeeRole) {
      employeeRole = await prisma.role.create({
        data: {
          key: "EMPLOYEE",
          name: "Employee",
          description: `Synthetic M7 final prerequisite ${marker}`,
        },
        select: { id: true },
      });
      createdEmployeeRole = true;
    }
    employeeRoleId = employeeRole.id;

    for (const definition of [
      { key: "ANNUAL", name: "Annual" },
      { key: "PERSONAL", name: "Personal" },
      { key: "SICK", name: "Sick" },
    ]) {
      const existing = await prisma.leaveType.findUnique({
        where: { key: definition.key },
        select: { id: true },
      });
      if (!existing) {
        const created = await prisma.leaveType.create({
          data: {
            key: definition.key,
            name: definition.name,
            description: `Synthetic M7 final prerequisite ${marker}`,
            active: true,
          },
          select: { id: true },
        });
        createdLeaveTypeIds.push(created.id);
      }
    }

    const onboardingUsername = `m7-onboard-${marker}`;
    const onboardingPassword = "M7-Final-Password-2026";
    const registration = await responseJson<{
      employeeId: string;
      accountState: string;
      pendingApproval: boolean;
    }>(
      await fetch(`${target}/api/onboarding/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: onboardingUsername,
          password: onboardingPassword,
          fullName: "M7 Pending Employee",
          nickname: "M7",
          dateOfBirth: "1990-01-01",
          employmentStart: today,
        }),
      }),
      201,
      "Onboarding register",
    );
    onboardingEmployeeId = registration.employeeId;
    createdEmployeeIds.push(registration.employeeId);
    if (registration.accountState !== "PENDING" || !registration.pendingApproval) {
      throw new Error("Onboarding registration did not remain PENDING");
    }
    const pendingEntitlements = await prisma.leaveEntitlement.count({
      where: { employeeId: registration.employeeId },
    });
    if (pendingEntitlements !== 0) {
      throw new Error("Pending registration received leave entitlement before approval");
    }

    const syntheticLineUserId = `U_M7_FINAL_${marker}`;
    const onboardingService = new OnboardingService(
      new PrismaOnboardingRepository(prisma),
      { verify: async () => syntheticLineUserId },
    );
    const bound = await onboardingService.bindLine({
      username: onboardingUsername,
      password: onboardingPassword,
      lineIdToken: "synthetic-verified-token",
    });
    if (
      bound.accountState !== "PENDING" ||
      !bound.linked ||
      !bound.pendingApproval
    ) throw new Error("Verified LINE binding did not preserve PENDING state");

    const identityService = new IdentityService(
      new PrismaIdentityRepository(prisma),
    );
    let pendingActorDenied = false;
    try {
      await identityService.resolveLineActor({ lineUserId: syntheticLineUserId });
    } catch (error) {
      pendingActorDenied = error instanceof IdentityInactiveError;
    }
    if (!pendingActorDenied) {
      throw new Error("PENDING LINE account unexpectedly resolved protected actor");
    }

    const approvalResult = await responseJson<{
      employeeId: string;
      accountState: string;
      unchanged: boolean;
      leaveEntitlementsProvisioned: Array<{ leaveTypeKey: string; quota: number }>;
      notificationQueued: boolean;
    }>(
      await fetch(
        `${target}/api/onboarding/employees/${registration.employeeId}/approve`,
        {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ agencyId, departmentId }),
        },
      ),
      201,
      "Onboarding approve",
    );
    if (
      approvalResult.accountState !== "ACTIVE" ||
      approvalResult.unchanged ||
      !approvalResult.notificationQueued ||
      JSON.stringify(approvalResult.leaveEntitlementsProvisioned) !==
        JSON.stringify([
          { leaveTypeKey: "ANNUAL", quota: 5 },
          { leaveTypeKey: "PERSONAL", quota: 6 },
          { leaveTypeKey: "SICK", quota: 30 },
        ])
    ) throw new Error("Onboarding approval contract mismatch");

    const replayApproval = await responseJson<{
      unchanged: boolean;
      notificationQueued: boolean;
    }>(
      await fetch(
        `${target}/api/onboarding/employees/${registration.employeeId}/approve`,
        {
          method: "POST",
          headers: adminHeaders,
          body: JSON.stringify({ agencyId, departmentId }),
        },
      ),
      201,
      "Onboarding approval replay",
    );
    if (!replayApproval.unchanged || replayApproval.notificationQueued) {
      throw new Error("Onboarding approval replay was not idempotent");
    }

    const approvalNotifications = await prisma.notificationOutbox.count({
      where: {
        aggregateType: "EMPLOYEE_ACCOUNT",
        aggregateId: registration.employeeId,
        eventType: "ACCOUNT_APPROVED",
      },
    });
    if (approvalNotifications !== 1) {
      throw new Error("Onboarding approval notification was not exactly-once");
    }
    const entitlements = await prisma.leaveEntitlement.findMany({
      where: { employeeId: registration.employeeId },
      select: { quota: true, leaveType: { select: { key: true } } },
      orderBy: { leaveType: { key: "asc" } },
    });
    const entitlementMap = new Map(
      entitlements.map((item) => [item.leaveType.key, Number(item.quota)]),
    );
    if (
      entitlementMap.get("ANNUAL") !== 5 ||
      entitlementMap.get("PERSONAL") !== 6 ||
      entitlementMap.get("SICK") !== 30
    ) throw new Error("Approved employee entitlements do not match legacy defaults");

    const activeActor = await identityService.resolveLineActor({
      lineUserId: syntheticLineUserId,
    });
    if (
      activeActor.employeeId !== registration.employeeId ||
      !activeActor.roles.includes("EMPLOYEE")
    ) throw new Error("Approved LINE identity did not resolve ACTIVE employee actor");

    process.stdout.write(
      "M7_FINAL_E2E_PASS benefits=200 requests_self=200 requests_assigned=200 attachment_upload=201 attachment_finalize=201 announcement_create=201 announcement_read=200 announcement_relation_download=201 generic_attachment_denied=403 admin_notifications=200 admin_retry=201 admin_settings=200 onboarding_register=201 pending_line_bind=1 pending_actor_denied=1 onboarding_approve=201 onboarding_replay=201 active_actor=1 privacy_no_provider_metadata=1 forged_headers_ignored=1\n",
    );
  } finally {
    if (announcementId) {
      await prisma.announcement.deleteMany({ where: { id: announcementId } });
    }
    if (attachmentId && adminHeaders) {
      const cleanupResponse = await fetch(
        `${target}/api/attachments/${attachmentId}`,
        { method: "DELETE", headers: adminHeaders },
      );
      if (!cleanupResponse.ok && cleanupResponse.status !== 404) {
        throw new Error(
          `Attachment cleanup returned HTTP ${cleanupResponse.status}`,
        );
      }
    } else if (attachmentId) {
      await prisma.attachment.deleteMany({ where: { id: attachmentId } });
    }

    const allEmployeeIds = [...new Set(createdEmployeeIds)];
    if (allEmployeeIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { actorEmployeeId: { in: allEmployeeIds } },
            { entityId: { in: allEmployeeIds } },
          ],
        },
      });
    }
    if (failedOutboxId) {
      await prisma.notificationDelivery.deleteMany({
        where: { outboxId: failedOutboxId },
      });
      await prisma.notificationOutbox.deleteMany({
        where: { id: failedOutboxId },
      });
    }
    if (onboardingEmployeeId) {
      const onboardingOutboxes = await prisma.notificationOutbox.findMany({
        where: { aggregateId: onboardingEmployeeId },
        select: { id: true },
      });
      const outboxIds = onboardingOutboxes.map((row) => row.id);
      if (outboxIds.length > 0) {
        await prisma.notificationDelivery.deleteMany({
          where: { outboxId: { in: outboxIds } },
        });
        await prisma.notificationOutbox.deleteMany({
          where: { id: { in: outboxIds } },
        });
      }
      await prisma.leaveEntitlement.deleteMany({
        where: { employeeId: onboardingEmployeeId },
      });
      await prisma.lineAccount.deleteMany({
        where: { employeeId: onboardingEmployeeId },
      });
      await prisma.userRole.deleteMany({
        where: { userAccount: { employeeId: onboardingEmployeeId } },
      });
      await prisma.userAccount.deleteMany({
        where: { employeeId: onboardingEmployeeId },
      });
      await prisma.employee.deleteMany({
        where: { id: onboardingEmployeeId },
      });
    }

    if (medicalClaimId) {
      await prisma.medicalClaim.deleteMany({ where: { id: medicalClaimId } });
    }
    if (approvalInstanceId) {
      await prisma.approvalInstance.deleteMany({ where: { id: approvalInstanceId } });
    }
    if (overtimeRequestId) {
      await prisma.overtimeRequest.deleteMany({ where: { id: overtimeRequestId } });
    }
    if (requesterAccountId) {
      await prisma.userAccount.deleteMany({ where: { id: requesterAccountId } });
    }
    if (adminAccountId) {
      await prisma.userAccount.deleteMany({ where: { id: adminAccountId } });
    }
    if (requesterEmployeeId) {
      await prisma.employee.deleteMany({ where: { id: requesterEmployeeId } });
    }
    if (adminEmployeeId) {
      await prisma.employee.deleteMany({ where: { id: adminEmployeeId } });
    }

    if (createdEmployeeRole && employeeRoleId) {
      await prisma.role.deleteMany({ where: { id: employeeRoleId } });
    }
    if (createdLeaveTypeIds.length > 0) {
      await prisma.leaveType.deleteMany({ where: { id: { in: createdLeaveTypeIds } } });
    }
    if (createdBenefitPolicy && benefitPolicyId) {
      await prisma.benefitPolicy.deleteMany({ where: { id: benefitPolicyId } });
    }
    if (departmentId) {
      await prisma.department.deleteMany({ where: { id: departmentId } });
    }
    if (agencyId) {
      await prisma.agency.deleteMany({ where: { id: agencyId } });
    }
  }
}

void main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown M7 final smoke failure";
    process.stderr.write(`M7_FINAL_E2E_FAIL ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
