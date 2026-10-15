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

async function main(): Promise<void> {
  const prisma = getPrismaClient();
  const secret = requireEnv("CKACE_LEGACY_BRIDGE_SECRET");
  const targetUrl = requireEnv("CKACE_PROFILE_SMOKE_TARGET_URL")
    .replace(/\/$/, "");
  const marker = randomUUID();
  let userAccountId: string | null = null;
  let employeeId: string | null = null;
  let agencyId: string | null = null;
  let departmentId: string | null = null;

  try {
    const agency = await prisma.agency.create({
      data: {
        name: `M7 Profile E2E Agency ${marker}`,
      },
    });
    agencyId = agency.id;

    const department = await prisma.department.create({
      data: {
        name: `M7 Profile E2E Department ${marker}`,
      },
    });
    departmentId = department.id;

    const employee = await prisma.employee.create({
      data: {
        fullName: "M7 Profile E2E Employee",
        nickname: "M7 E2E",
        agencyId,
        departmentId,
      },
    });
    employeeId = employee.id;

    const loginName =
      `m7-profile-e2e-${marker}@example.invalid`;
    const account = await prisma.userAccount.create({
      data: {
        employeeId,
        loginName,
        normalizedLogin: loginName.toLowerCase(),
        state: "ACTIVE",
      },
    });
    userAccountId = account.id;

    const actor: InternalActorContext = {
      employeeId,
      legacyUid: `M7-E2E-${marker}`,
      roles: ["EMPLOYEE"],
      permissions: ["profile.self.read"],
      agencyId,
      departmentId,
      authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
      correlationId: `m7-profile-e2e-${marker}`,
    };
    const envelope = signActorEnvelope(
      actor,
      secret,
      {
        ttlMs: 60_000,
      },
    );

    const response = await fetch(
      `${targetUrl}/api/profile/me`,
      {
        headers: {
          "x-ckace-bridge-envelope":
            encodeEnvelope(envelope),
          "x-ckace-role": "SuperAdmin",
          "x-ckace-employee-id": "forged-other-employee",
        },
      },
    );

    if (response.status !== 200) {
      throw new Error(
        `Hosted self-profile returned HTTP ${response.status}`,
      );
    }

    const body = await response.json() as Record<string, unknown>;

    if (
      body.employeeId !== employeeId ||
      body.fullName !== "M7 Profile E2E Employee" ||
      body.loginName !== loginName ||
      body.accountState !== "ACTIVE" ||
      body.lineLinked !== false
    ) {
      throw new Error(
        "Hosted self-profile returned unexpected safe projection",
      );
    }

    const serialized = JSON.stringify(body);

    for (const forbidden of [
      "legacyPasswordHash",
      "lineUserId",
      "storageKey",
      "legacyDriveUrl",
      "secret",
    ]) {
      if (serialized.includes(forbidden)) {
        throw new Error(
          `Hosted self-profile exposed forbidden field: ${forbidden}`,
        );
      }
    }

    process.stdout.write(
      "M7_IDENTITY_PROFILE_E2E_PASS signed=200 self=1 forged_headers_ignored=1\n",
    );
  } finally {
    if (userAccountId) {
      await prisma.userAccount.deleteMany({
        where: { id: userAccountId },
      });
    }

    if (employeeId) {
      await prisma.employee.deleteMany({
        where: { id: employeeId },
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

    if (employeeId) {
      const remaining = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      });

      if (remaining) {
        throw new Error(
          "Synthetic hosted E2E employee cleanup failed",
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
        : "Unknown profile E2E smoke error";

    process.stderr.write(
      `M7_IDENTITY_PROFILE_E2E_FAIL ${message}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
