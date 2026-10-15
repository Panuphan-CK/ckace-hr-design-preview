import {
  resolveApprovalRoute,
  type ApprovalRouteStep,
  type ResolvedApprovalRoute,
  type RoleScope,
  type RouteEmployee,
  type RouteRoleAssignment,
} from "@ckace/business-rules";
import type { Prisma } from "@prisma/client";

export type ApprovalRouteReader = Pick<
  Prisma.TransactionClient,
  "employee" | "agency"
>;

export interface CompanyApprovalRoute {
  readonly route: ResolvedApprovalRoute;
  readonly displayNames: ReadonlyMap<string, string>;
}

interface RoleRow {
  readonly scopeType: "PLATFORM" | "COMPANY" | "TEAM_SET" | "SELF";
  readonly scopeCompanyId: string | null;
  readonly scopeAgencyIds: readonly string[] | null;
  readonly role: { readonly key: string };
}

/** Fail closed: an incomplete scope never widens access. */
export function toRoleScope(row: RoleRow): RoleScope {
  switch (row.scopeType) {
    case "PLATFORM":
      return { type: "PLATFORM" };
    case "COMPANY":
      return row.scopeCompanyId
        ? { type: "COMPANY", companyId: row.scopeCompanyId }
        : { type: "SELF" };
    case "TEAM_SET":
      return {
        type: "TEAM_SET",
        teamIds: [...(row.scopeAgencyIds ?? [])],
      };
    case "SELF":
      return { type: "SELF" };
  }
}

export function toRouteAssignments(
  rows: readonly RoleRow[],
): readonly RouteRoleAssignment[] {
  return rows.map((row) => ({
    roleKey: row.role.key,
    scope: toRoleScope(row),
  }));
}

/**
 * Resolves the approval route with the company-aware resolver, or returns
 * null when the requester's team is not attached to a company yet so the
 * caller keeps the legacy per-agency behaviour (no change for old data).
 */
export async function resolveCompanyApprovalRoute(
  prisma: ApprovalRouteReader,
  requesterEmployeeId: string,
  steps: readonly ApprovalRouteStep[],
): Promise<CompanyApprovalRoute | null> {
  const requesterRow = await prisma.employee.findUnique({
    where: { id: requesterEmployeeId },
    select: { agency: { select: { companyId: true } } },
  });

  if (!requesterRow?.agency?.companyId) {
    return null;
  }

  const [agencies, people] = await Promise.all([
    prisma.agency.findMany({
      select: { id: true, companyId: true },
    }),
    prisma.employee.findMany({
      where: {
        OR: [
          { id: requesterEmployeeId },
          { userAccount: { is: { state: "ACTIVE" } } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        agencyId: true,
        managerEmployeeId: true,
        userAccount: {
          select: {
            state: true,
            roles: {
              select: {
                scopeType: true,
                scopeCompanyId: true,
                scopeAgencyIds: true,
                role: { select: { key: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const employees: RouteEmployee[] = people.map((person) => ({
    id: person.id,
    displayName: person.fullName,
    active: person.userAccount?.state === "ACTIVE",
    teamId: person.agencyId,
    managerId: person.managerEmployeeId,
    assignments: toRouteAssignments(person.userAccount?.roles ?? []),
  }));
  const requester = employees.find(
    (person) => person.id === requesterEmployeeId,
  );

  if (!requester) {
    return null;
  }

  const route = resolveApprovalRoute({
    requester,
    employees,
    teams: agencies,
    steps,
  });

  return {
    route,
    displayNames: new Map(
      employees.map((person) => [person.id, person.displayName]),
    ),
  };
}
