import type {
  LegacyExtractedRecord,
  LegacySourceSnapshot,
  JsonValue,
  MigrationRecordOutcome,
  MigrationRunReport,
  MigrationTargetStore,
  MigrationTransformer,
  PendingApprovalHandoffReport,
  PendingApprovalSourceRequest,
} from "./migration-contracts";
import { legacyProvenanceKey } from "@ckace/contracts";
import { vacationEntitlementForYear } from "@ckace/business-rules";
import { mapLegacyLeaveType } from "./legacy-mappings";
import { runMigration } from "./engine";
import {
  attendanceRecordTransformer,
  timeCorrectionTransformer,
} from "./attendance";
import {
  leaveApprovalStepTransformer,
  leaveAttachmentTransformer,
  leaveEntitlementTransformer,
  leaveRequestTransformer,
} from "./leave";
import {
  medicalApprovalStepTransformer,
  medicalAttachmentTransformer,
  medicalClaimTransformer,
} from "./medical";
import {
  overtimeApprovalStepTransformer,
  overtimeRequestTransformer,
} from "./overtime";
import {
  agencyTransformer,
  departmentTransformer,
  holidayTransformer,
  weeklyWorkRuleTransformer,
} from "./organization";
import { identityProfileTransformer } from "./identity-profile";
import { extractReadOnlySnapshot, canonicalJson, sha256Hex } from "./source-snapshot";
import type { ReadOnlyLegacySource } from "./migration-contracts";

const TAB_ORDER: Readonly<Record<string, number>> = Object.freeze({
  Agency: 1,
  Departments: 2,
  Users: 3,
  UserPolicies: 4,
  Holidays: 5,
  DayOfWeek: 6,
  LeaveRequests_2025: 7,
  LeaveRequests: 7,
  OvertimeRequests: 8,
  TimeLog_2025: 9,
  TimeLog: 9,
  TimeCorrections: 10,
  MedicalClaims_2025: 11,
  MedicalClaims: 11,
  ApprovalSteps: 12,
  OT_ApprovalSteps: 12,
  Medical_ApprovalSteps: 12,
  Attachments: 13,
  MedicalAttachments: 13,
});

const TRANSFORMERS: Readonly<Record<string, MigrationTransformer>> = Object.freeze({
  Agency: agencyTransformer,
  Departments: departmentTransformer,
  Users: identityProfileTransformer,
  UserPolicies: leaveEntitlementTransformer,
  Holidays: holidayTransformer,
  DayOfWeek: weeklyWorkRuleTransformer,
  LeaveRequests: leaveRequestTransformer,
  LeaveRequests_2025: leaveRequestTransformer,
  ApprovalSteps: leaveApprovalStepTransformer,
  TimeLog: attendanceRecordTransformer,
  TimeLog_2025: attendanceRecordTransformer,
  TimeCorrections: timeCorrectionTransformer,
  OvertimeRequests: overtimeRequestTransformer,
  OT_ApprovalSteps: overtimeApprovalStepTransformer,
  MedicalClaims: medicalClaimTransformer,
  MedicalClaims_2025: medicalClaimTransformer,
  Medical_ApprovalSteps: medicalApprovalStepTransformer,
  Attachments: leaveAttachmentTransformer,
  MedicalAttachments: medicalAttachmentTransformer,
});

interface AttendanceLogCollision {
  readonly compositeLegacyId: string | null;
  readonly exception: {
    readonly code: string;
    readonly detail: string;
    readonly disposition: string;
    readonly sourceLogId: string;
    readonly employeeLegacyIds: readonly string[];
  } | null;
}

function attendanceRowKey(record: LegacyExtractedRecord): string {
  return `${record.provenance.sourceTab}::${record.rowNumber}`;
}

function resolveAttendanceLogCollisions(
  records: readonly LegacyExtractedRecord[],
): ReadonlyMap<string, AttendanceLogCollision> {
  const groups = new Map<string, LegacyExtractedRecord[]>();
  for (const record of records) {
    if (!["TimeLog", "TimeLog_2025"].includes(record.provenance.sourceTab)) continue;
    const rawLogId = record.values.LogID;
    if (typeof rawLogId !== "string" && typeof rawLogId !== "number") continue;
    const logId = String(rawLogId).trim();
    if (!logId || record.provenance.legacyId !== `${logId}::ROW:${record.rowNumber}`) continue;
    const key = `${record.provenance.sourceTab}::${record.provenance.sourcePeriod}::${logId}`;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  const result = new Map<string, AttendanceLogCollision>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const rawLogId = group[0]?.values.LogID;
    const sourceLogId = typeof rawLogId === "string" || typeof rawLogId === "number"
      ? String(rawLogId).trim()
      : "";
    const employeeIds = group.map((record) => {
      const value = record.values.UserID;
      return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
    });
    const allEmployeesAreDistinct = employeeIds.every(Boolean) && new Set(employeeIds).size === group.length;
    const stableEmployeeIds = [...new Set(employeeIds.filter(Boolean))].sort((left, right) => left.localeCompare(right));
    const exception = allEmployeesAreDistinct
      ? {
          code: "ATTENDANCE_LOG_ID_REUSED_ACROSS_EMPLOYEES",
          detail: `GAS reused source LogID ${sourceLogId} for distinct employees ${stableEmployeeIds.join(", ")}.`,
          disposition: "OWNER_APPROVED_IMPORT_ALL_DISTINCT_EMPLOYEE_ROWS_WITH_LOG_ID_AND_USER_ID_PROVENANCE",
          sourceLogId,
          employeeLegacyIds: stableEmployeeIds,
        }
      : null;
    for (const record of group) {
      const value = record.values.UserID;
      const employeeLegacyId = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
      result.set(attendanceRowKey(record), {
        compositeLegacyId: exception && employeeLegacyId
          ? `${sourceLogId}::USER:${employeeLegacyId}`
          : null,
        exception,
      });
    }
  }
  return result;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (ddmmyyyy) {
    const year = Number(ddmmyyyy[3]);
    const month = Number(ddmmyyyy[2]);
    const day = Number(ddmmyyyy[1]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? date
      : null;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? date
      : null;
  }
  return null;
}

function calculatedQuota(leaveType: string, employmentStart: unknown, employeeLegacyId: string): number | null {
  let key: string;
  try {
    key = mapLegacyLeaveType(leaveType);
  } catch {
    return null;
  }
  if (key === "PERSONAL") return 6;
  if (key === "SICK") return 30;
  if (key !== "ANNUAL") return null;
  const start = parseDate(employmentStart);
  if (!start) return null;
  if (employeeLegacyId === "USER-008" && start.toISOString().slice(0, 10) === "2567-04-17") {
    start.setUTCFullYear(2024);
  }
  try {
    return vacationEntitlementForYear({
      employmentStart: start.toISOString().slice(0, 10),
      leaveYear: 2026,
    });
  } catch {
    return null;
  }
}

function recordWith(record: LegacyExtractedRecord, additions: Readonly<Record<string, JsonValue>>): LegacyExtractedRecord {
  return {
    ...record,
    values: { ...record.values, ...additions },
  };
}

function requestCandidates(records: readonly LegacyExtractedRecord[], tabs: readonly string[]): ReadonlyMap<string, readonly LegacyExtractedRecord[]> {
  const result = new Map<string, LegacyExtractedRecord[]>();
  for (const record of records) {
    if (!tabs.includes(record.provenance.sourceTab)) continue;
    const id = record.provenance.legacyId;
    const candidates = result.get(id) ?? [];
    candidates.push(record);
    result.set(id, candidates);
  }
  return result;
}

function dateYear(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (ddmmyyyy) return Number(ddmmyyyy[3]);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return iso ? Number(iso[1]) : null;
}

function firstDateYear(record: LegacyExtractedRecord, keys: readonly string[]): number | null {
  for (const key of keys) {
    const year = dateYear(record.values[key]);
    if (year !== null) return year;
  }
  return null;
}

function resolveRequestPeriod(input: {
  readonly candidates: ReadonlyMap<string, readonly LegacyExtractedRecord[]>;
  readonly requestId: string;
  readonly requestDateKeys: readonly string[];
  readonly approvalStep: LegacyExtractedRecord;
  readonly approvalDateKeys: readonly string[];
}): string | null {
  const candidates = input.candidates.get(input.requestId) ?? [];
  if (candidates.length === 1) {
    return candidates[0]?.provenance.sourcePeriod ?? "CURRENT";
  }
  if (candidates.length < 1) return null;
  const approvalYear = firstDateYear(input.approvalStep, input.approvalDateKeys);
  if (approvalYear === null) return null;
  const matches = candidates.filter((candidate) =>
    firstDateYear(candidate, input.requestDateKeys) === approvalYear,
  );
  return matches.length === 1
    ? matches[0]?.provenance.sourcePeriod ?? "CURRENT"
    : null;
}

function dispatcher(
  records: readonly LegacyExtractedRecord[],
  leaveCandidates: ReadonlyMap<string, readonly LegacyExtractedRecord[]>,
  medicalCandidates: ReadonlyMap<string, readonly LegacyExtractedRecord[]>,
  attendanceCollisions: ReadonlyMap<string, AttendanceLogCollision>,
): MigrationTransformer {
  const pendingRequests = sourcePendingRequests(records, leaveCandidates, medicalCandidates);
  const pendingByKey = new Map(pendingRequests.map((request) => [request.provenanceKey, request]));
  const requestStatusByKey = new Map<string, string>();
  for (const record of records) {
    if (!isRequestTab(record.provenance.sourceTab)) continue;
    const base = TRANSFORMERS[record.provenance.sourceTab]?.transform(record);
    if (base?.action === "IMPORT" && base.payload && typeof base.payload === "object" && !Array.isArray(base.payload)) {
      const payload = base.payload as Readonly<Record<string, JsonValue>>;
      const status = payload.status;
      if (typeof status === "string") requestStatusByKey.set(legacyProvenanceKey(record.provenance), status);
    }
  }
  return {
    version: "xlsx-import-dispatch-v2",
    transform(input) {
      const tab = input.provenance.sourceTab;
      const collision = attendanceCollisions.get(attendanceRowKey(input));
      if (collision && !collision.exception) {
        return {
          action: "REJECT",
          code: "ATTENDANCE_DUPLICATE_SOURCE_LOG_ID",
          reason: "A source LogID is duplicated within one employee or has no unique employee mapping; every colliding row remains rejected.",
        };
      }
      let record = collision?.compositeLegacyId
        ? {
            ...input,
            provenance: { ...input.provenance, legacyId: collision.compositeLegacyId },
          }
        : input;
      if (tab === "UserPolicies") {
        const employeeLegacyId = input.values.UserID;
        const users = records.filter((candidate) => candidate.provenance.sourceTab === "Users" && candidate.provenance.legacyId === employeeLegacyId);
        if (users.length !== 1) return { action: "REJECT", code: "LEAVE_POLICY_EMPLOYEE_NOT_UNIQUE", reason: "UserPolicies row has no unique Users source row" };
        if (["USER-001", "USER-002"].includes(String(employeeLegacyId))) {
          return { action: "SKIP", code: "OWNER_SUPERADMIN_NO_LEAVE", reason: "Owner-confirmed SuperAdmin accounts have no leave entitlement", disposition: "NO_ENTITLEMENT_CREATED" };
        }
        const targetQuota = calculatedQuota(
          String(input.values.LeaveType ?? ""),
          users[0]?.values.startDate,
          String(employeeLegacyId),
        );
        if (targetQuota === null) return { action: "REJECT", code: "LEAVE_POLICY_TARGET_QUOTA_UNAVAILABLE", reason: "Employment date or leave type cannot be reconciled to the 2026 system policy" };
        record = recordWith(input, { targetQuota });
      }
      if (tab === "ApprovalSteps") {
        const requestId = String(input.values.requestId ?? "");
        const period = resolveRequestPeriod({
          candidates: leaveCandidates,
          requestId,
          requestDateKeys: ["submitDate", "startDate"],
          approvalStep: input,
          approvalDateKeys: ["assignedAt", "approvedAt"],
        });
        if (!period) return { action: "REJECT", code: "LEAVE_APPROVAL_REQUEST_PERIOD_AMBIGUOUS", reason: "Approval step cannot be matched to exactly one current/archive request by source date" };
        record = recordWith(input, { __legacyRequestPeriod: period });
      }
      if (tab === "Medical_ApprovalSteps") {
        const requestId = String(input.values.ClaimID ?? input.values.RequestID ?? "");
        const period = resolveRequestPeriod({
          candidates: medicalCandidates,
          requestId,
          requestDateKeys: ["ClaimDate", "SicknessDate"],
          approvalStep: input,
          approvalDateKeys: ["assigned_date", "approved_date"],
        });
        if (!period) return { action: "REJECT", code: "MEDICAL_APPROVAL_REQUEST_PERIOD_AMBIGUOUS", reason: "Medical approval step cannot be matched to exactly one current/archive claim by source date" };
        record = recordWith(input, { __legacyRequestPeriod: period });
      }
      if (tab === "Attachments" || tab === "MedicalAttachments") {
        const url = input.values.FileURL ?? input.values.fileUrl ?? input.values.file_url;
        if (typeof url !== "string" || !url.trim() || /^\[.*\]$/.test(url.trim())) {
          return { action: "SKIP", code: "SANITIZED_ATTACHMENT_BYTES_UNAVAILABLE", reason: "Sanitized snapshot has no usable source URL or file bytes", disposition: "BLOCK_ATTACHMENT_ACCEPTANCE_UNTIL_OWNER_SUPPLIES_A_SAFE_FILE_SNAPSHOT" };
        }
      }
      const transformer = TRANSFORMERS[tab];
      if (!transformer) return { action: "SKIP", code: "NO_IMPORT_SOURCE_FOR_MODULE", reason: "No source row or importer is defined for this tab", disposition: "DO_NOT_SYNTHESIZE_SOURCE_DATA" };
      const decision = transformer.transform(record);
      if (isApprovalTab(tab) && decision.action === "IMPORT") {
        const payload = decision.payload as Readonly<Record<string, JsonValue>>;
        const status = payload.normalizedStatus ?? payload.status;
        const requestKey = typeof payload.currentRequestProvenanceKey === "string"
          ? payload.currentRequestProvenanceKey
          : typeof payload.requestProvenanceKey === "string" ? payload.requestProvenanceKey : null;
        if (status === "PENDING" && requestKey) {
          if (requestStatusByKey.get(requestKey) === "PENDING" && pendingByKey.has(requestKey)) {
            return {
              action: "SKIP",
              code: "LEGACY_PENDING_APPROVAL_REPLACED_BY_CURRENT_POLICY",
              reason: "Pending GAS approver is retained in the handoff report; current target policy assigns new pending steps.",
              disposition: "PRESERVE_DECIDED_HISTORY_AND_REQUIRE_HR_REVIEW_OF_APPROVER_CHANGES",
            };
          }
          return {
            action: "IMPORT",
            targetEntityType: decision.targetEntityType,
            payload: {
              ...payload,
              normalizedStatus: "SKIPPED",
              status: "SKIPPED",
              exceptionCode: "TERMINAL_REQUEST_HAS_PENDING_STEP",
            } as JsonValue,
          };
        }
      }
      if (collision?.exception && decision.action === "IMPORT") {
        const payload = decision.payload;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) return decision;
        return {
          ...decision,
          payload: {
            ...payload,
            sourceException: {
              code: collision.exception.code,
              sourceLogId: collision.exception.sourceLogId,
              employeeLegacyIds: collision.exception.employeeLegacyIds,
              disposition: collision.exception.disposition,
            },
          } as JsonValue,
          exception: {
            code: collision.exception.code,
            detail: collision.exception.detail,
            disposition: collision.exception.disposition,
          },
        };
      }
      return decision;
    },
  };
}

const REQUEST_KIND_BY_ENTITY = Object.freeze({
  leave_request: "LEAVE",
  time_correction_request: "TIME_CORRECTION",
  overtime_request_bundle: "OVERTIME",
  medical_claim: "MEDICAL",
} as const);

const REQUEST_TABS = new Set([
  "LeaveRequests", "LeaveRequests_2025", "TimeCorrections",
  "OvertimeRequests", "MedicalClaims", "MedicalClaims_2025",
]);

const APPROVAL_TABS = new Set(["ApprovalSteps", "OT_ApprovalSteps", "Medical_ApprovalSteps"]);

function isRequestTab(tab: string): boolean {
  return REQUEST_TABS.has(tab);
}

function isApprovalTab(tab: string): boolean {
  return APPROVAL_TABS.has(tab);
}

function sourcePendingRequests(
  records: readonly LegacyExtractedRecord[],
  leaveCandidates: ReadonlyMap<string, readonly LegacyExtractedRecord[]>,
  medicalCandidates: ReadonlyMap<string, readonly LegacyExtractedRecord[]>,
): PendingApprovalSourceRequest[] {
  const requests = new Map<string, PendingApprovalSourceRequest>();
  for (const record of records) {
    if (!isRequestTab(record.provenance.sourceTab)) continue;
    const transformer = TRANSFORMERS[record.provenance.sourceTab];
    const decision = transformer?.transform(record);
    if (decision?.action !== "IMPORT" || typeof decision.payload !== "object" || Array.isArray(decision.payload)) continue;
    const payload = decision.payload as Readonly<Record<string, JsonValue>>;
    if (payload.status !== "PENDING") continue;
    const targetEntityType = decision.targetEntityType as keyof typeof REQUEST_KIND_BY_ENTITY;
    const requestKind = REQUEST_KIND_BY_ENTITY[targetEntityType];
    const requesterLegacyId = payload.employeeLegacyId;
    if (!requestKind || typeof requesterLegacyId !== "string") continue;
    const provenanceKey = legacyProvenanceKey(record.provenance);
    const legacyPendingSteps: { stepOrder: number; approverLegacyId: string }[] = [];
    if (targetEntityType === "time_correction_request" && typeof payload.assignedApproverLegacyId === "string") {
      legacyPendingSteps.push({ stepOrder: 1, approverLegacyId: payload.assignedApproverLegacyId });
    }
    requests.set(provenanceKey, {
      provenanceKey,
      targetEntityType,
      requestKind,
      requesterLegacyId,
      legacyPendingSteps,
    });
  }

  for (const record of records) {
    if (!isApprovalTab(record.provenance.sourceTab)) continue;
    const tab = record.provenance.sourceTab;
    let stepRecord = record;
    if (tab === "ApprovalSteps") {
      const requestId = String(record.values.requestId ?? "");
      const period = resolveRequestPeriod({
        candidates: leaveCandidates,
        requestId,
        requestDateKeys: ["submitDate", "startDate"],
        approvalStep: record,
        approvalDateKeys: ["assignedAt", "approvedAt"],
      });
      if (!period) continue;
      stepRecord = recordWith(record, { __legacyRequestPeriod: period });
    } else if (tab === "Medical_ApprovalSteps") {
      const requestId = String(record.values.ClaimID ?? record.values.RequestID ?? "");
      const period = resolveRequestPeriod({
        candidates: medicalCandidates,
        requestId,
        requestDateKeys: ["ClaimDate", "SicknessDate"],
        approvalStep: record,
        approvalDateKeys: ["assigned_date", "approved_date"],
      });
      if (!period) continue;
      stepRecord = recordWith(record, { __legacyRequestPeriod: period });
    }
    const decision = TRANSFORMERS[tab]?.transform(stepRecord);
    if (decision?.action !== "IMPORT" || typeof decision.payload !== "object" || Array.isArray(decision.payload)) continue;
    const payload = decision.payload as Readonly<Record<string, JsonValue>>;
    if ((payload.normalizedStatus ?? payload.status) !== "PENDING") continue;
    const requestKey = payload.currentRequestProvenanceKey ?? payload.requestProvenanceKey;
    if (typeof requestKey !== "string") continue;
    const request = requests.get(requestKey);
    if (!request) continue;
    const approverLegacyId = payload.approverLegacyId;
    const stepOrder = payload.stepOrder;
    if (typeof approverLegacyId !== "string" || typeof stepOrder !== "number") continue;
    const legacyPendingSteps = [...request.legacyPendingSteps, { stepOrder, approverLegacyId }]
      .sort((left, right) => left.stepOrder - right.stepOrder);
    requests.set(request.provenanceKey, { ...request, legacyPendingSteps });
  }

  return [...requests.values()].map((request) => ({
    ...request,
    legacyPendingSteps: [...request.legacyPendingSteps],
  }));
}

export interface XlsxImportResult {
  readonly report: MigrationRunReport;
  readonly sourceSnapshots: readonly LegacySourceSnapshot[];
  readonly countsByTab: Readonly<Record<string, number>>;
  readonly outcomesByTab: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly outcomeDetails: readonly {
    readonly sourceTab: string;
    readonly legacyId: string;
    readonly status: MigrationRunReport["outcomes"][number]["status"];
    readonly code: string | null;
  }[];
  readonly pendingApprovalHandoff?: PendingApprovalHandoffReport;
}

export async function runXlsxImport(input: {
  readonly sources: readonly ReadOnlyLegacySource[];
  readonly migrationRunId: string;
  readonly extractedAt: string;
  readonly targetStore: MigrationTargetStore;
}): Promise<XlsxImportResult> {
  const sourceSnapshots: LegacySourceSnapshot[] = [];
  for (const source of input.sources) {
    sourceSnapshots.push(await extractReadOnlySnapshot({
      source,
      migrationRunId: input.migrationRunId,
      extractedAt: input.extractedAt,
    }));
  }
  const allRecords = sourceSnapshots.flatMap((snapshot) => snapshot.records)
    .sort((left, right) =>
      (TAB_ORDER[left.provenance.sourceTab] ?? 99) - (TAB_ORDER[right.provenance.sourceTab] ?? 99) ||
      left.rowNumber - right.rowNumber,
    );
  const attendanceCollisions = resolveAttendanceLogCollisions(allRecords);
  const importRecords = allRecords.map((record) => {
    const collision = attendanceCollisions.get(attendanceRowKey(record));
    return collision?.compositeLegacyId
      ? { ...record, provenance: { ...record.provenance, legacyId: collision.compositeLegacyId } }
      : record;
  });
  const countsByTab = sourceSnapshots.reduce<Record<string, number>>((counts, snapshot) => {
    counts[snapshot.descriptor.sourceTab] = 0;
    return counts;
  }, {});
  for (const record of allRecords) {
    countsByTab[record.provenance.sourceTab] = (countsByTab[record.provenance.sourceTab] ?? 0) + 1;
  }
  const combinedSnapshot: LegacySourceSnapshot = {
    descriptor: {
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "sanitized-xlsx-snapshot-bundle",
      sourceTab: "ALL",
      sourcePeriod: null,
    },
    snapshotHash: sha256Hex(canonicalJson(sourceSnapshots.map((snapshot) => snapshot.snapshotHash))),
    extractedAt: new Date(input.extractedAt).toISOString(),
    records: importRecords,
  };
  const leaveCandidates = requestCandidates(allRecords, ["LeaveRequests", "LeaveRequests_2025"]);
  const medicalCandidates = requestCandidates(allRecords, ["MedicalClaims", "MedicalClaims_2025"]);
  const transformer = dispatcher(
    allRecords,
    leaveCandidates,
    medicalCandidates,
    attendanceCollisions,
  );
  const pendingRequests = sourcePendingRequests(
    allRecords,
    leaveCandidates,
    medicalCandidates,
  );
  await input.targetStore.prepareRun?.({
    migrationRunId: input.migrationRunId,
    sourceSnapshot: combinedSnapshot.snapshotHash,
    transformerVersion: transformer.version,
    pendingRequests,
  });
  const report = await runMigration({
    migrationRunId: input.migrationRunId,
    snapshot: combinedSnapshot,
    transformer,
    targetStore: input.targetStore,
  });
  const targetSummary = await input.targetStore.finishRun?.(report);
  const tabByKey = new Map<string, string>();
  for (const record of importRecords) {
    tabByKey.set(legacyProvenanceKey(record.provenance), record.provenance.sourceTab);
    const collision = attendanceCollisions.get(attendanceRowKey(record));
    if (collision?.compositeLegacyId) {
      tabByKey.set(
        legacyProvenanceKey({ ...record.provenance, legacyId: collision.compositeLegacyId }),
        record.provenance.sourceTab,
      );
    }
  }
  const outcomesByTab: Record<string, Record<string, number>> = {};
  const outcomeDetails: XlsxImportResult["outcomeDetails"][number][] = [];
  for (const outcome of report.outcomes) {
    const tab = tabByKey.get(outcome.provenanceKey) ?? "UNKNOWN";
    const counts = outcomesByTab[tab] ?? {};
    counts[outcome.status] = (counts[outcome.status] ?? 0) + 1;
    outcomesByTab[tab] = counts;
    outcomeDetails.push({
      sourceTab: tab,
      legacyId: outcome.legacyId,
      status: outcome.status,
      code: outcome.code,
    });
  }
  return {
    report,
    sourceSnapshots,
    countsByTab,
    outcomesByTab,
    outcomeDetails,
    ...(targetSummary?.pendingApprovalHandoff
      ? { pendingApprovalHandoff: targetSummary.pendingApprovalHandoff }
      : {}),
  };
}

export function summarizeOutcomes(outcomes: readonly MigrationRecordOutcome[]): Readonly<Record<string, number>> {
  return outcomes.reduce<Record<string, number>>((counts, outcome) => {
    counts[outcome.status] = (counts[outcome.status] ?? 0) + 1;
    return counts;
  }, {});
}
