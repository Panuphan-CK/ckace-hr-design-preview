import type { Prisma, PrismaClient } from "@prisma/client";

export interface DatabaseSelfProfile {
  readonly employeeId: string;
  readonly fullName: string;
  readonly nickname: string | null;
  readonly dateOfBirth: string | null;
  readonly employmentStart: string | null;
  readonly resignationDate: string | null;
  readonly accountState: "ACTIVE" | "PENDING" | "INACTIVE" | "RESIGNED";
  readonly loginName: string;
  readonly agency: {
    readonly id: string;
    readonly name: string;
  } | null;
  readonly department: {
    readonly id: string;
    readonly name: string;
  } | null;
  readonly roles: readonly string[];
  readonly lineLinked: boolean;
  readonly profileAttachmentId: string | null;
  readonly signatureAttachmentId: string | null;
}

export interface SelfProfileRepository {
  findSelfProfile(
    employeeId: string,
  ): Promise<DatabaseSelfProfile | null>;
}

const selfProfileSelect = {
  id: true,
  fullName: true,
  nickname: true,
  dateOfBirth: true,
  employmentStart: true,
  resignationDate: true,
  agency: {
    select: {
      id: true,
      name: true,
    },
  },
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  userAccount: {
    select: {
      loginName: true,
      state: true,
      roles: {
        select: {
          role: {
            select: {
              key: true,
            },
          },
        },
      },
    },
  },
  lineAccount: {
    select: {
      id: true,
    },
  },
  media: {
    select: {
      kind: true,
      attachmentId: true,
    },
  },
} satisfies Prisma.EmployeeSelect;

type SelfProfilePayload = Prisma.EmployeeGetPayload<{
  select: typeof selfProfileSelect;
}>;

function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toDatabaseSelfProfile(
  employee: SelfProfilePayload,
): DatabaseSelfProfile | null {
  if (!employee.userAccount) {
    return null;
  }

  const profileMedia = employee.media.find(
    (entry) => entry.kind === "PROFILE",
  );
  const signatureMedia = employee.media.find(
    (entry) => entry.kind === "SIGNATURE",
  );

  return {
    employeeId: employee.id,
    fullName: employee.fullName,
    nickname: employee.nickname,
    dateOfBirth: toDateOnly(employee.dateOfBirth),
    employmentStart: toDateOnly(employee.employmentStart),
    resignationDate: toDateOnly(employee.resignationDate),
    accountState: employee.userAccount.state,
    loginName: employee.userAccount.loginName,
    agency: employee.agency,
    department: employee.department,
    roles: [
      ...new Set(
        employee.userAccount.roles.map(
          (assignment) => assignment.role.key,
        ),
      ),
    ],
    lineLinked: Boolean(employee.lineAccount),
    profileAttachmentId: profileMedia?.attachmentId ?? null,
    signatureAttachmentId: signatureMedia?.attachmentId ?? null,
  };
}

type SelfProfilePrismaClient = Pick<
  PrismaClient,
  "employee"
>;

export class PrismaSelfProfileRepository
implements SelfProfileRepository {
  constructor(
    private readonly prisma: SelfProfilePrismaClient,
  ) {}

  async findSelfProfile(
    employeeId: string,
  ): Promise<DatabaseSelfProfile | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: selfProfileSelect,
    });

    return employee ? toDatabaseSelfProfile(employee) : null;
  }
}
