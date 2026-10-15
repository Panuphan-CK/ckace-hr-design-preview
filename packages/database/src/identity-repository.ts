import type { Prisma, PrismaClient } from "@prisma/client";

import type {
  IdentityRecord,
  IdentityRepository,
} from "@ckace/auth";

type EmployeeIdentityPayload = Prisma.EmployeeGetPayload<{
  include: {
    userAccount: {
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

function toIdentityRecord(
  employee: EmployeeIdentityPayload,
): IdentityRecord | null {
  const account = employee.userAccount;

  if (!account) {
    return null;
  }

  const roles = account.roles.map(
    (assignment) => assignment.role.key,
  );

  const permissions = [
    ...new Set(
      account.roles.flatMap((assignment) =>
        assignment.role.permissions.map(
          (grant) => grant.permission.key,
        ),
      ),
    ),
  ];

  return {
    employeeId: employee.id,
    legacyUid: null,
    accountState: account.state,
    agencyId: employee.agencyId,
    departmentId: employee.departmentId,
    roles,
    permissions,
  };
}

const identityInclude = {
  userAccount: {
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.EmployeeInclude;

export class PrismaIdentityRepository
implements IdentityRepository {
  constructor(
    private readonly prisma: PrismaClient,
  ) {}

  async findByEmployeeId(
    employeeId: string,
  ): Promise<IdentityRecord | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: identityInclude,
    });

    return employee ? toIdentityRecord(employee) : null;
  }

  async findByLineUserId(
    lineUserId: string,
  ): Promise<IdentityRecord | null> {
    const binding = await this.prisma.lineAccount.findUnique({
      where: { lineUserId },
      select: { employeeId: true },
    });

    if (!binding) {
      return null;
    }

    return this.findByEmployeeId(binding.employeeId);
  }
}
