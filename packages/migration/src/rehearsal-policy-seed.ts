import type { PrismaClient } from "@prisma/client";

import { assertMigrationTargetEnvironment } from "./prisma-target-store";

export const TEST_M74_SOURCE_REVISION =
  "1322ed48e98428ffd580a6ec2e8bb7cdec5132c7";

export const REHEARSAL_ROLE_CATALOG = [
  "EMPLOYEE",
  "SUPERUSER",
  "ADMIN",
  "SUPERADMIN",
] as const;

export const REHEARSAL_POLICY_KINDS = [
  "LEAVE",
  "TIME_CORRECTION",
  "OVERTIME",
  "MEDICAL",
] as const;

export type RehearsalPolicyKind = (typeof REHEARSAL_POLICY_KINDS)[number];
export type RehearsalPolicyScope = "SAME_AGENCY" | "SAME_DEPARTMENT" | "GLOBAL";

export interface RehearsalPolicyBaseline {
  readonly schemaVersion: 1;
  readonly source: "TESTm74";
  readonly sourceRevision: string;
  readonly capturedAt: string;
  readonly policies: readonly {
    readonly requestKind: RehearsalPolicyKind;
    readonly name: string;
    readonly active: true;
    readonly steps: readonly {
      readonly roleKey: (typeof REHEARSAL_ROLE_CATALOG)[number];
      readonly scope: RehearsalPolicyScope;
    }[];
  }[];
}

type DbRow = Record<string, unknown>;

interface SeedDelegate {
  upsert(args: DbRow): Promise<DbRow>;
  findMany(args: DbRow): Promise<DbRow[]>;
  create(args: DbRow): Promise<DbRow>;
  createMany(args: DbRow): Promise<{ count: number }>;
}

function model(client: object, name: string): SeedDelegate {
  const value = (client as Record<string, unknown>)[name];
  if (!value || typeof value !== "object") throw new Error(`Missing Prisma model ${name}`);
  return value as SeedDelegate;
}

function requiredText(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

export function validateRehearsalPolicyBaseline(
  input: unknown,
): RehearsalPolicyBaseline {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("TESTm74 policy baseline must be a JSON object");
  }
  const baseline = input as Partial<RehearsalPolicyBaseline>;
  if (baseline.schemaVersion !== 1 || baseline.source !== "TESTm74") {
    throw new Error("Policy baseline must identify schemaVersion 1 and source TESTm74");
  }
  if (baseline.sourceRevision !== TEST_M74_SOURCE_REVISION) {
    throw new Error("Policy baseline sourceRevision does not match the verified TESTm74 revision");
  }
  if (!baseline.capturedAt || Number.isNaN(Date.parse(baseline.capturedAt))) {
    throw new Error("Policy baseline capturedAt must be an ISO-compatible timestamp");
  }
  if (!Array.isArray(baseline.policies) || baseline.policies.length !== REHEARSAL_POLICY_KINDS.length) {
    throw new Error("Policy baseline must contain exactly one global policy for each supported request kind");
  }

  const seenKinds = new Set<string>();
  for (const policy of baseline.policies) {
    if (!REHEARSAL_POLICY_KINDS.includes(policy.requestKind)) {
      throw new Error(`Unsupported rehearsal request kind: ${String(policy.requestKind)}`);
    }
    if (seenKinds.has(policy.requestKind)) throw new Error(`Duplicate rehearsal policy kind: ${policy.requestKind}`);
    seenKinds.add(policy.requestKind);
    if ((policy as unknown as { agencyId?: unknown }).agencyId != null) {
      throw new Error("This rehearsal seeder supports only global TESTm74 policies; agency-scoped baselines require an explicit extension");
    }
    requiredText(policy.name, `${policy.requestKind} policy name`);
    if (policy.active !== true) throw new Error(`${policy.requestKind} TESTm74 policy must be active`);
    if (!Array.isArray(policy.steps) || policy.steps.length < 1 || policy.steps.length > 5) {
      throw new Error(`${policy.requestKind} policy must contain 1 to 5 steps`);
    }
    for (const step of policy.steps) {
      if (!REHEARSAL_ROLE_CATALOG.includes(step.roleKey)) {
        throw new Error(`${policy.requestKind} policy has an unknown approver role`);
      }
      if (!["SAME_AGENCY", "SAME_DEPARTMENT", "GLOBAL"].includes(step.scope)) {
        throw new Error(`${policy.requestKind} policy has an unsupported approver scope`);
      }
    }
  }
  if (seenKinds.size !== REHEARSAL_POLICY_KINDS.length) {
    throw new Error("Policy baseline is missing a supported request kind");
  }
  return baseline as RehearsalPolicyBaseline;
}

function existingPolicyMatches(
  existing: DbRow,
  desired: RehearsalPolicyBaseline["policies"][number],
): boolean {
  if (existing.name !== desired.name || existing.active !== desired.active) return false;
  const steps = Array.isArray(existing.steps) ? existing.steps as DbRow[] : [];
  if (steps.length !== desired.steps.length) return false;
  const ordered = [...steps].sort((left, right) => Number(left.stepOrder) - Number(right.stepOrder));
  return desired.steps.every((step, index) => {
    const actual = ordered[index];
    const role = actual?.requiredRole;
    return actual?.stepOrder === index + 1 && actual.scope === step.scope &&
      Boolean(role && typeof role === "object" && (role as DbRow).key === step.roleKey);
  });
}

export async function seedRehearsalPolicyBaseline(input: {
  readonly prisma: PrismaClient;
  readonly env?: NodeJS.ProcessEnv;
  readonly baseline: unknown;
}): Promise<{
  readonly database: string;
  readonly rolesEnsured: number;
  readonly policiesCreated: number;
  readonly policiesAlreadyIdentical: number;
}> {
  const env = input.env ?? process.env;
  const database = assertMigrationTargetEnvironment(env);
  if (env.CKACE_RUNTIME_STAGE !== "dev") throw new Error("Policy seeding requires CKACE_RUNTIME_STAGE=dev");
  if (env.CKACE_SYSTEM_WRITE_MODE !== "READ_ONLY") throw new Error("Policy seeding requires CKACE_SYSTEM_WRITE_MODE=READ_ONLY");
  const baseline = validateRehearsalPolicyBaseline(input.baseline);
  const transactional = input.prisma as unknown as {
    $transaction<T>(callback: (tx: object) => Promise<T>): Promise<T>;
  };

  return transactional.$transaction(async (tx) => {
    const roles = model(tx, "role");
    const roleIds = new Map<string, string>();
    for (const key of REHEARSAL_ROLE_CATALOG) {
      const role = await roles.upsert({
        where: { key },
        create: {
          key,
          name: key,
          description: "Role catalog entry for a disposable CKACE HR migration rehearsal.",
        },
        update: {},
      });
      roleIds.set(key, requiredText(role.id, `${key} role id`));
    }

    let policiesCreated = 0;
    let policiesAlreadyIdentical = 0;
    const policies = model(tx, "approvalPolicy");
    const steps = model(tx, "approvalPolicyStep");
    for (const desired of baseline.policies) {
      const existing = await policies.findMany({
        where: { requestKind: desired.requestKind, agencyId: null },
        select: {
          id: true,
          name: true,
          active: true,
          steps: {
            select: {
              stepOrder: true,
              scope: true,
              requiredRole: { select: { key: true } },
            },
            orderBy: { stepOrder: "asc" },
          },
        },
      });
      if (existing.length > 1) {
        throw new Error(`Multiple global ${desired.requestKind} policies exist; refusing ambiguous seed`);
      }
      if (existing.length === 1) {
        if (!existingPolicyMatches(existing[0]!, desired)) {
          throw new Error(`Existing global ${desired.requestKind} policy conflicts with TESTm74 baseline; refusing overwrite`);
        }
        policiesAlreadyIdentical += 1;
        continue;
      }

      const created = await policies.create({
        data: {
          agencyId: null,
          requestKind: desired.requestKind,
          name: desired.name,
          active: desired.active,
        },
      });
      const policyId = requiredText(created.id, `${desired.requestKind} policy id`);
      await steps.createMany({
        data: desired.steps.map((step, index) => ({
          policyId,
          stepOrder: index + 1,
          requiredRoleId: roleIds.get(step.roleKey),
          scope: step.scope,
        })),
      });
      policiesCreated += 1;
    }
    return {
      database,
      rolesEnsured: REHEARSAL_ROLE_CATALOG.length,
      policiesCreated,
      policiesAlreadyIdentical,
    };
  });
}
