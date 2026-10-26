import { describe, expect, it } from "vitest";

import {
  REHEARSAL_POLICY_KINDS,
  REHEARSAL_ROLE_CATALOG,
  TEST_M74_SOURCE_REVISION,
  seedRehearsalPolicyBaseline,
  validateRehearsalPolicyBaseline,
  type RehearsalPolicyBaseline,
} from "./rehearsal-policy-seed";

function baseline(): RehearsalPolicyBaseline {
  return {
    schemaVersion: 1,
    source: "TESTm74",
    sourceRevision: TEST_M74_SOURCE_REVISION,
    capturedAt: "2026-10-26T00:00:00.000Z",
    policies: REHEARSAL_POLICY_KINDS.map((requestKind) => ({
      requestKind,
      name: `Verified ${requestKind}`,
      active: true,
      steps: [{ roleKey: "SUPERUSER", scope: "SAME_AGENCY" }],
    })),
  };
}

function memoryPrisma() {
  const roles = new Map<string, { id: string; key: string; name: string }>();
  const policies: {
    id: string;
    requestKind: string;
    name: string;
    active: boolean;
    agencyId: null;
    steps: { stepOrder: number; scope: string; requiredRole: { key: string } }[];
  }[] = [];
  let nextId = 0;
  const tx = {
    role: {
      upsert: async ({ where, create }: { where: { key: string }; create: { key: string; name: string } }) => {
        const existing = roles.get(where.key);
        if (existing) return existing;
        const created = { id: `role-${++nextId}`, key: create.key, name: create.name };
        roles.set(where.key, created);
        return created;
      },
    },
    approvalPolicy: {
      findMany: async ({ where }: { where: { requestKind: string; agencyId: null } }) =>
        policies.filter((policy) => policy.requestKind === where.requestKind && policy.agencyId === where.agencyId),
      create: async ({ data }: { data: { requestKind: string; name: string; active: boolean; agencyId: null } }) => {
        const created = { id: `policy-${++nextId}`, ...data, steps: [] as { stepOrder: number; scope: string; requiredRole: { key: string } }[] };
        policies.push(created);
        return created;
      },
    },
    approvalPolicyStep: {
      createMany: async ({ data }: { data: { policyId: string; stepOrder: number; requiredRoleId: string | undefined; scope: string }[] }) => {
        for (const step of data) {
          const policy = policies.find((candidate) => candidate.id === step.policyId);
          const role = [...roles.values()].find((candidate) => candidate.id === step.requiredRoleId);
          if (!policy || !role) throw new Error("Fixture relation is missing");
          policy.steps.push({ stepOrder: step.stepOrder, scope: step.scope, requiredRole: { key: role.key } });
        }
        return { count: data.length };
      },
    },
  };
  return {
    state: { roles, policies },
    prisma: { $transaction: async <T>(callback: (value: object) => Promise<T>) => callback(tx) },
  };
}

const safeEnvironment = {
  CKACE_MIGRATION_JOB: "YES",
  CKACE_RUNTIME_STAGE: "dev",
  CKACE_SYSTEM_WRITE_MODE: "READ_ONLY",
  DATABASE_URL: "postgresql://reviewer:local-only@127.0.0.1:5432/ckace_hr_dev",
} as NodeJS.ProcessEnv;

describe("TESTm74 rehearsal policy seed", () => {
  it("requires the verified source revision and all four active global policies", () => {
    expect(() => validateRehearsalPolicyBaseline({
      ...baseline(),
      sourceRevision: "wrong-revision",
    })).toThrow(/sourceRevision/);
    expect(() => validateRehearsalPolicyBaseline({
      ...baseline(),
      policies: baseline().policies.slice(1),
    })).toThrow(/exactly one global policy/);
  });

  it("creates the four roles and policies once, then reports an identical second run", async () => {
    const memory = memoryPrisma();
    const existingEmployeeRole = { id: "role-custom", key: "EMPLOYEE", name: "พนักงานเดิม" };
    memory.state.roles.set("EMPLOYEE", existingEmployeeRole);
    const first = await seedRehearsalPolicyBaseline({
      prisma: memory.prisma as never,
      env: safeEnvironment,
      baseline: baseline(),
    });
    const second = await seedRehearsalPolicyBaseline({
      prisma: memory.prisma as never,
      env: safeEnvironment,
      baseline: baseline(),
    });

    expect(first).toMatchObject({ database: "ckace_hr_dev", rolesEnsured: 4, policiesCreated: 4, policiesAlreadyIdentical: 0 });
    expect(second).toMatchObject({ database: "ckace_hr_dev", rolesEnsured: 4, policiesCreated: 0, policiesAlreadyIdentical: 4 });
    expect(memory.state.roles.size).toBe(4);
    expect(memory.state.roles.get("EMPLOYEE")).toEqual(existingEmployeeRole);
    expect(memory.state.policies).toHaveLength(4);
    expect(memory.state.policies.every((policy) => policy.steps.length === 1)).toBe(true);
  });

  it("refuses a conflicting policy instead of overwriting it", async () => {
    const memory = memoryPrisma();
    await seedRehearsalPolicyBaseline({
      prisma: memory.prisma as never,
      env: safeEnvironment,
      baseline: baseline(),
    });
    memory.state.policies[0]!.steps[0]!.scope = "GLOBAL";

    await expect(seedRehearsalPolicyBaseline({
      prisma: memory.prisma as never,
      env: safeEnvironment,
      baseline: baseline(),
    })).rejects.toThrow(/conflicts with TESTm74 baseline; refusing overwrite/);
  });

  it("uses the migration target loopback guard and requires DEV plus READ_ONLY", async () => {
    const memory = memoryPrisma();
    await expect(seedRehearsalPolicyBaseline({
      prisma: memory.prisma as never,
      env: { ...safeEnvironment, DATABASE_URL: "postgresql://user:pass@db.example.test/ckace_hr_dev" },
      baseline: baseline(),
    })).rejects.toThrow(/loopback/);
    await expect(seedRehearsalPolicyBaseline({
      prisma: memory.prisma as never,
      env: { ...safeEnvironment, CKACE_SYSTEM_WRITE_MODE: "ACTIVE" },
      baseline: baseline(),
    })).rejects.toThrow(/READ_ONLY/);
    expect(memory.state.policies).toHaveLength(0);
  });

  it("uses the declared four-role catalog", () => {
    expect(REHEARSAL_ROLE_CATALOG).toEqual(["EMPLOYEE", "SUPERUSER", "ADMIN", "SUPERADMIN"]);
  });
});
