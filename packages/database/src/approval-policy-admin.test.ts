/* eslint-disable @typescript-eslint/no-explicit-any -- loose Prisma transaction mocks */
import { describe, expect, it, vi } from "vitest";

import { PrismaManagementRepository } from "./management-repository";

function repoWith(overrides: { existing?: { id: string } | null; roles?: { id: string; key: string }[] } = {}) {
  const tx: Record<string, any> = {
    agency: { findUnique: vi.fn().mockResolvedValue({ id: "a1" }) },
    role: {
      findMany: vi.fn().mockResolvedValue(
        overrides.roles ?? [
          { id: "r-admin", key: "ADMIN" },
          { id: "r-super", key: "SUPERADMIN" },
        ],
      ),
    },
    approvalPolicy: {
      findFirst: vi.fn().mockResolvedValue(overrides.existing ?? null),
      create: vi.fn().mockResolvedValue({ id: "p-new" }),
      update: vi.fn().mockResolvedValue({ id: "p-old" }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "p1",
        requestKind: "LEAVE",
        agencyId: null,
        name: "ลา",
        active: true,
        agency: null,
        steps: [{ stepOrder: 1, scope: "SAME_AGENCY", requiredRole: { key: "ADMIN", name: "ผู้ดูแล" } }],
      }),
    },
    approvalPolicyStep: { deleteMany: vi.fn(), createMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  const prisma = { $transaction: async (cb: (t: typeof tx) => unknown) => cb(tx) } as never;

  return { tx, repo: new PrismaManagementRepository(prisma) };
}

const input = {
  requestKind: "LEAVE" as const,
  agencyId: null,
  name: "ลา",
  active: true,
  steps: [
    { roleKey: "ADMIN", scope: "SAME_AGENCY" as const },
    { roleKey: "SUPERADMIN", scope: "GLOBAL" as const },
  ],
};

describe("approval policy admin", () => {
  it("creates a policy with ordered steps and audits it", async () => {
    const { tx, repo } = repoWith();
    const result = await repo.saveApprovalPolicy(input, "actor");

    expect(tx.approvalPolicy.create).toHaveBeenCalled();
    expect(tx.approvalPolicyStep.createMany).toHaveBeenCalledWith({
      data: [
        { policyId: "p-new", stepOrder: 1, requiredRoleId: "r-admin", scope: "SAME_AGENCY" },
        { policyId: "p-new", stepOrder: 2, requiredRoleId: "r-super", scope: "GLOBAL" },
      ],
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "APPROVAL_POLICY_CREATED" }) }),
    );
    expect(result.steps[0]).toMatchObject({ roleKey: "ADMIN", scope: "SAME_AGENCY" });
  });

  it("replaces the steps of an existing policy instead of duplicating it", async () => {
    const { tx, repo } = repoWith({ existing: { id: "p-old" } });
    await repo.saveApprovalPolicy(input, "actor");

    expect(tx.approvalPolicy.create).not.toHaveBeenCalled();
    expect(tx.approvalPolicyStep.deleteMany).toHaveBeenCalledWith({ where: { policyId: "p-old" } });
  });

  it("rejects unknown roles and bad step counts", async () => {
    const { repo } = repoWith({ roles: [{ id: "r-admin", key: "ADMIN" }] });

    await expect(repo.saveApprovalPolicy(input, "actor")).rejects.toThrow("Unknown approver role");
    await expect(repo.saveApprovalPolicy({ ...input, steps: [] }, "actor")).rejects.toThrow("1 to 5");
  });
});
