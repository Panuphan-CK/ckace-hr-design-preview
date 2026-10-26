import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import path from "node:path";

import {
  POST_CUTOVER_RELATION_SOURCES,
  POST_CUTOVER_SOURCES,
  assertOutsideRepository,
  ensureOutsideRepositoryPath,
  assertPostCutoverExportEnvironment,
  collectPostCutoverExport,
  createCutoverMarker,
  readPostCutoverBundle,
  readPostCutoverExport,
} from "./cutover-export.mjs";
import { HR_WORKBOOK_LOOKUP_SOURCES } from "./cutover-hr-workbook.mjs";

const marker = {
  schemaVersion: 1,
  cutoverAt: "2026-10-26T10:00:00.000Z",
  runId: "70c724ef-1b80-41e2-8fe1-51b95d26fb11",
};

const devEnvironment = {
  CKACE_RUNTIME_STAGE: "dev",
  CKACE_SYSTEM_WRITE_MODE: "READ_ONLY",
  CKACE_MIGRATION_JOB: "YES",
  DATABASE_URL: "postgresql://reviewer:local@127.0.0.1:5432/ckace_hr_dev",
};

function emptyPrisma() {
  const prisma = {};
  for (const { delegate } of POST_CUTOVER_SOURCES) {
    prisma[delegate] = { findMany: vi.fn().mockResolvedValue([]) };
  }
  for (const delegate of [
    "rolePermission",
    "leaveTypeAlias",
    "leaveRequestAttachment",
    "overtimeRequestAttachment",
    "medicalClaimAttachment",
    "announcementAttachment",
  ]) {
    prisma[delegate] = { findMany: vi.fn().mockResolvedValue([]) };
  }
  return prisma;
}

describe("post-cutover export", () => {
  it("keeps every export delegate, timestamp, relation field, and order key aligned with Prisma DMMF", () => {
    const modelsByDelegate = new Map(Prisma.dmmf.datamodel.models.map((model) => [
      `${model.name.slice(0, 1).toLowerCase()}${model.name.slice(1)}`,
      model,
    ]));
    const sources = [...POST_CUTOVER_SOURCES, ...POST_CUTOVER_RELATION_SOURCES, ...HR_WORKBOOK_LOOKUP_SOURCES];

    for (const source of sources) {
      const model = modelsByDelegate.get(source.delegate);
      expect(model, `Prisma model for delegate ${source.delegate}`).toBeDefined();
      const fieldNames = new Set(model.fields.map((field) => field.name));
      for (const field of source.timeFields ?? []) {
        expect(fieldNames, `${source.delegate}.${field}`).toContain(field);
      }
      for (const field of source.fields ?? []) {
        expect(fieldNames, `${source.delegate}.${field}`).toContain(field);
      }
      if (source.parentDelegate) {
        expect(modelsByDelegate.has(source.parentDelegate), `parent delegate ${source.parentDelegate}`).toBe(true);
        expect(fieldNames, `${source.delegate}.${source.parentField}`).toContain(source.parentField);
      }
      if (source.attachmentField) {
        expect(fieldNames, `${source.delegate}.${source.attachmentField}`).toContain(source.attachmentField);
      }

      const primaryKeyFields = model.primaryKey?.fields ?? model.fields.filter((field) => field.isId).map((field) => field.name);
      const orderBy = source.orderBy ?? [{ id: "asc" }];
      const orderedFields = orderBy.flatMap((entry) => Object.keys(entry));
      expect(orderedFields, `${source.delegate} orderBy must use its primary key`).toEqual(primaryKeyFields);
      for (const field of orderedFields) {
        expect(fieldNames, `${source.delegate} orderBy field ${field}`).toContain(field);
      }
    }
  });

  it("creates a timestamped UUID marker and rejects invalid marker content", () => {
    expect(createCutoverMarker({
      now: "2026-10-26T10:00:00.000Z",
      runId: marker.runId,
    })).toEqual(marker);
    expect(() => createCutoverMarker({ now: new Date(), runId: "not-a-uuid" })).toThrow(/UUID runId/);
  });

  it("requires READ_ONLY and permits only guarded dev rehearsal or explicitly confirmed production", () => {
    expect(assertPostCutoverExportEnvironment(devEnvironment)).toEqual({ stage: "dev", databaseName: "ckace_hr_dev" });
    expect(() => assertPostCutoverExportEnvironment({
      ...devEnvironment,
      CKACE_SYSTEM_WRITE_MODE: "ACTIVE",
    })).toThrow(/READ_ONLY/);
    expect(() => assertPostCutoverExportEnvironment({
      ...devEnvironment,
      DATABASE_URL: "postgresql://reviewer:local@db.example.invalid:5432/ckace_hr_prod",
    })).toThrow(/loopback PostgreSQL ckace_hr_dev/);
    expect(() => assertPostCutoverExportEnvironment({
      CKACE_RUNTIME_STAGE: "production",
      CKACE_SYSTEM_WRITE_MODE: "READ_ONLY",
      DATABASE_URL: "postgresql://reviewer:synthetic@prod.example.invalid:5432/ckace_hr_prod",
    })).toThrow(/CKACE_PROD_EXPORT_CONFIRM=YES/);
    expect(assertPostCutoverExportEnvironment({
      CKACE_RUNTIME_STAGE: "production",
      CKACE_SYSTEM_WRITE_MODE: "READ_ONLY",
      CKACE_PROD_EXPORT_CONFIRM: "YES",
      DATABASE_URL: "postgresql://reviewer:synthetic@prod.example.invalid:5432/ckace_hr_prod",
    })).toEqual({ stage: "production", databaseName: "ckace_hr_prod" });
  });

  it("stops if either external marker or export path is inside the repository", () => {
    expect(assertOutsideRepository("D:/secure/marker.json", "D:/repo")).toBe(path.resolve("D:/secure/marker.json"));
    expect(() => assertOutsideRepository("D:/repo/docs/export.json", "D:/repo")).toThrow(/outside the repository/);
  });

  it("creates an external parent and returns its resolved path", async () => {
    const { mkdir, mkdtemp, rm } = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const base = await mkdtemp(path.join(os.tmpdir(), "ckace-cutover-export-"));
    try {
      const repositoryRoot = path.join(base, "repo");
      await mkdir(repositoryRoot);
      const destination = path.join(base, "secure", "cutover.json");
      const resolved = await ensureOutsideRepositoryPath(destination, repositoryRoot);
      expect(resolved).toBe(destination);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("refuses paths in a primary checkout when invoked from its nested worktree", async () => {
    const { mkdir, mkdtemp, rm } = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const base = await mkdtemp(path.join(os.tmpdir(), "ckace-cutover-worktree-"));
    try {
      const primaryCheckout = path.join(base, "repo");
      const worktree = path.join(primaryCheckout, ".worktrees", "main-integration");
      await mkdir(path.join(primaryCheckout, ".git"), { recursive: true });
      await mkdir(worktree, { recursive: true });
      await expect(ensureOutsideRepositoryPath(path.join(primaryCheckout, "marker.json"), worktree))
        .rejects.toThrow(/outside every Git checkout/);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("refuses a destination inside an unrelated Git checkout", async () => {
    const { mkdir, mkdtemp, rm } = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const base = await mkdtemp(path.join(os.tmpdir(), "ckace-cutover-other-repo-"));
    try {
      const repositoryRoot = path.join(base, "main-repo");
      const otherCheckout = path.join(base, "other-repo");
      await mkdir(path.join(repositoryRoot, ".git"), { recursive: true });
      await mkdir(path.join(otherCheckout, ".git"), { recursive: true });
      await expect(ensureOutsideRepositoryPath(path.join(otherCheckout, "export.json"), repositoryRoot))
        .rejects.toThrow(/outside every Git checkout/);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("reads only rows at or after the marker, reports every module, and strips credential fields", async () => {
    const prisma = emptyPrisma();
    prisma.leaveRequest.findMany.mockResolvedValue([{
      id: "leave-1",
      submittedAt: new Date(marker.cutoverAt),
      description: "ข้อมูลคำขอส่วนตัว",
      passwordHash: "must-not-export",
      fileSize: 34n,
    }]);
    prisma.auditLog.findMany.mockResolvedValue([{
      id: "audit-1",
      occurredAt: new Date(marker.cutoverAt),
      action: "LEAVE_CREATE",
      entityType: "LeaveRequest",
      entityId: "leave-1",
      metadata: { nested: { authorization: "must-not-export" }, status: "PENDING" },
    }]);
    const result = await collectPostCutoverExport({
      prisma,
      marker,
      now: new Date("2026-10-26T11:00:00.000Z"),
    });

    expect(prisma.leaveRequest.findMany).toHaveBeenCalledWith({
      where: { OR: [{ submittedAt: { gte: new Date(marker.cutoverAt) } }, { updatedAt: { gte: new Date(marker.cutoverAt) } }] },
      orderBy: { id: "asc" },
    });
    expect(result.counts.countsByModule.leave).toBe(1);
    expect(result.counts.auditEventCount).toBe(1);
    expect(result.modules.leave.leaveRequest[0]).not.toHaveProperty("passwordHash");
    expect(result.modules.leave.leaveRequest[0].fileSize).toBe("34");
    expect(result.modules.audit.auditLog[0].metadata).toEqual({ nested: {}, status: "PENDING" });
    expect(result.runId).toBe(marker.runId);
    expect(result.databaseReadOnly).toBe(true);
    for (const module of ["identity-organization", "approvals", "leave", "attendance", "overtime", "medical", "calendar", "attachments", "announcements", "notifications", "audit", "technical"]) {
      expect(result.counts.countsByModule).toHaveProperty(module);
    }
  });

  it("starts a PostgreSQL READ ONLY transaction and attests the expected dev database", async () => {
    const prisma = emptyPrisma();
    const commands = [];
    const transaction = {
      ...prisma,
      $executeRawUnsafe: vi.fn(async (sql) => commands.push(sql)),
      $queryRawUnsafe: vi.fn(async () => [{ database_name: "ckace_hr_dev" }]),
    };
    prisma.$transaction = vi.fn(async (callback, options) => {
      expect(options).toEqual({ isolationLevel: "RepeatableRead" });
      return callback(transaction);
    });
    const result = await readPostCutoverExport({ prisma, marker, env: devEnvironment });

    expect(commands).toEqual(["SET TRANSACTION READ ONLY"]);
    expect(result.database).toBe("ckace_hr_dev");
    expect(result.runtimeStage).toBe("dev");
  });

  it("collects JSON and HR workbook rows inside the same READ ONLY dev transaction", async () => {
    const prisma = emptyPrisma();
    const commands = [];
    const transaction = {
      ...prisma,
      $executeRawUnsafe: vi.fn(async (sql) => commands.push(sql)),
      $queryRawUnsafe: vi.fn(async () => [{ database_name: "ckace_hr_dev" }]),
    };
    prisma.$transaction = vi.fn(async (callback, options) => {
      expect(options).toEqual({ isolationLevel: "RepeatableRead" });
      return callback(transaction);
    });

    const result = await readPostCutoverBundle({ prisma, marker, env: devEnvironment });

    expect(commands).toEqual(["SET TRANSACTION READ ONLY"]);
    expect(result.jsonExport.databaseReadOnly).toBe(true);
    expect(result.jsonExport.database).toBe("ckace_hr_dev");
    expect(result.hrWorkbook.sheets.map((sheet) => sheet.name)).toEqual(["การลา", "OT", "ลงเวลา", "แก้ไขเวลา", "ค่ารักษา"]);
  });

  it("aborts rather than writing partial export data if a model delegate is absent", async () => {
    const prisma = emptyPrisma();
    delete prisma.employee;
    await expect(collectPostCutoverExport({ prisma, marker })).rejects.toThrow(/employee is unavailable/);
  });
});
