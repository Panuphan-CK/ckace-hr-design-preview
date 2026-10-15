import { randomUUID } from "node:crypto";

import {
  disconnectPrismaClient,
  getPrismaClient,
  PrismaSelfProfileRepository,
} from "@ckace/database";

class RollbackSmokeTransaction extends Error {}

async function main(): Promise<void> {
  const prisma = getPrismaClient();
  const marker = randomUUID();
  let syntheticEmployeeId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: `M7 Profile Smoke Agency ${marker}`,
        },
      });
      const department = await tx.department.create({
        data: {
          name: `M7 Profile Smoke Department ${marker}`,
        },
      });
      const employee = await tx.employee.create({
        data: {
          fullName: "M7 Profile Smoke Employee",
          nickname: "M7 Smoke",
          dateOfBirth: new Date("1990-01-02T00:00:00.000Z"),
          employmentStart: new Date("2020-03-04T00:00:00.000Z"),
          agencyId: agency.id,
          departmentId: department.id,
        },
      });
      syntheticEmployeeId = employee.id;

      const account = await tx.userAccount.create({
        data: {
          employeeId: employee.id,
          loginName: `m7-profile-${marker}@example.invalid`,
          normalizedLogin:
            `m7-profile-${marker}@example.invalid`.toLowerCase(),
          state: "ACTIVE",
        },
      });
      const role = await tx.role.create({
        data: {
          key: `M7_PROFILE_SMOKE_${marker}`,
          name: "M7 Profile Smoke Role",
        },
      });

      await tx.userRole.create({
        data: {
          userAccountId: account.id,
          roleId: role.id,
        },
      });
      await tx.lineAccount.create({
        data: {
          employeeId: employee.id,
          lineUserId: `M7_PROFILE_SMOKE_LINE_${marker}`,
        },
      });

      const attachment = await tx.attachment.create({
        data: {
          ownerEmployeeId: employee.id,
          privacyClass: "EMPLOYEE_PRIVATE",
          storageProvider: "LEGACY_DRIVE",
          originalFilename: "profile-smoke.png",
          mimeType: "image/png",
          legacyDriveFileId: `m7-profile-smoke-${marker}`,
        },
      });

      await tx.employeeMedia.create({
        data: {
          employeeId: employee.id,
          attachmentId: attachment.id,
          kind: "PROFILE",
        },
      });

      const repository =
        new PrismaSelfProfileRepository(tx);
      const profile =
        await repository.findSelfProfile(employee.id);

      if (!profile) {
        throw new Error("Synthetic self profile was not readable");
      }

      if (
        profile.employeeId !== employee.id ||
        profile.accountState !== "ACTIVE" ||
        profile.loginName !==
          `m7-profile-${marker}@example.invalid` ||
        !profile.lineLinked ||
        profile.profileAttachmentId !== attachment.id ||
        profile.signatureAttachmentId !== null
      ) {
        throw new Error(
          "Synthetic self profile projection did not match expected safe fields",
        );
      }

      throw new RollbackSmokeTransaction();
    });
  } catch (error) {
    if (!(error instanceof RollbackSmokeTransaction)) {
      throw error;
    }
  }

  if (!syntheticEmployeeId) {
    throw new Error("Synthetic employee was not created");
  }

  const persisted = await prisma.employee.findUnique({
    where: { id: syntheticEmployeeId },
    select: { id: true },
  });

  if (persisted) {
    throw new Error(
      "Synthetic smoke data escaped the rollback transaction",
    );
  }

  process.stdout.write(
    "M7_IDENTITY_PROFILE_DB_SMOKE_PASS safe_projection=1 rollback=1\n",
  );
}

void main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown profile smoke error";

    process.stderr.write(
      `M7_IDENTITY_PROFILE_DB_SMOKE_FAIL ${message}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
