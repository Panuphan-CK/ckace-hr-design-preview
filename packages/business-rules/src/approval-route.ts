/**
 * Approval route resolver (pure, no I/O).
 *
 * One resolver for leave, overtime, time correction and medical requests.
 * Replaces the three different Production algorithms (design:
 * docs/design/ORG_MODEL_AND_ACCESS.md).
 *
 * Authority model:
 * - an approver holds a role with an *approve scope* (SELF / TEAM_SET /
 *   COMPANY / PLATFORM);
 * - a policy step names a role (or the requester's direct manager, or a
 *   named person);
 * - an approver is eligible when their scope covers the requester (the
 *   requester's own team, or any team the requester themself administers).
 */

export type RoleScope =
  | { readonly type: "SELF" }
  | { readonly type: "TEAM_SET"; readonly teamIds: readonly string[] }
  | { readonly type: "COMPANY"; readonly companyId: string }
  | { readonly type: "PLATFORM" };

export interface RouteRoleAssignment {
  readonly roleKey: string;
  readonly scope: RoleScope;
}

export interface RouteTeam {
  readonly id: string;
  readonly companyId: string | null;
}

export interface RouteEmployee {
  readonly id: string;
  readonly displayName: string;
  readonly active: boolean;
  readonly teamId: string | null;
  readonly managerId: string | null;
  readonly assignments: readonly RouteRoleAssignment[];
}

export type ApprovalSelectionMode =
  /** The requester picks one person from the candidates. */
  | "REQUESTER_CHOOSES"
  /** The system takes the first candidate (stable order). */
  | "SYSTEM_PICKS_FIRST";

export type ApprovalRouteStep =
  | {
      readonly kind: "ROLE";
      readonly roleKey: string;
      readonly selection?: ApprovalSelectionMode;
      /**
       * When nobody else qualifies by scope and the requester holds the same
       * role, accept same-role peers from any scope (SuperAdmin of one
       * company is approved by the SuperAdmin of the other).
       */
      readonly peerFallback?: boolean;
    }
  | {
      readonly kind: "DIRECT_MANAGER";
    }
  | {
      readonly kind: "NAMED";
      readonly employeeId: string;
    };

export interface ResolvedApprovalStep {
  readonly stepOrder: number;
  readonly policyStepIndex: number;
  readonly source: ApprovalRouteStep;
  readonly candidateIds: readonly string[];
  readonly selection: ApprovalSelectionMode;
  /** Set when exactly one person is possible or the system picks. */
  readonly selectedId: string | null;
  readonly viaPeerFallback: boolean;
}

export interface SkippedApprovalStep {
  readonly policyStepIndex: number;
  readonly source: ApprovalRouteStep;
  readonly reason:
    | "NO_ELIGIBLE_APPROVER"
    | "NO_DIRECT_MANAGER"
    | "NAMED_NOT_ACTIVE"
    | "DUPLICATE_OF_EARLIER_STEP";
}

export interface ResolvedApprovalRoute {
  readonly steps: readonly ResolvedApprovalStep[];
  readonly skipped: readonly SkippedApprovalStep[];
}

export interface ResolveApprovalRouteInput {
  readonly requester: RouteEmployee;
  readonly employees: readonly RouteEmployee[];
  readonly teams: readonly RouteTeam[];
  readonly steps: readonly ApprovalRouteStep[];
  /** Stable order for candidates; default is by display name then id. */
  readonly defaultSelection?: ApprovalSelectionMode;
}

function teamCompany(
  teams: readonly RouteTeam[],
  teamId: string | null,
): string | null {
  if (!teamId) {
    return null;
  }

  return teams.find((team) => team.id === teamId)?.companyId ?? null;
}

/** Teams a person works in or administers (their "home" teams). */
function homeTeamIds(
  person: RouteEmployee,
  teams: readonly RouteTeam[],
): ReadonlySet<string> {
  const result = new Set<string>();

  if (person.teamId) {
    result.add(person.teamId);
  }

  for (const assignment of person.assignments) {
    const scope = assignment.scope;

    if (scope.type === "TEAM_SET") {
      scope.teamIds.forEach((id) => result.add(id));
    } else if (scope.type === "COMPANY") {
      teams
        .filter((team) => team.companyId === scope.companyId)
        .forEach((team) => result.add(team.id));
    }
  }

  return result;
}

export function roleScopeCoversTeam(
  scope: RoleScope,
  teamId: string,
  teams: readonly RouteTeam[],
): boolean {
  switch (scope.type) {
    case "PLATFORM":
      return true;
    case "TEAM_SET":
      return scope.teamIds.includes(teamId);
    case "COMPANY":
      return teamCompany(teams, teamId) === scope.companyId;
    case "SELF":
      return false;
  }
}

function holdsRole(person: RouteEmployee, roleKey: string): boolean {
  return person.assignments.some((item) => item.roleKey === roleKey);
}

function byName(
  left: RouteEmployee,
  right: RouteEmployee,
): number {
  return (
    left.displayName.localeCompare(right.displayName, "th") ||
    left.id.localeCompare(right.id)
  );
}

export function resolveApprovalRoute(
  input: ResolveApprovalRouteInput,
): ResolvedApprovalRoute {
  const { requester, employees, teams } = input;
  const active = employees.filter(
    (person) => person.active && person.id !== requester.id,
  );
  const requesterTeams = homeTeamIds(requester, teams);
  const resolved: ResolvedApprovalStep[] = [];
  const skipped: SkippedApprovalStep[] = [];
  const used = new Set<string>();

  input.steps.forEach((step, policyStepIndex) => {
    let candidates: RouteEmployee[] = [];
    let viaPeerFallback = false;

    if (step.kind === "DIRECT_MANAGER") {
      const manager = active.find(
        (person) => person.id === requester.managerId,
      );

      if (!manager) {
        skipped.push({
          policyStepIndex,
          source: step,
          reason: "NO_DIRECT_MANAGER",
        });

        return;
      }

      candidates = [manager];
    } else if (step.kind === "NAMED") {
      const named = active.find(
        (person) => person.id === step.employeeId,
      );

      if (!named) {
        skipped.push({
          policyStepIndex,
          source: step,
          reason: "NAMED_NOT_ACTIVE",
        });

        return;
      }

      candidates = [named];
    } else {
      const holders = active.filter((person) =>
        holdsRole(person, step.roleKey),
      );

      candidates = holders.filter((person) =>
        person.assignments.some(
          (assignment) =>
            assignment.roleKey === step.roleKey &&
            [...requesterTeams].some((teamId) =>
              roleScopeCoversTeam(assignment.scope, teamId, teams),
            ),
        ),
      );

      if (
        candidates.length === 0 &&
        step.peerFallback === true &&
        holdsRole(requester, step.roleKey)
      ) {
        candidates = holders;
        viaPeerFallback = candidates.length > 0;
      }
    }

    // A person approves a given request once; later steps skip people
    // already used by an earlier step of this route.
    const fresh = candidates.filter((person) => !used.has(person.id));

    if (fresh.length === 0) {
      skipped.push({
        policyStepIndex,
        source: step,
        reason:
          candidates.length === 0
            ? "NO_ELIGIBLE_APPROVER"
            : "DUPLICATE_OF_EARLIER_STEP",
      });

      return;
    }

    const ordered = [...fresh].sort(byName);
    const selection: ApprovalSelectionMode =
      (step.kind === "ROLE" ? step.selection : undefined) ??
      input.defaultSelection ??
      "REQUESTER_CHOOSES";
    const selectedId =
      ordered.length === 1 || selection === "SYSTEM_PICKS_FIRST"
        ? (ordered[0]?.id ?? null)
        : null;

    if (selectedId) {
      used.add(selectedId);
    }

    resolved.push({
      stepOrder: resolved.length + 1,
      policyStepIndex,
      source: step,
      candidateIds: ordered.map((person) => person.id),
      selection,
      selectedId,
      viaPeerFallback,
    });
  });

  return { steps: resolved, skipped };
}

export type ApprovalSelectionError =
  | "INCOMPLETE"
  | "NOT_A_CANDIDATE"
  | "DUPLICATE_APPROVER"
  | "REQUESTER_CANNOT_APPROVE_OWN";

/**
 * Validates the requester's picks (one id per resolved step, in order).
 * Steps that the system already fixed (selectedId) are accepted as-is.
 */
export function validateApprovalSelection(
  route: ResolvedApprovalRoute,
  requesterId: string,
  picks: readonly string[],
): { readonly ok: true; readonly approverIds: readonly string[] } | {
  readonly ok: false;
  readonly error: ApprovalSelectionError;
} {
  const open = route.steps.filter((step) => step.selectedId === null);

  if (picks.length !== open.length) {
    return { ok: false, error: "INCOMPLETE" };
  }

  const approverIds: string[] = [];
  let cursor = 0;

  for (const step of route.steps) {
    const chosen =
      step.selectedId ??
      picks[cursor++] ??
      "";

    if (chosen === requesterId) {
      return { ok: false, error: "REQUESTER_CANNOT_APPROVE_OWN" };
    }

    if (!step.candidateIds.includes(chosen)) {
      return { ok: false, error: "NOT_A_CANDIDATE" };
    }

    if (approverIds.includes(chosen)) {
      return { ok: false, error: "DUPLICATE_APPROVER" };
    }

    approverIds.push(chosen);
  }

  return { ok: true, approverIds };
}

export type ApprovalRouteMode = "STANDARD" | "MANAGER_FIRST";

/**
 * Applies a per-employee route mode to the policy steps.
 *
 * MANAGER_FIRST (e.g. an administrative clerk who reports to the Admin only):
 * the direct manager approves first and every policy step up to and including
 * the manager's own level is skipped. Policy steps are ordered by ascending
 * authority, so "the manager's level" is the last ROLE step whose role the
 * manager holds. When the manager holds none of the policy roles all policy
 * steps are kept (duplicates of the manager are removed by the resolver).
 * Without a manager the standard steps are used.
 */
export function buildRouteSteps(input: {
  readonly policySteps: readonly ApprovalRouteStep[];
  readonly mode: ApprovalRouteMode;
  readonly managerRoleKeys: readonly string[] | null;
  /** Roles the requester holds; steps below the requester's own level are dropped. */
  readonly requesterRoleKeys?: readonly string[];
}): readonly ApprovalRouteStep[] {
  const policySteps = dropStepsBelowRequester(
    input.policySteps,
    input.requesterRoleKeys ?? [],
  );

  if (input.mode !== "MANAGER_FIRST" || input.managerRoleKeys === null) {
    return policySteps;
  }

  let managerLevel = -1;

  policySteps.forEach((step, index) => {
    if (
      step.kind === "ROLE" &&
      input.managerRoleKeys?.includes(step.roleKey)
    ) {
      managerLevel = index;
    }
  });

  return [
    { kind: "DIRECT_MANAGER" },
    ...policySteps.slice(managerLevel + 1),
  ];
}

/**
 * Approvers of lower authority never approve a request of someone who holds a
 * higher role (a SuperAdmin's request does not go through the Admin; an
 * Admin's request does not go through the team lead). The step of the
 * requester's own highest role stays so same-role peers can approve.
 */
function dropStepsBelowRequester(
  steps: readonly ApprovalRouteStep[],
  requesterRoleKeys: readonly string[],
): readonly ApprovalRouteStep[] {
  let ownLevel = -1;

  steps.forEach((step, index) => {
    if (step.kind === "ROLE" && requesterRoleKeys.includes(step.roleKey)) {
      ownLevel = index;
    }
  });

  return ownLevel > 0 ? steps.slice(ownLevel) : steps;
}
