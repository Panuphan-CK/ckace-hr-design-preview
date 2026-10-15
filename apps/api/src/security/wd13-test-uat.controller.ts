import { randomBytes } from "node:crypto";

import { getPrismaClient } from "@ckace/database";
import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  NotFoundException,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
} from "@nestjs/common";

import { hashProjectPassword } from "../onboarding/onboarding-auth";
import {
  DesktopAuthService,
} from "./desktop-auth.service";
import {
  desktopNavigationForPermissions,
} from "./desktop-navigation";
import {
  desktopSessionCookie,
} from "./desktop-session";
import type { SecurityRequest } from "./security-request";
import {
  attestWd13TestRuntime,
} from "./wd13-test-boundary";

interface HeaderResponse {
  setHeader(name: string, value: string): void;
}

type Task30Role =
  | "employee"
  | "superuser"
  | "admin"
  | "superadmin";

interface Task30Account {
  readonly roleKey: string;
  readonly employeeId: string;
  readonly accountId: string;
  readonly loginName: string;
  readonly permissionCount: number;
}

const TASK30_ACCOUNTS: Record<Task30Role, Task30Account> = {
  employee: {
    roleKey: "EMPLOYEE",
    employeeId: "29000000-0000-4000-9000-000000000001",
    accountId: "29000000-0000-4000-a000-000000000001",
    loginName: "wd13.test.employee",
    permissionCount: 14,
  },
  superuser: {
    roleKey: "SUPERUSER",
    employeeId: "29000000-0000-4000-9000-000000000002",
    accountId: "29000000-0000-4000-a000-000000000002",
    loginName: "wd13.test.superuser",
    permissionCount: 19,
  },
  admin: {
    roleKey: "ADMIN",
    employeeId: "29000000-0000-4000-9000-000000000003",
    accountId: "29000000-0000-4000-a000-000000000003",
    loginName: "wd13.test.admin",
    permissionCount: 23,
  },
  superadmin: {
    roleKey: "SUPERADMIN",
    employeeId: "29000000-0000-4000-9000-000000000004",
    accountId: "29000000-0000-4000-a000-000000000004",
    loginName: "wd13.test.superadmin",
    permissionCount: 24,
  },
};

export function assertTask30UatRuntime(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const revision = env.K_REVISION?.trim() ?? "";
  if (
    env.CKACE_RUNTIME_STAGE?.trim().toLowerCase() !== "test" ||
    env.K_SERVICE?.trim() !== "ckace-hr-api-test" ||
    !revision.startsWith("ckace-hr-api-test-task30uat-")
  ) {
    throw new NotFoundException();
  }
}

function readRole(body: unknown): Task30Role {
  if (!body || typeof body !== "object") {
    throw new BadRequestException("Invalid UAT role");
  }
  const value = (body as { role?: unknown }).role;
  if (
    value !== "employee" &&
    value !== "superuser" &&
    value !== "admin" &&
    value !== "superadmin"
  ) {
    throw new BadRequestException("Invalid UAT role");
  }
  return value;
}

@Controller("test/desktop-uat")
export class Wd13TestUatController {
  constructor(
    @Inject(DesktopAuthService)
    private readonly auth: DesktopAuthService,
  ) {}

  @Post("bootstrap")
  async bootstrap(
    @Body() body: unknown,
    @Req() request: SecurityRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    assertTask30UatRuntime();

    const role = readRole(body);
    const expected = TASK30_ACCOUNTS[role];
    const prisma = getPrismaClient();

    try {
      const rows = await prisma.$queryRawUnsafe<
        Array<{ database_name: string }>
      >("SELECT current_database() AS database_name");
      attestWd13TestRuntime({
        databaseUrl: process.env.DATABASE_URL,
        runtimeStage: process.env.CKACE_RUNTIME_STAGE,
        serviceName: process.env.K_SERVICE,
        currentDatabase: rows[0]?.database_name,
      });

      const fixture = await prisma.userAccount.findUnique({
        where: { id: expected.accountId },
        select: {
          employeeId: true,
          normalizedLogin: true,
          state: true,
          roles: {
            select: {
              role: {
                select: { key: true },
              },
            },
          },
        },
      });

      const roleKeys =
        fixture?.roles.map((entry) => entry.role.key) ?? [];
      if (
        !fixture ||
        fixture.employeeId !== expected.employeeId ||
        fixture.normalizedLogin !== expected.loginName ||
        fixture.state !== "ACTIVE" ||
        roleKeys.length !== 1 ||
        roleKeys[0] !== expected.roleKey
      ) {
        throw new Error("TASK30_FIXTURE_MISMATCH");
      }

      const password = randomBytes(32).toString("base64url");
      const passwordHash = hashProjectPassword(password);
      const updated = await prisma.userAccount.updateMany({
        where: {
          id: expected.accountId,
          employeeId: expected.employeeId,
          normalizedLogin: expected.loginName,
          state: "ACTIVE",
        },
        data: { passwordHash },
      });
      if (updated.count !== 1) {
        throw new Error("TASK30_CREDENTIAL_ROTATION_CONFLICT");
      }

      const result = await this.auth.login({
        username: expected.loginName,
        password,
        ...(request.correlationId
          ? { correlationId: request.correlationId }
          : {}),
      });

      if (
        result.actor.employeeId !== expected.employeeId ||
        result.actor.roles.length !== 1 ||
        result.actor.roles[0] !== expected.roleKey ||
        result.actor.permissions.length !== expected.permissionCount
      ) {
        throw new Error("TASK30_AUTH_MATRIX_MISMATCH");
      }

      response.setHeader(
        "Set-Cookie",
        desktopSessionCookie(
          result.token,
          process.env.CKACE_RUNTIME_STAGE,
        ),
      );

      return {
        authenticated: true as const,
        role,
        employeeId: result.actor.employeeId,
        permissionCount: result.actor.permissions.length,
        navigation: desktopNavigationForPermissions(
          result.actor.permissions,
        ),
        clientRoleAuthority: false as const,
        serviceRevision: process.env.K_REVISION ?? "unknown",
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException({
        ok: false,
        uat: "UNAVAILABLE",
      });
    }
  }
}
