import path from "node:path";
import { lstat, mkdir, realpath } from "node:fs/promises";

export const POST_CUTOVER_SOURCES = Object.freeze([
  { module: "identity-organization", delegate: "company", timeFields: ["createdAt", "updatedAt"] },
  { module: "identity-organization", delegate: "agency", timeFields: ["createdAt", "updatedAt"] },
  { module: "identity-organization", delegate: "department", timeFields: ["createdAt", "updatedAt"] },
  { module: "identity-organization", delegate: "employee", timeFields: ["createdAt", "updatedAt"] },
  { module: "identity-organization", delegate: "userAccount", timeFields: ["createdAt", "updatedAt"] },
  { module: "identity-organization", delegate: "lineAccount", timeFields: ["linkedAt", "updatedAt"] },
  { module: "identity-organization", delegate: "role", timeFields: ["createdAt", "updatedAt"] },
  { module: "identity-organization", delegate: "permission", timeFields: ["createdAt"] },
  { module: "identity-organization", delegate: "userRole", timeFields: ["assignedAt"], orderBy: [{ userAccountId: "asc" }, { roleId: "asc" }] },
  { module: "approvals", delegate: "approvalPolicy", timeFields: ["createdAt", "updatedAt"] },
  { module: "approvals", delegate: "approvalPolicyStep", timeFields: ["createdAt"] },
  { module: "approvals", delegate: "approvalDelegation", timeFields: ["createdAt", "cancelledAt"] },
  { module: "approvals", delegate: "approvalInstance", timeFields: ["createdAt", "updatedAt", "decidedAt"] },
  { module: "approvals", delegate: "approvalStep", timeFields: ["createdAt", "assignedAt", "decidedAt", "lastReminderAt"] },
  { module: "leave", delegate: "leaveType", timeFields: ["createdAt", "updatedAt"] },
  { module: "leave", delegate: "leaveEntitlement", timeFields: ["createdAt", "updatedAt"] },
  { module: "leave", delegate: "leaveRequest", timeFields: ["submittedAt", "updatedAt"] },
  { module: "attendance", delegate: "attendanceRecord", timeFields: ["createdAt", "updatedAt"] },
  { module: "attendance", delegate: "attendanceCalculation", timeFields: ["calculatedAt"] },
  { module: "attendance", delegate: "attendancePolicy", timeFields: ["createdAt", "updatedAt"] },
  { module: "attendance", delegate: "timeCorrectionRequest", timeFields: ["requestedAt", "decidedAt", "updatedAt"] },
  { module: "overtime", delegate: "overtimeRequest", timeFields: ["submittedAt", "updatedAt"] },
  { module: "overtime", delegate: "overtimeSegment", timeFields: ["createdAt", "confirmedAt"] },
  { module: "overtime", delegate: "overtimeAllowancePolicy", timeFields: ["updatedAt"] },
  { module: "overtime", delegate: "professionalRole", timeFields: ["createdAt", "updatedAt"] },
  { module: "overtime", delegate: "employeeProfessionalRole", timeFields: ["assignedAt"], orderBy: [{ employeeId: "asc" }, { professionalRoleId: "asc" }] },
  { module: "medical", delegate: "benefitPolicy", timeFields: ["createdAt", "updatedAt"] },
  { module: "medical", delegate: "medicalClaim", timeFields: ["submittedAt", "updatedAt"] },
  { module: "calendar", delegate: "holiday", timeFields: ["createdAt", "updatedAt"] },
  { module: "calendar", delegate: "weeklyWorkRule", timeFields: ["createdAt", "updatedAt"] },
  { module: "attachments", delegate: "attachment", timeFields: ["createdAt", "updatedAt", "finalizedAt"] },
  { module: "attachments", delegate: "employeeMedia", timeFields: ["createdAt"] },
  { module: "announcements", delegate: "announcement", timeFields: ["createdAt", "updatedAt", "publishedAt"] },
  { module: "notifications", delegate: "notificationOutbox", timeFields: ["createdAt", "updatedAt", "availableAt"] },
  { module: "notifications", delegate: "notificationDelivery", timeFields: ["createdAt", "attemptedAt"] },
  { module: "notifications", delegate: "inAppNotification", timeFields: ["createdAt", "readAt"] },
  { module: "audit", delegate: "auditLog", timeFields: ["occurredAt"] },
  { module: "technical", delegate: "idempotencyKey", timeFields: ["createdAt"] },
]);

const RELATION_SOURCES = Object.freeze([
  { module: "identity-organization", delegate: "rolePermission", auditEntityType: "Role", parentDelegate: "role", parentField: "roleId" },
  { module: "leave", delegate: "leaveTypeAlias", auditEntityType: "LeaveType", parentDelegate: "leaveType", parentField: "leaveTypeId" },
  { module: "attachments", delegate: "leaveRequestAttachment", auditEntityType: "LeaveRequest", parentDelegate: "leaveRequest", parentField: "leaveRequestId", attachmentField: "attachmentId" },
  { module: "attachments", delegate: "overtimeRequestAttachment", auditEntityType: "OvertimeRequest", parentDelegate: "overtimeRequest", parentField: "overtimeRequestId", attachmentField: "attachmentId" },
  { module: "attachments", delegate: "medicalClaimAttachment", auditEntityType: "MedicalClaim", parentDelegate: "medicalClaim", parentField: "medicalClaimId", attachmentField: "attachmentId" },
  { module: "attachments", delegate: "announcementAttachment", auditEntityType: "Announcement", parentDelegate: "announcement", parentField: "announcementId", attachmentField: "attachmentId" },
]);

const SENSITIVE_KEYS = /password|secret|token|authorization|lastError|^error$/i;

function stripSensitiveFields(value) {
  if (Array.isArray(value)) return value.map(stripSensitiveFields);
  if (typeof value === "bigint") return value.toString();
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  if (value.constructor?.name === "Decimal" && typeof value.toString === "function") return value.toString();
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEYS.test(key))
      .map(([key, child]) => [key, stripSensitiveFields(child)]),
  );
}

function markerDate(marker) {
  const date = new Date(marker?.cutoverAt ?? "");
  if (!marker || marker.schemaVersion !== 1 || !Number.isFinite(date.getTime())) {
    throw new Error("Cutover marker must have schemaVersion=1 and a valid cutoverAt.");
  }
  if (typeof marker.runId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(marker.runId)) {
    throw new Error("Cutover marker must have a UUID runId.");
  }
  return date;
}

export function assertOutsideRepository(filePath, repositoryRoot) {
  const absolutePath = path.resolve(filePath);
  const absoluteRoot = path.resolve(repositoryRoot);
  const relative = path.relative(absoluteRoot, absolutePath);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Cutover marker and export files must be outside the repository.");
  }
  return absolutePath;
}

export async function ensureOutsideRepositoryPath(filePath, repositoryRoot) {
  const lexicalPath = assertOutsideRepository(filePath, repositoryRoot);
  const realRoot = await realpath(repositoryRoot);
  const gitRoots = new Set();
  const collectGitRoots = async (directory) => {
    let ancestor = directory;
    while (true) {
      try {
        await lstat(path.join(ancestor, ".git"));
        gitRoots.add(ancestor);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      const parent = path.dirname(ancestor);
      if (parent === ancestor) break;
      ancestor = parent;
    }
  };
  await collectGitRoots(realRoot);
  const assertOutsideGitRoots = (candidate) => {
    for (const gitRoot of gitRoots) {
      const relative = path.relative(gitRoot, candidate);
      if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
        throw new Error("Cutover marker and export files must be outside every Git checkout, including the primary checkout.");
      }
    }
  };
  const requestedDirectory = path.dirname(lexicalPath);
  let existingDirectory = requestedDirectory;
  let realExistingDirectory;
  while (!realExistingDirectory) {
    try {
      realExistingDirectory = await realpath(existingDirectory);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parent = path.dirname(existingDirectory);
      if (parent === existingDirectory) throw error;
      existingDirectory = parent;
    }
  }
  await collectGitRoots(realExistingDirectory);
  const unresolvedPath = path.relative(existingDirectory, requestedDirectory);
  const prospectiveDirectory = path.resolve(realExistingDirectory, unresolvedPath);
  assertOutsideGitRoots(path.join(prospectiveDirectory, path.basename(lexicalPath)));
  const prospectiveRelative = path.relative(realRoot, prospectiveDirectory);
  if (prospectiveRelative === "" || (!prospectiveRelative.startsWith(`..${path.sep}`) && prospectiveRelative !== ".." && !path.isAbsolute(prospectiveRelative))) {
    throw new Error("Cutover marker and export files must resolve outside the repository.");
  }
  await mkdir(requestedDirectory, { recursive: true });
  const realDirectory = await realpath(requestedDirectory);
  await collectGitRoots(realDirectory);
  const realPath = path.join(realDirectory, path.basename(lexicalPath));
  assertOutsideGitRoots(realPath);
  try {
    const realOutputPath = await realpath(realPath);
    await collectGitRoots(path.dirname(realOutputPath));
    assertOutsideGitRoots(realOutputPath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const relative = path.relative(realRoot, realPath);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Cutover marker and export files must resolve outside the repository.");
  }
  return realPath;
}

export function assertPostCutoverExportEnvironment(env = process.env) {
  if (env.CKACE_SYSTEM_WRITE_MODE !== "READ_ONLY") {
    throw new Error("Post-cutover export requires CKACE_SYSTEM_WRITE_MODE=READ_ONLY.");
  }
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("Post-cutover export requires DATABASE_URL.");

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Post-cutover export requires a valid PostgreSQL DATABASE_URL.");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("Post-cutover export only supports PostgreSQL.");
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, "").split("/")[0] ?? "");
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(hostname);
  const stage = env.CKACE_RUNTIME_STAGE?.trim().toLowerCase();

  if (stage === "dev") {
    if (env.CKACE_MIGRATION_JOB !== "YES") {
      throw new Error("DEV export requires CKACE_MIGRATION_JOB=YES.");
    }
    if (!isLoopback || databaseName !== "ckace_hr_dev") {
      throw new Error("DEV export is restricted to loopback PostgreSQL ckace_hr_dev.");
    }
    if (env.CKACE_PROD_EXPORT_CONFIRM === "YES") {
      throw new Error("Remove CKACE_PROD_EXPORT_CONFIRM when exporting DEV rehearsal data.");
    }
    return { stage, databaseName };
  }

  if (stage === "production") {
    if (env.CKACE_PROD_EXPORT_CONFIRM !== "YES") {
      throw new Error("Production export requires CKACE_PROD_EXPORT_CONFIRM=YES after separate Owner approval.");
    }
    if (isLoopback || databaseName !== "ckace_hr_prod") {
      throw new Error("Production export is restricted to a non-loopback ckace_hr_prod database.");
    }
    return { stage, databaseName };
  }

  throw new Error("Post-cutover export is allowed only for guarded DEV rehearsal or explicitly confirmed Production.");
}

export function createCutoverMarker({ now = new Date(), runId }) {
  const timestamp = new Date(now);
  if (!Number.isFinite(timestamp.getTime())) throw new Error("Cutover marker time is invalid.");
  const marker = {
    schemaVersion: 1,
    cutoverAt: timestamp.toISOString(),
    runId,
  };
  markerDate(marker);
  return marker;
}

function relationIdSet(auditEvents, entityType, rowsByDelegate, delegate) {
  const fromAudit = auditEvents
    .filter((event) => event.entityType === entityType && typeof event.entityId === "string")
    .map((event) => event.entityId);
  const fromRows = (rowsByDelegate[delegate] ?? [])
    .map((row) => row.id)
    .filter((id) => typeof id === "string");
  return [...new Set([...fromAudit, ...fromRows])];
}

export async function collectPostCutoverExport({ prisma, marker, now = new Date() }) {
  const cutoff = markerDate(marker);
  const rowsByDelegate = {};
  const modules = {};

  for (const source of POST_CUTOVER_SOURCES) {
    const delegate = prisma[source.delegate];
    if (!delegate || typeof delegate.findMany !== "function") {
      throw new Error(`Prisma delegate ${source.delegate} is unavailable; export stopped without a partial file.`);
    }
    const rows = await delegate.findMany({
      where: { OR: source.timeFields.map((field) => ({ [field]: { gte: cutoff } })) },
      orderBy: source.orderBy ?? { id: "asc" },
    });
    const sanitized = rows.map(stripSensitiveFields);
    rowsByDelegate[source.delegate] = sanitized;
    modules[source.module] ??= {};
    modules[source.module][source.delegate] = sanitized;
  }

  const auditEvents = rowsByDelegate.auditLog ?? [];
  for (const source of RELATION_SOURCES) {
    const delegate = prisma[source.delegate];
    if (!delegate || typeof delegate.findMany !== "function") {
      throw new Error(`Prisma delegate ${source.delegate} is unavailable; export stopped without a partial file.`);
    }
    const parentIds = relationIdSet(auditEvents, source.auditEntityType, rowsByDelegate, source.parentDelegate);
    const attachmentIds = source.attachmentField
      ? (rowsByDelegate.attachment ?? []).map((row) => row.id).filter((id) => typeof id === "string")
      : [];
    const clauses = [];
    if (parentIds.length > 0) clauses.push({ [source.parentField]: { in: parentIds } });
    if (source.attachmentField && attachmentIds.length > 0) {
      clauses.push({ [source.attachmentField]: { in: attachmentIds } });
    }
    const rows = clauses.length === 0
      ? []
      : await delegate.findMany({
          where: clauses.length === 1 ? clauses[0] : { OR: clauses },
          orderBy: { [source.parentField]: "asc" },
        });
    const sanitized = rows.map(stripSensitiveFields);
    rowsByDelegate[source.delegate] = sanitized;
    modules[source.module] ??= {};
    modules[source.module][source.delegate] = sanitized;
  }

  const countsByModule = Object.fromEntries(
    Object.entries(modules).map(([module, tables]) => [
      module,
      Object.values(tables).reduce((total, rows) => total + rows.length, 0),
    ]),
  );
  const auditEventCount = auditEvents.length;
  const reportEvents = auditEvents.filter((event) => /REPORT/i.test(event.action));
  modules.reports = {
    derivedFrom: ["leave", "attendance", "overtime", "medical"],
    reportEvents: reportEvents.map(stripSensitiveFields),
  };
  countsByModule.reports = reportEvents.length;
  const totalRecords = Object.values(countsByModule).reduce((total, count) => total + count, 0);

  return {
    schemaVersion: 1,
    kind: "CKACE_POST_CUTOVER_MANUAL_RECOVERY_EXPORT",
    cutoverAt: cutoff.toISOString(),
    runId: marker.runId,
    generatedAt: new Date(now).toISOString(),
    databaseReadOnly: true,
    counts: { totalRecords, countsByModule, auditEventCount, reportEventCount: reportEvents.length },
    modules,
    recoveryNotes: [
      "Rows are current scalar snapshots whose create/update/decision timestamps are at or after the cutover marker.",
      "Audit events are included to preserve actions and deletions that no longer have a current row snapshot.",
      "Notification rows are evidence only; do not resend messages automatically during manual recovery.",
      "Report aggregates are reconstructed from canonical module records; report-export audit events remain in the audit module.",
      "Attachment metadata and checksums are included, but R2 object bytes are not embedded; retain restricted R2 read access until any manual recovery is reconciled.",
      "This file contains personal and potentially medical data. Store it only in an encrypted, access-restricted location outside Git.",
    ],
  };
}

export async function readPostCutoverExport({ prisma, marker, env = process.env, now = new Date() }) {
  const expected = assertPostCutoverExportEnvironment(env);
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    const attestation = await transaction.$queryRawUnsafe("SELECT current_database() AS database_name");
    if (attestation[0]?.database_name !== expected.databaseName) {
      throw new Error(`Connected database did not attest as ${expected.databaseName}; export aborted.`);
    }
    const result = await collectPostCutoverExport({ prisma: transaction, marker, now });
    return { ...result, database: expected.databaseName, runtimeStage: expected.stage };
  }, { isolationLevel: "RepeatableRead" });
}
