/**
 * Validation for role assignments with an approve scope and for the
 * direct-manager hierarchy. Pure functions; the repository supplies lookups.
 */

export type RoleScopeKind = "PLATFORM" | "COMPANY" | "TEAM_SET" | "SELF";

export interface RoleScopeInput {
  readonly scopeType: RoleScopeKind;
  readonly scopeCompanyId?: string | null;
  readonly scopeAgencyIds?: readonly string[] | null;
}

export interface NormalizedRoleScope {
  readonly scopeType: RoleScopeKind;
  readonly scopeCompanyId: string | null;
  readonly scopeAgencyIds: readonly string[];
}

const KINDS: ReadonlySet<string> = new Set([
  "PLATFORM",
  "COMPANY",
  "TEAM_SET",
  "SELF",
]);

/** Maximum teams in one TEAM_SET assignment; a larger set should be a COMPANY scope. */
export const MAX_TEAM_SET_SIZE = 50;

export function normalizeRoleScope(
  input: RoleScopeInput,
): NormalizedRoleScope {
  if (!KINDS.has(input.scopeType)) {
    throw new Error("role scope type is not supported");
  }

  const companyId = input.scopeCompanyId ?? null;
  const agencyIds = [...new Set(input.scopeAgencyIds ?? [])];

  switch (input.scopeType) {
    case "PLATFORM":
    case "SELF":
      if (companyId !== null || agencyIds.length > 0) {
        throw new Error(
          `${input.scopeType} scope must not carry a company or team list`,
        );
      }

      return {
        scopeType: input.scopeType,
        scopeCompanyId: null,
        scopeAgencyIds: [],
      };

    case "COMPANY":
      if (companyId === null || agencyIds.length > 0) {
        throw new Error(
          "COMPANY scope requires exactly one company and no team list",
        );
      }

      return {
        scopeType: "COMPANY",
        scopeCompanyId: companyId,
        scopeAgencyIds: [],
      };

    case "TEAM_SET":
      if (
        companyId !== null ||
        agencyIds.length === 0 ||
        agencyIds.length > MAX_TEAM_SET_SIZE
      ) {
        throw new Error(
          "TEAM_SET scope requires 1 to " +
            MAX_TEAM_SET_SIZE +
            " teams and no company",
        );
      }

      return {
        scopeType: "TEAM_SET",
        scopeCompanyId: null,
        scopeAgencyIds: agencyIds,
      };
  }
}

/**
 * A direct manager must be someone else and must not create a loop
 * (A manages B manages A). `managerOf` returns the current manager id.
 */
export function assertValidManager(input: {
  readonly employeeId: string;
  readonly managerId: string | null;
  readonly managerOf: (employeeId: string) => string | null;
  readonly maxDepth?: number;
}): void {
  if (input.managerId === null) {
    return;
  }

  if (input.managerId === input.employeeId) {
    throw new Error("an employee cannot be their own manager");
  }

  const limit = input.maxDepth ?? 20;
  let cursor: string | null = input.managerId;

  for (let depth = 0; depth < limit && cursor !== null; depth += 1) {
    if (cursor === input.employeeId) {
      throw new Error("manager assignment would create a loop");
    }

    cursor = input.managerOf(cursor);
  }
}
