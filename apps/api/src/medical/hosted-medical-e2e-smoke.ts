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
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function encodeEnvelope(
  envelope: ReturnType<typeof signActorEnvelope>,
): string {
  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
}

function bangkokDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  const year = map.get("year");
  const month = map.get("month");
  const day = map.get("day");
  if (!year || !month || !day) throw new Error("Unable to derive Bangkok date");
  return `${year}-${month}-${day}`;
}

async function main(): Promise<void> {
  const prisma = getPrismaClient();
  const secret = requireEnv("CKACE_LEGACY_BRIDGE_SECRET");
  const targetUrl = requireEnv("CKACE_MEDICAL_SMOKE_TARGET_URL").replace(/\/$/, "");
  const marker = randomUUID().replace(/-/g, "");
  const today = bangkokDateKey(new Date());

  let agencyId: string | null = null;
  let departmentId: string | null = null;
  let requesterEmployeeId: string | null = null;
  let approverEmployeeId: string | null = null;
  let requesterAccountId: string | null = null;
  let approverAccountId: string | null = null;
  let approverRoleId: string | null = null;
  let approvalPolicyId: string | null = null;
  let createdBenefitPolicyId: string | null = null;
  const claimIds: string[] = [];
  const approvalInstanceIds: string[] = [];
  const attachmentIds: string[] = [];

  try {
    const agency = await prisma.agency.create({
      data: { name: `M7 Medical E2E Agency ${marker}` },
    });
    agencyId = agency.id;

    const department = await prisma.department.create({
      data: { name: `M7 Medical E2E Department ${marker}` },
    });
    departmentId = department.id;

    const requester = await prisma.employee.create({
      data: {
        fullName: "M7 Medical E2E Requester",
        agencyId,
        departmentId,
      },
    });
    requesterEmployeeId = requester.id;

    const approver = await prisma.employee.create({
      data: {
        fullName: "M7 Medical E2E Approver",
        agencyId,
        departmentId,
      },
    });
    approverEmployeeId = approver.id;

    const requesterLogin = `m7-med-requester-${marker}@example.invalid`;
    const requesterAccount = await prisma.userAccount.create({
      data: {
        employeeId: requesterEmployeeId,
        loginName: requesterLogin,
        normalizedLogin: requesterLogin.toLowerCase(),
        state: "ACTIVE",
      },
    });
    requesterAccountId = requesterAccount.id;

    const approverLogin = `m7-med-approver-${marker}@example.invalid`;
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
        key: `M7_MED_APPROVER_${marker}`.toUpperCase(),
        name: "M7 Medical E2E Approver",
      },
    });
    approverRoleId = role.id;

    await prisma.userRole.create({
      data: {
        userAccountId: approverAccountId,
        roleId: approverRoleId,
      },
    });

    const approvalPolicy = await prisma.approvalPolicy.create({
      data: {
        agencyId,
        requestKind: "MEDICAL",
        name: `M7 Medical E2E Policy ${marker}`,
        steps: {
          create: {
            stepOrder: 1,
            requiredRoleId: approverRoleId,
            scope: "SAME_AGENCY",
          },
        },
      },
    });
    approvalPolicyId = approvalPolicy.id;

    const todayDate = new Date(`${today}T00:00:00.000Z`);
    const existingBenefit = await prisma.benefitPolicy.findFirst({
      where: {
        key: "MEDICAL",
        active: true,
        effectiveFrom: { lte: todayDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: todayDate } }],
      },
      select: { id: true },
      orderBy: [{ effectiveFrom: "desc" }, { id: "asc" }],
    });

    if (!existingBenefit) {
      const created = await prisma.benefitPolicy.create({
        data: {
          key: "MEDICAL",
          name: "M7 Medical E2E Benefit",
          annualLimit: 10000,
          effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
          active: true,
        },
      });
      createdBenefitPolicyId = created.id;
    }

    for (const suffix of ["approve", "cancel"]) {
      const attachment = await prisma.attachment.create({
        data: {
          ownerEmployeeId: requesterEmployeeId,
          privacyClass: "MEDICAL_PRIVATE",
          storageProvider: "R2",
          storageKey: `m7-medical/${marker}/${suffix}.pdf`,
          originalFilename: `${suffix}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: 1024n,
          checksumSha256: suffix === "approve" ? "a".repeat(64) : "b".repeat(64),
          finalizedAt: new Date(),
        },
      });
      attachmentIds.push(attachment.id);
    }

    const requesterActor: InternalActorContext = {
      employeeId: requesterEmployeeId,
      legacyUid: `M7-MED-${marker}`,
      roles: ["EMPLOYEE"],
      permissions: ["medical.self.read", "medical.self.write"],
      agencyId,
      departmentId,
      authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
      correlationId: `m7-medical-${marker}`,
    };
    const approverActor: InternalActorContext = {
      employeeId: approverEmployeeId,
      legacyUid: `M7-MED-APPROVER-${marker}`,
      roles: ["SUPERUSER"],
      permissions: ["medical.approve"],
      agencyId,
      departmentId,
      authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
      correlationId: `m7-medical-approver-${marker}`,
    };

    const requesterHeaders = {
      "x-ckace-bridge-envelope": encodeEnvelope(
        signActorEnvelope(requesterActor, secret, { ttlMs: 120_000 }),
      ),
      "content-type": "application/json",
      "x-ckace-role": "SUPERADMIN",
      "x-ckace-employee-id": "forged-other-employee",
    };
    const approverHeaders = {
      "x-ckace-bridge-envelope": encodeEnvelope(
        signActorEnvelope(approverActor, secret, { ttlMs: 120_000 }),
      ),
      "content-type": "application/json",
      "x-ckace-role": "EMPLOYEE",
      "x-ckace-employee-id": "forged-requester",
    };

    const createBody = {
      sicknessDate: today,
      amount: 1200,
      description: "Synthetic hosted Medical E2E",
      attachmentIds: [attachmentIds[0]],
      leaveRequestId: null,
      clientKey: `medical-${marker}`,
      employeeId: approverEmployeeId,
      approverId: approverEmployeeId,
      role: "SUPERADMIN",
    };

    const createResponse = await fetch(`${targetUrl}/api/medical/claims`, {
      method: "POST",
      headers: requesterHeaders,
      body: JSON.stringify(createBody),
    });
    const createText = await createResponse.text();
    const created = JSON.parse(createText) as {
      claim: { id: string; employeeId: string; amount: number; status: string };
      replayed: boolean;
      warnings: string[];
    };

    if (
      createResponse.status !== 201 ||
      created.replayed ||
      created.claim.employeeId !== requesterEmployeeId ||
      created.claim.amount !== 1000 ||
      created.claim.status !== "PENDING" ||
      !created.warnings.includes("MEDICAL_AMOUNT_CAPPED_TO_1000")
    ) {
      throw new Error(`Hosted Medical create returned unexpected response HTTP ${createResponse.status}`);
    }
    if (createText.includes("storageKey") || createText.includes("legacyDrive")) {
      throw new Error("Hosted Medical response leaked provider storage metadata");
    }
    claimIds.push(created.claim.id);

    const persisted = await prisma.medicalClaim.findUnique({
      where: { id: created.claim.id },
      select: {
        employeeId: true,
        approvalInstanceId: true,
        approvalInstance: {
          select: { steps: { select: { approverEmployeeId: true } } },
        },
      },
    });
    if (
      !persisted ||
      persisted.employeeId !== requesterEmployeeId ||
      persisted.approvalInstance?.steps[0]?.approverEmployeeId !== approverEmployeeId
    ) {
      throw new Error("Hosted Medical persisted forged authority or unexpected approver");
    }
    if (persisted.approvalInstanceId) approvalInstanceIds.push(persisted.approvalInstanceId);

    const replayResponse = await fetch(`${targetUrl}/api/medical/claims`, {
      method: "POST",
      headers: requesterHeaders,
      body: JSON.stringify(createBody),
    });
    const replay = await replayResponse.json() as {
      claim: { id: string };
      replayed: boolean;
    };
    if (
      replayResponse.status !== 201 ||
      !replay.replayed ||
      replay.claim.id !== created.claim.id
    ) throw new Error("Hosted Medical idempotent replay failed");

    const conflictResponse = await fetch(`${targetUrl}/api/medical/claims`, {
      method: "POST",
      headers: requesterHeaders,
      body: JSON.stringify({ ...createBody, description: "Changed payload" }),
    });
    if (conflictResponse.status !== 409) {
      throw new Error(`Hosted Medical idempotency conflict returned HTTP ${conflictResponse.status}`);
    }

    const overviewResponse = await fetch(`${targetUrl}/api/medical/me`, {
      headers: requesterHeaders,
    });
    const overviewText = await overviewResponse.text();
    const overview = JSON.parse(overviewText) as {
      claims: Array<{ id: string }>;
    };
    if (
      overviewResponse.status !== 200 ||
      !overview.claims.some((entry) => entry.id === created.claim.id)
    ) throw new Error("Hosted Medical self overview did not return actor claim");
    if (overviewText.includes("storageKey") || overviewText.includes("legacyDrive")) {
      throw new Error("Hosted Medical overview leaked provider storage metadata");
    }

    const assignedResponse = await fetch(`${targetUrl}/api/medical/assigned`, {
      headers: approverHeaders,
    });
    const assigned = await assignedResponse.json() as Array<{ id: string }>;
    if (
      assignedResponse.status !== 200 ||
      !assigned.some((entry) => entry.id === created.claim.id)
    ) throw new Error("Hosted Medical assigned queue did not return assigned claim");

    const decisionResponse = await fetch(
      `${targetUrl}/api/medical/claims/${created.claim.id}/decision`,
      {
        method: "POST",
        headers: approverHeaders,
        body: JSON.stringify({
          decision: "APPROVED",
          comment: "Synthetic Medical E2E approval",
          approverEmployeeId: requesterEmployeeId,
          role: "SUPERADMIN",
        }),
      },
    );
    const decision = await decisionResponse.json() as {
      claim: { id: string; status: string };
      completed: boolean;
    };
    if (
      decisionResponse.status !== 201 ||
      decision.claim.id !== created.claim.id ||
      decision.claim.status !== "APPROVED" ||
      !decision.completed
    ) throw new Error(`Hosted Medical decision returned HTTP ${decisionResponse.status}`);

    const cancelBody = {
      ...createBody,
      amount: 500,
      description: "Synthetic hosted Medical cancel E2E",
      attachmentIds: [attachmentIds[1]],
      clientKey: `medical-cancel-${marker}`,
    };
    const cancelCreateResponse = await fetch(`${targetUrl}/api/medical/claims`, {
      method: "POST",
      headers: requesterHeaders,
      body: JSON.stringify(cancelBody),
    });
    const cancelCreated = await cancelCreateResponse.json() as {
      claim: { id: string };
      replayed: boolean;
    };
    if (cancelCreateResponse.status !== 201 || cancelCreated.replayed) {
      throw new Error("Hosted Medical cancel setup create failed");
    }
    claimIds.push(cancelCreated.claim.id);

    const cancelPersisted = await prisma.medicalClaim.findUnique({
      where: { id: cancelCreated.claim.id },
      select: { approvalInstanceId: true },
    });
    if (cancelPersisted?.approvalInstanceId) approvalInstanceIds.push(cancelPersisted.approvalInstanceId);

    const cancelResponse = await fetch(
      `${targetUrl}/api/medical/claims/${cancelCreated.claim.id}/cancel`,
      { method: "POST", headers: requesterHeaders },
    );
    const cancelled = await cancelResponse.json() as { claimId: string; status: string };
    if (
      cancelResponse.status !== 201 ||
      cancelled.claimId !== cancelCreated.claim.id ||
      cancelled.status !== "CANCELLED"
    ) throw new Error(`Hosted Medical cancel returned HTTP ${cancelResponse.status}`);

    process.stdout.write(
      "M7_MEDICAL_E2E_PASS create=201 replay=201 conflict=409 overview=200 assigned=200 decision=201 cancel_create=201 cancel=201 privacy_no_provider_metadata=1 forged_headers_ignored=1\n",
    );
  } finally {
    if (claimIds.length > 0) {
      await prisma.notificationOutbox.deleteMany({
        where: { aggregateType: "MEDICAL_CLAIM", aggregateId: { in: claimIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { entityType: "MedicalClaim", entityId: { in: claimIds } },
      });
      await prisma.medicalClaim.deleteMany({ where: { id: { in: claimIds } } });
    }
    if (approvalInstanceIds.length > 0) {
      await prisma.approvalInstance.deleteMany({ where: { id: { in: approvalInstanceIds } } });
    }
    if (requesterEmployeeId) {
      await prisma.idempotencyKey.deleteMany({ where: { actorEmployeeId: requesterEmployeeId } });
    }
    if (attachmentIds.length > 0) {
      await prisma.attachment.deleteMany({ where: { id: { in: attachmentIds } } });
    }
    if (approvalPolicyId) await prisma.approvalPolicy.deleteMany({ where: { id: approvalPolicyId } });
    if (approverAccountId && approverRoleId) {
      await prisma.userRole.deleteMany({
        where: { userAccountId: approverAccountId, roleId: approverRoleId },
      });
    }
    if (requesterAccountId) await prisma.userAccount.deleteMany({ where: { id: requesterAccountId } });
    if (approverAccountId) await prisma.userAccount.deleteMany({ where: { id: approverAccountId } });
    if (requesterEmployeeId) await prisma.employee.deleteMany({ where: { id: requesterEmployeeId } });
    if (approverEmployeeId) await prisma.employee.deleteMany({ where: { id: approverEmployeeId } });
    if (approverRoleId) await prisma.role.deleteMany({ where: { id: approverRoleId } });
    if (departmentId) await prisma.department.deleteMany({ where: { id: departmentId } });
    if (agencyId) await prisma.agency.deleteMany({ where: { id: agencyId } });
    if (createdBenefitPolicyId) {
      await prisma.benefitPolicy.deleteMany({ where: { id: createdBenefitPolicyId } });
    }
  }
}

void main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown hosted Medical E2E error";
    process.stderr.write(`M7_MEDICAL_E2E_FAIL ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
