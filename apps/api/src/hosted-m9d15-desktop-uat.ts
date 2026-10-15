import {
  randomBytes,
  randomUUID,
} from "node:crypto";

import {
  disconnectPrismaClient,
  getPrismaClient,
} from "@ckace/database";

import {
  hashProjectPassword,
} from "./onboarding/onboarding-auth";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function dateOnly(value: Date): Date {
  return new Date(
    `${value.toISOString().slice(0, 10)}T00:00:00.000Z`,
  );
}

async function main(): Promise<void> {
  const prisma = getPrismaClient();
  const target = required(
    "M9D15_DESKTOP_UAT_TARGET_URL",
  ).replace(/\/$/, "");
  const marker = randomUUID().replace(/-/g, "");
  const loginName =
    `m9d15-desktop-${marker}@example.invalid`;
  const password =
    `M9D15-${randomBytes(24).toString("base64url")}`;

  const permissionKeys = [
    "profile.self.read",
    "leave.self.read",
    "requests.self.read",
    "requests.approval.read",
    "leave.approve",
    "attendance.self.read",
    "time_correction.self.read",
    "time_correction.approve",
    "overtime.self.read",
    "overtime.approve",
    "medical.self.read",
    "medical.approve",
    "benefits.self.read",
    "announcements.read",
    "announcements.admin.write",
    "notifications.admin.read",
    "notifications.admin.retry",
    "onboarding.admin.approve",
    "admin.settings.read",
  ] as const;

  let agencyId: string | null = null;
  let departmentId: string | null = null;
  let employeeId: string | null = null;
  let accountId: string | null = null;
  let roleId: string | null = null;
  let benefitPolicyId: string | null = null;
  let createdBenefitPolicy = false;
  const createdPermissionIds: string[] = [];
  const createdWeeklyWorkRuleIds: string[] = [];

  try {
    let permissions = await prisma.permission.findMany({
      where: {
        key: {
          in: [...permissionKeys],
        },
      },
      select: {
        id: true,
        key: true,
      },
    });
    const present = new Set(
      permissions.map((permission) => permission.key),
    );
    const missing = permissionKeys.filter(
      (key) => !present.has(key),
    );
    for (const key of missing) {
      const created = await prisma.permission.create({
        data: {
          key,
          description:
            "Bounded synthetic M9D15 TEST permission; remove after UAT.",
        },
        select: {
          id: true,
        },
      });
      createdPermissionIds.push(created.id);
    }
    if (missing.length > 0) {
      permissions = await prisma.permission.findMany({
        where: {
          key: {
            in: [...permissionKeys],
          },
        },
        select: {
          id: true,
          key: true,
        },
      });
    }
    if (permissions.length !== permissionKeys.length) {
      throw new Error(
        "Synthetic TEST permission preparation is incomplete",
      );
    }

    const currentWeeklyRules =
      await prisma.weeklyWorkRule.findMany({
        select: {
          isoWeekday: true,
        },
      });
    const configuredWeekdays = new Set(
      currentWeeklyRules.map((rule) => rule.isoWeekday),
    );
    for (let isoWeekday = 1; isoWeekday <= 7; isoWeekday += 1) {
      if (configuredWeekdays.has(isoWeekday)) continue;
      const created =
        await prisma.weeklyWorkRule.create({
          data: {
            isoWeekday,
            isWorking:
              isoWeekday >= 1 &&
              isoWeekday <= 5,
          },
          select: {
            id: true,
          },
        });
      createdWeeklyWorkRuleIds.push(created.id);
    }

    const agency = await prisma.agency.create({
      data: {
        name: `M9D15 Desktop UAT Agency ${marker}`,
      },
    });
    agencyId = agency.id;

    const department = await prisma.department.create({
      data: {
        name: `M9D15 Desktop UAT Department ${marker}`,
      },
    });
    departmentId = department.id;

    const employee = await prisma.employee.create({
      data: {
        fullName: "M9D15 Desktop UAT",
        nickname: "M9D15",
        dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
        employmentStart: new Date(
          "2026-01-01T00:00:00.000Z",
        ),
        agencyId,
        departmentId,
      },
    });
    employeeId = employee.id;

    const account = await prisma.userAccount.create({
      data: {
        employeeId,
        loginName,
        normalizedLogin: loginName.toLowerCase(),
        passwordHash: hashProjectPassword(password),
        state: "ACTIVE",
      },
    });
    accountId = account.id;

    const role = await prisma.role.create({
      data: {
        key: `M9D15_DESKTOP_UAT_${marker}`,
        name: "M9D15 Desktop UAT",
        description:
          "Bounded synthetic TEST role; remove after UAT.",
        permissions: {
          create: permissions.map((permission) => ({
            permission: {
              connect: {
                id: permission.id,
              },
            },
          })),
        },
      },
    });
    roleId = role.id;

    await prisma.userRole.create({
      data: {
        userAccountId: accountId,
        roleId,
      },
    });

    const today = dateOnly(new Date());
    let policy = await prisma.benefitPolicy.findFirst({
      where: {
        key: "MEDICAL",
        active: true,
        effectiveFrom: {
          lte: today,
        },
        OR: [
          {
            effectiveTo: null,
          },
          {
            effectiveTo: {
              gte: today,
            },
          },
        ],
      },
      select: {
        id: true,
      },
      orderBy: [
        {
          effectiveFrom: "desc",
        },
        {
          id: "asc",
        },
      ],
    });

    if (!policy) {
      policy = await prisma.benefitPolicy.create({
        data: {
          key: "MEDICAL",
          name: `M9D15 Medical UAT ${marker}`,
          annualLimit: 10000,
          effectiveFrom: new Date(
            "2026-01-01T00:00:00.000Z",
          ),
          active: true,
        },
        select: {
          id: true,
        },
      });
      createdBenefitPolicy = true;
      benefitPolicyId = policy.id;
    }

    const loginResponse = await fetch(
      `${target}/api/desktop-auth/login`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: loginName,
          password,
        }),
      },
    );
    const loginText = await loginResponse.text();
    if (loginResponse.status !== 200) {
      throw new Error(
        `Desktop login returned HTTP ${loginResponse.status}: ${loginText.slice(0, 300)}`,
      );
    }
    const loginBody = JSON.parse(loginText) as {
      employeeId?: unknown;
      authenticatedBy?: unknown;
      navigation?: Record<string, unknown>;
      clientRoleAuthority?: unknown;
    };
    if (
      loginBody.employeeId !== employeeId ||
      loginBody.authenticatedBy !== "PROJECT_B_WEB" ||
      loginBody.clientRoleAuthority !== false
    ) {
      throw new Error(
        "Desktop login returned unexpected identity/security projection",
      );
    }

    const expectedCapabilities = [
      "profile",
      "leave",
      "requestStatus",
      "approvals",
      "attendance",
      "overtime",
      "medical",
      "benefits",
      "announcements",
      "notifications",
      "onboarding",
      "announcementAdmin",
      "adminSettings",
      "admin",
    ];
    for (const capability of expectedCapabilities) {
      if (loginBody.navigation?.[capability] !== true) {
        throw new Error(
          `Desktop navigation capability ${capability} is not enabled for synthetic UAT actor`,
        );
      }
    }

    const setCookie =
      loginResponse.headers.get("set-cookie") ?? "";
    const cookie = setCookie.split(";")[0]?.trim() ?? "";
    if (!cookie.startsWith("__session=")) {
      throw new Error(
        "Desktop login did not return the HttpOnly session cookie",
      );
    }

    const get = async (
      path: string,
      expected = 200,
    ): Promise<string> => {
      const response = await fetch(
        `${target}${path}`,
        {
          headers: {
            cookie,
            "x-ckace-role": "forged-superadmin",
            "x-ckace-employee-id":
              "00000000-0000-4000-8000-000000000999",
          },
        },
      );
      const body = await response.text();
      if (response.status !== expected) {
        throw new Error(
          `${path} returned HTTP ${response.status}: ${body.slice(0, 300)}`,
        );
      }
      return body;
    };

    const sessionText = await get(
      "/api/security/session",
    );
    const session = JSON.parse(sessionText) as {
      employeeId?: unknown;
      authenticatedBy?: unknown;
      clientRoleAuthority?: unknown;
    };
    if (
      session.employeeId !== employeeId ||
      session.authenticatedBy !== "PROJECT_B_WEB" ||
      session.clientRoleAuthority !== false
    ) {
      throw new Error(
        "Session actor was not preserved as the server-derived Desktop actor",
      );
    }

    const profileText = await get("/api/profile/me");
    const profile = JSON.parse(profileText) as {
      employeeId?: unknown;
      fullName?: unknown;
      loginName?: unknown;
    };
    if (
      profile.employeeId !== employeeId ||
      profile.fullName !== "M9D15 Desktop UAT" ||
      profile.loginName !== loginName
    ) {
      throw new Error(
        "Profile self projection did not match the signed-in Desktop actor",
      );
    }
    if (
      /password|legacyPasswordHash|lineUserId|storageKey/i.test(
        profileText,
      )
    ) {
      throw new Error(
        "Profile response exposed forbidden credential/provider metadata",
      );
    }

    const checks = [
      "/api/leave/me",
      "/api/requests/me",
      "/api/requests/assigned",
      "/api/attendance/me",
      "/api/attendance/time-corrections/me",
      "/api/attendance/time-corrections/assigned",
      "/api/overtime/me",
      "/api/overtime/assigned",
      "/api/medical/me",
      "/api/medical/assigned",
      "/api/benefits/me",
      "/api/announcements",
      "/api/admin/notifications",
      "/api/admin/settings",
      "/api/onboarding/pending",
      "/api/onboarding/approval-options",
    ] as const;

    for (const path of checks) {
      await get(path);
    }

    const logout = await fetch(
      `${target}/api/desktop-auth/logout`,
      {
        method: "POST",
        headers: {
          cookie,
        },
      },
    );
    if (logout.status !== 200) {
      throw new Error(
        `Desktop logout returned HTTP ${logout.status}`,
      );
    }

    process.stdout.write(
      [
        "M9D15_DESKTOP_AUTH_UAT_PASS",
        "login=200",
        "session=200",
        "profile=200",
        `critical_reads=${checks.length}`,
        "forged_headers_ignored=1",
        "client_role_authority=0",
        "logout=200",
        "cleanup=pending",
      ].join(" ") + "\n",
    );
  } finally {
    if (accountId) {
      await prisma.userAccount.deleteMany({
        where: {
          id: accountId,
        },
      });
    }

    if (roleId) {
      await prisma.role.deleteMany({
        where: {
          id: roleId,
        },
      });
    }

    if (employeeId) {
      await prisma.employee.deleteMany({
        where: {
          id: employeeId,
        },
      });
    }

    if (createdPermissionIds.length > 0) {
      await prisma.permission.deleteMany({
        where: {
          id: {
            in: createdPermissionIds,
          },
        },
      });
    }

    if (createdWeeklyWorkRuleIds.length > 0) {
      await prisma.weeklyWorkRule.deleteMany({
        where: {
          id: {
            in: createdWeeklyWorkRuleIds,
          },
        },
      });
    }

    if (departmentId) {
      await prisma.department.deleteMany({
        where: {
          id: departmentId,
        },
      });
    }

    if (agencyId) {
      await prisma.agency.deleteMany({
        where: {
          id: agencyId,
        },
      });
    }

    if (
      createdBenefitPolicy &&
      benefitPolicyId
    ) {
      await prisma.benefitPolicy.deleteMany({
        where: {
          id: benefitPolicyId,
        },
      });
    }

    if (employeeId) {
      const remaining =
        await prisma.employee.findUnique({
          where: {
            id: employeeId,
          },
          select: {
            id: true,
          },
        });
      if (remaining) {
        throw new Error(
          "Synthetic Desktop UAT cleanup failed",
        );
      }
    }

    process.stdout.write(
      "M9D15_DESKTOP_UAT_CLEANUP_PASS synthetic_employee=0 synthetic_role=0 synthetic_permissions=0 synthetic_weekly_rules=0\n",
    );
  }
}

void main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Desktop UAT error";
    process.stderr.write(
      `M9D15_DESKTOP_AUTH_UAT_FAIL ${message}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaClient();
  });
