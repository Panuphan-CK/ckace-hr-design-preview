import { randomUUID } from "node:crypto";

import { resolveCompanyApprovalRoute, type ApprovalRouteReader } from "@ckace/database";
import type { PrismaClient } from "@prisma/client";

import { planPendingApprovalHandoff, type CurrentPolicyApprovalStep, type HistoricalApprovalStep } from "./pending-approval-handoff";
import type {
  ExistingTargetRecord,
  JsonValue,
  MigrationRunReport,
  MigrationTargetStore,
  PendingApprovalHandoffReport,
  PendingApprovalSourceRequest,
  TargetCreateInput,
  TargetCreateResult,
} from "./migration-contracts";

type Row = Record<string, unknown>;
interface Delegate {
  findFirst(args: Row): Promise<Row | null>;
  findUnique(args: Row): Promise<Row | null>;
  findMany(args: Row): Promise<Row[]>;
  create(args: { data: Row }): Promise<Row>;
  upsert(args: { where: Row; create: Row; update: Row }): Promise<Row>;
  update(args: { where: Row; data: Row }): Promise<Row>;
  deleteMany(args: { where: Row }): Promise<{ count: number }>;
  createMany(args: { data: readonly Row[] }): Promise<{ count: number }>;
}

function delegate(client: object, modelName: string): Delegate {
  const model = (client as unknown as Record<string, unknown>)[modelName];
  if (!model || typeof model !== "object") {
    throw new Error(`Missing Prisma model ${modelName}`);
  }
  return model as Delegate;
}

function objectValue(value: JsonValue, label: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label} migration payload`);
  }
  return value as Row;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing ${label} in migration payload`);
  }
  return value.trim();
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateOnly(value: unknown, label: string): Date {
  const text = requiredText(value, label);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw new Error(`Invalid ${label} migration date`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.toISOString().slice(0, 10) !== text) throw new Error(`Invalid ${label} migration date`);
  return date;
}

function optionalDate(value: unknown, label: string): Date | null {
  return value === null || value === undefined || value === "" ? null : dateOnly(value, label);
}

function timestamp(value: unknown, label: string): Date {
  const text = requiredText(value, label);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${label} migration timestamp`);
  return date;
}

function optionalTimestamp(value: unknown, label: string): Date | null {
  return value === null || value === undefined || value === "" ? null : timestamp(value, label);
}

function clockTime(value: unknown, label: string): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`Invalid ${label} migration time`);
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] ?? 0) > 59) {
    throw new Error(`Invalid ${label} migration time`);
  }
  return new Date(Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2]), Number(match[3] ?? 0)));
}

function parseProvenanceKey(key: string): {
  sourceSystem: string;
  sourceWorkbook: string;
  sourceTab: string;
  sourcePeriod: string;
  legacyId: string;
} {
  const parts = key.split("::");
  if (parts.length < 5) throw new Error("Invalid migration provenance key");
  const [sourceSystem, sourceWorkbook, sourceTab, sourcePeriod, ...legacyIdParts] = parts;
  return {
    sourceSystem: sourceSystem ?? "",
    sourceWorkbook: sourceWorkbook ?? "",
    sourceTab: sourceTab ?? "",
    sourcePeriod: sourcePeriod || "CURRENT",
    legacyId: legacyIdParts.join("::"),
  };
}

function uniqueKey(provenance: ReturnType<typeof parseProvenanceKey>): Row {
  return {
    sourceSystem_sourceWorkbook_sourceTab_sourcePeriod_legacyId: provenance,
  };
}

function parseScope(payload: Row, agencyId: string | null, companyId: string | null): Row {
  const roleKey = requiredText(payload.roleKey, "roleKey");
  if (roleKey === "ADMIN") {
    return { scopeType: "PLATFORM", scopeCompanyId: null, scopeAgencyIds: [] };
  }
  if (roleKey === "SUPERADMIN") {
    return { scopeType: "COMPANY", scopeCompanyId: companyId, scopeAgencyIds: [] };
  }
  if (roleKey === "SUPERUSER") {
    return { scopeType: "TEAM_SET", scopeCompanyId: companyId, scopeAgencyIds: agencyId ? [agencyId] : [] };
  }
  return { scopeType: "SELF", scopeCompanyId: companyId, scopeAgencyIds: [] };
}

export function assertDisposableMigrationDatabase(databaseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Migration rehearsal requires a valid DATABASE_URL.");
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error("Migration rehearsal only supports PostgreSQL.");
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("Migration rehearsal is restricted to loopback PostgreSQL; remote hosts are blocked.");
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, "")).trim();
  if (databaseName !== "ckace_hr_dev") {
    throw new Error("Migration rehearsal requires the disposable ckace_hr_dev database.");
  }
  return databaseName;
}

export class PrismaMigrationTargetStore implements MigrationTargetStore {
  private runId: string | null = null;
  private sourceSnapshot: string | null = null;
  private transformerVersion: string | null = null;
  private readonly reconcileExceptions: Row[] = [];
  private pendingSourceRequests: readonly PendingApprovalSourceRequest[] = [];
  private readonly changedNextApprovers: {
    requestLegacyId: string;
    oldApproverIds: readonly string[];
    newApproverIds: readonly string[];
  }[] = [];
  private readonly unresolvedApprovers: {
    requestLegacyId: string;
    reasonCode: string;
  }[] = [];
  private reroutedRequestCount = 0;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {
    if (env.CKACE_MIGRATION_JOB !== "YES") {
      throw new Error("PrismaMigrationTargetStore can only be used by the migration job.");
    }
    const databaseUrl = env.DATABASE_URL?.trim();
    if (!databaseUrl) throw new Error("Migration rehearsal requires DATABASE_URL.");
    assertDisposableMigrationDatabase(databaseUrl);
  }

  async prepareRun(input: {
    migrationRunId: string;
    sourceSnapshot: string;
    transformerVersion: string;
    pendingRequests?: readonly PendingApprovalSourceRequest[];
  }): Promise<void> {
    this.runId = input.migrationRunId;
    this.sourceSnapshot = input.sourceSnapshot;
    this.transformerVersion = input.transformerVersion;
    this.pendingSourceRequests = input.pendingRequests ?? [];
    await delegate(this.prisma, "migrationRun").upsert({
      where: { id: input.migrationRunId },
      create: {
        id: input.migrationRunId,
        sourceSystem: "APP_LEAVE_GAS",
        sourceSnapshot: input.sourceSnapshot,
        transformerVersion: input.transformerVersion,
        status: "RUNNING",
        startedAt: new Date(),
      },
      update: {
        sourceSnapshot: input.sourceSnapshot,
        transformerVersion: input.transformerVersion,
        status: "RUNNING",
        startedAt: new Date(),
        completedAt: null,
      },
    });
  }

  async findByProvenanceKey(provenanceKey: string): Promise<ExistingTargetRecord | null> {
    const provenance = parseProvenanceKey(provenanceKey);
    const existing = await delegate(this.prisma, "legacyRecord").findUnique({ where: uniqueKey(provenance) });
    if (!existing) return null;
    return {
      provenanceKey,
      sourcePayloadHash: typeof existing.payloadHash === "string" ? existing.payloadHash : "",
      transformedPayloadHash: typeof existing.transformedPayloadHash === "string" ? existing.transformedPayloadHash : "",
      transformerVersion: typeof existing.transformerVersion === "string" ? existing.transformerVersion : "",
      targetEntityType: typeof existing.targetEntityType === "string" ? existing.targetEntityType : "unknown",
      targetEntityId: typeof existing.targetEntityId === "string" ? existing.targetEntityId : "",
    };
  }

  async create(input: TargetCreateInput): Promise<TargetCreateResult> {
    if (!this.runId || !this.sourceSnapshot || !this.transformerVersion) {
      throw new Error("Migration run metadata must be prepared before writes.");
    }
    return this.prisma.$transaction(async (transaction) => {
      const tx = transaction as unknown as object;
      const targetEntityId = await this.createDomainEntity(tx, input);
      const provenance = input.provenance;
      await delegate(tx, "legacyRecord").create({
        data: {
          id: randomUUID(),
          migrationRunId: this.runId,
          sourceSystem: provenance.sourceSystem,
          sourceWorkbook: provenance.sourceWorkbook,
          sourceTab: provenance.sourceTab,
          sourcePeriod: provenance.sourcePeriod ?? "CURRENT",
          legacyId: provenance.legacyId,
          rowFingerprint: provenance.rowFingerprint,
          payloadHash: input.sourcePayloadHash,
          transformedPayloadHash: input.transformedPayloadHash,
          transformerVersion: input.transformerVersion,
          targetEntityType: input.targetEntityType,
          targetEntityId,
        },
      });
      return { targetEntityId };
    });
  }

  async finishRun(report: MigrationRunReport): Promise<{
    readonly pendingApprovalHandoff: PendingApprovalHandoffReport;
  }> {
    const targetPendingRequestCount = await this.finalizePendingApprovals();
    const sourcePendingRequestCount = this.pendingSourceRequests.length;
    const pendingRequestCountMatches = sourcePendingRequestCount === targetPendingRequestCount;
    if (!pendingRequestCountMatches) {
      this.reconcileExceptions.push({
        entityType: "approval_handoff",
        checkName: "pending_request_count",
        status: "FAIL",
        sourceValue: String(sourcePendingRequestCount),
        targetValue: String(targetPendingRequestCount),
        exceptionCode: "PENDING_REQUEST_COUNT_MISMATCH",
        disposition: "BLOCK_CUTOVER_UNTIL_PENDING_REQUEST_COUNTS_MATCH",
        evidenceRef: report.migrationRunId,
      });
    }
    const status = report.stoppedEarly
      ? "FAILED"
      : report.mismatchCount > 0 || this.reconcileExceptions.some((row) => row.status !== "PASS")
        ? "COMPLETED_WITH_EXCEPTIONS"
        : "COMPLETED";
    await delegate(this.prisma, "migrationRun").update({
      where: { id: report.migrationRunId },
      data: {
        status,
        completedAt: new Date(),
        importedCount: report.importedCount,
        skippedCount: report.skippedCount,
        rejectedCount: report.rejectedCount,
        mismatchCount: report.mismatchCount,
      },
    });
    const reconciliation = delegate(this.prisma, "migrationReconciliationResult");
    await reconciliation.deleteMany({ where: { migrationRunId: report.migrationRunId } });
    const rows = report.outcomes.map((outcome) => ({
      id: randomUUID(),
      migrationRunId: report.migrationRunId,
      entityType: outcome.targetEntityType ?? "source_row",
      checkName: outcome.status,
      status: outcome.status === "IMPORTED" || outcome.status === "SKIPPED_IDENTICAL"
        ? "PASS"
        : outcome.status.startsWith("SKIPPED_") ? "EXCEPTION" : "FAIL",
      sourceValue: outcome.legacyId,
      targetValue: outcome.targetEntityId ?? outcome.status,
      exceptionCode: outcome.code,
      disposition: outcome.disposition ?? outcome.detail,
      evidenceRef: outcome.provenanceKey,
    }));
    if (rows.length) await reconciliation.createMany({ data: rows });
    if (this.reconcileExceptions.length) {
      await reconciliation.createMany({
        data: this.reconcileExceptions.map((row) => ({
          id: randomUUID(),
          migrationRunId: report.migrationRunId,
          ...row,
        })),
      });
    }
    return {
      pendingApprovalHandoff: {
        sourcePendingRequestCount,
        targetPendingRequestCount,
        pendingRequestCountMatches,
        reroutedRequestCount: this.reroutedRequestCount,
        changedNextApprovers: this.changedNextApprovers,
        unresolvedApprovers: this.unresolvedApprovers,
      },
    };
  }

  private async finalizePendingApprovals(): Promise<number> {
    let targetPendingRequestCount = 0;
    for (const source of this.pendingSourceRequests) {
      const provenance = parseProvenanceKey(source.provenanceKey);
      const mapping = await delegate(this.prisma, "legacyRecord").findUnique({
        where: uniqueKey(provenance),
      });
      const requestId = typeof mapping?.targetEntityId === "string" ? mapping.targetEntityId : null;
      if (!requestId) {
        this.addPendingException(source, "PENDING_REQUEST_TARGET_MAPPING_MISSING", "No target request was created for this Pending source row.");
        continue;
      }

      const requestModel = source.targetEntityType === "leave_request"
        ? "leaveRequest"
        : source.targetEntityType === "time_correction_request"
          ? "timeCorrectionRequest"
          : source.targetEntityType === "overtime_request_bundle"
            ? "overtimeRequest"
            : "medicalClaim";
      const request = await delegate(this.prisma, requestModel).findUnique({ where: { id: requestId } });
      const approvalInstanceId = typeof request?.approvalInstanceId === "string" ? request.approvalInstanceId : null;
      if (!request || request.status !== "PENDING" || !approvalInstanceId) {
        this.addPendingException(source, "PENDING_REQUEST_TARGET_STATE_MISMATCH", "Target request is absent, not Pending, or has no approval instance.");
        continue;
      }

      const instanceDelegate = delegate(this.prisma, "approvalInstance");
      const instance = await instanceDelegate.findUnique({ where: { id: approvalInstanceId } });
      if (!instance || instance.status !== "PENDING") {
        this.addPendingException(source, "PENDING_APPROVAL_INSTANCE_STATE_MISMATCH", "Target approval instance is not Pending.");
        continue;
      }

      const existingSteps = await delegate(this.prisma, "approvalStep").findMany({
        where: { approvalInstanceId },
        orderBy: { stepOrder: "asc" },
      });
      const alreadyMigrated = existingSteps.some((step) => step.legacyRawStatus === "CURRENT_POLICY_MIGRATION");
      const legacyPendingStillAssigned = existingSteps.some(
        (step) => step.status === "PENDING" && step.legacyRawStatus !== "CURRENT_POLICY_MIGRATION",
      );
      if (alreadyMigrated) {
        targetPendingRequestCount += 1;
        continue;
      }
      if (legacyPendingStillAssigned) {
        this.addPendingException(source, "LEGACY_PENDING_APPROVER_STILL_ASSIGNED", "A legacy Pending approval step is already active; it was not overwritten.");
        targetPendingRequestCount += 1;
        continue;
      }

      const requesterEmployeeId = typeof instance.requesterEmployeeId === "string"
        ? instance.requesterEmployeeId
        : null;
      if (!requesterEmployeeId) {
        this.addPendingException(source, "PENDING_REQUESTER_TARGET_ID_MISSING", "Approval instance has no target requester identity.");
        targetPendingRequestCount += 1;
        continue;
      }
      const historicalSteps: HistoricalApprovalStep[] = existingSteps.map((step) => ({
        stepOrder: Number(step.stepOrder),
        status: String(step.status),
        approverEmployeeId: typeof step.approverEmployeeId === "string" ? step.approverEmployeeId : null,
        coApproverEmployeeIds: Array.isArray(step.coApproverEmployeeIds) ? step.coApproverEmployeeIds.filter((id): id is string => typeof id === "string") : [],
      }));
      const oldNextApproverIds = await this.resolveLegacyApproverIds(source);
      let policy: Awaited<ReturnType<PrismaMigrationTargetStore["resolveCurrentPolicySteps"]>>;
      try {
        policy = await this.resolveCurrentPolicySteps(this.prisma, source.requestKind, requesterEmployeeId);
      } catch {
        policy = {
          policyId: null,
          steps: [],
          unavailableReason: "CURRENT_APPROVAL_POLICY_RESOLUTION_FAILED",
        };
      }
      const plan = planPendingApprovalHandoff({
        requestStatus: String(request.status),
        requesterEmployeeId,
        historicalSteps,
        currentPolicySteps: policy.steps,
        policyAvailable: policy.policyId !== null && !policy.unavailableReason,
        ...(policy.unavailableReason ? { policyUnavailableReason: policy.unavailableReason } : {}),
        oldNextApproverIds,
      });

      try {
        await this.prisma.$transaction(async (transaction) => {
          const tx = transaction as unknown as object;
          for (const step of plan.steps) {
            await delegate(tx, "approvalStep").create({
              data: {
                id: randomUUID(),
                approvalInstanceId,
                stepOrder: step.stepOrder,
                approverEmployeeId: step.approverEmployeeId,
                coApproverEmployeeIds: [...step.coApproverEmployeeIds],
                status: "PENDING",
                assignedAt: new Date(),
                legacyRawStatus: "CURRENT_POLICY_MIGRATION",
              },
            });
          }
          await delegate(tx, "approvalInstance").update({
            where: { id: approvalInstanceId },
            data: {
              policyId: policy.policyId,
              status: "PENDING",
              currentStepOrder: plan.steps[0]?.stepOrder ?? null,
            },
          });
        });
      } catch {
        this.addPendingException(source, "CURRENT_POLICY_PENDING_STEP_WRITE_FAILED", "Target route write failed; request state was kept Pending and no automatic retry was made.");
        targetPendingRequestCount += 1;
        continue;
      }

      this.reroutedRequestCount += 1;
      targetPendingRequestCount += 1;
      if (plan.approverChanged) {
        const oldSourceApproverIds = this.sourcePendingApproverIds(source);
        const newSourceApproverIds = await this.sourceUserIdsForTargetEmployees(plan.newNextApproverIds);
        const change = {
          requestLegacyId: provenance.legacyId,
          oldApproverIds: oldSourceApproverIds,
          newApproverIds: newSourceApproverIds,
        };
        this.changedNextApprovers.push(change);
        this.reconcileExceptions.push({
          entityType: "approval_handoff",
          checkName: "pending_next_approver_changed",
          status: "EXCEPTION",
          sourceValue: oldSourceApproverIds.join(","),
          targetValue: newSourceApproverIds.join(","),
          exceptionCode: "PENDING_NEXT_APPROVER_CHANGED_HR_REVIEW",
          disposition: "HR_MUST_REVIEW_THIS_APPROVER_CHANGE_BEFORE_CUTOVER",
          evidenceRef: source.provenanceKey,
        });
      }
      for (const code of plan.exceptionCodes.filter((entry) => entry !== "PENDING_NEXT_APPROVER_CHANGED_HR_REVIEW")) {
        this.addPendingException(source, code, "Pending request was preserved with an unassigned current-policy placeholder; HR must resolve it before cutover.");
      }
    }
    return targetPendingRequestCount;
  }

  private async resolveLegacyApproverIds(source: PendingApprovalSourceRequest): Promise<string[]> {
    const ids: string[] = [];
    for (const step of this.firstPendingLegacySteps(source)) {
      try {
        ids.push(await this.legacyTarget(this.prisma, "Users", step.approverLegacyId));
      } catch {
        ids.push(`UNMAPPED:${step.approverLegacyId}`);
      }
    }
    return [...new Set(ids)].sort();
  }

  private firstPendingLegacySteps(source: PendingApprovalSourceRequest) {
    const firstOrder = source.legacyPendingSteps.reduce<number | null>(
      (minimum, step) => minimum === null ? step.stepOrder : Math.min(minimum, step.stepOrder),
      null,
    );
    if (firstOrder === null) return [];
    return source.legacyPendingSteps.filter((step) => step.stepOrder === firstOrder);
  }

  private sourcePendingApproverIds(source: PendingApprovalSourceRequest): string[] {
    return [...new Set(this.firstPendingLegacySteps(source).map((step) => step.approverLegacyId))].sort();
  }

  private async sourceUserIdsForTargetEmployees(targetEmployeeIds: readonly string[]): Promise<string[]> {
    if (targetEmployeeIds.length === 0) return [];
    const rows = await delegate(this.prisma, "legacyRecord").findMany({
      where: {
        sourceSystem: "APP_LEAVE_GAS",
        sourceTab: "Users",
        targetEntityId: { in: [...targetEmployeeIds] },
      },
      select: { legacyId: true, targetEntityId: true },
    });
    const byTargetId = new Map(rows.map((row) => [String(row.targetEntityId), String(row.legacyId)]));
    return [...new Set(targetEmployeeIds.map((id) => byTargetId.get(id) ?? `UNMAPPED_TARGET:${id}`))].sort();
  }

  private addPendingException(source: PendingApprovalSourceRequest, code: string, disposition: string): void {
    const legacyId = parseProvenanceKey(source.provenanceKey).legacyId;
    this.unresolvedApprovers.push({ requestLegacyId: legacyId, reasonCode: code });
    this.reconcileExceptions.push({
      entityType: "approval_handoff",
      checkName: "pending_approver_unresolved",
      status: "EXCEPTION",
      sourceValue: legacyId,
      targetValue: "PENDING_WITHOUT_APPROVER",
      exceptionCode: code,
      disposition,
      evidenceRef: source.provenanceKey,
    });
  }

  private async resolveCurrentPolicySteps(
    client: object,
    requestKind: PendingApprovalSourceRequest["requestKind"],
    requesterEmployeeId: string,
  ): Promise<{
    readonly policyId: string | null;
    readonly steps: readonly CurrentPolicyApprovalStep[];
    readonly unavailableReason?: string;
  }> {
    const requester = await delegate(client, "employee").findUnique({
      where: { id: requesterEmployeeId },
      select: { agencyId: true },
    });
    if (!requester) return { policyId: null, steps: [], unavailableReason: "REQUESTER_TARGET_PROFILE_MISSING" };
    const agencyId = typeof requester.agencyId === "string" ? requester.agencyId : null;
    const policies = await delegate(client, "approvalPolicy").findMany({
      where: { active: true, requestKind },
      select: {
        id: true,
        agencyId: true,
        steps: {
          select: { requiredRole: { select: { key: true } } },
          orderBy: { stepOrder: "asc" },
        },
      },
    });
    const exact = policies.filter((policy) => policy.agencyId === agencyId);
    const global = policies.filter((policy) => policy.agencyId === null);
    const candidates = exact.length ? exact : global;
    if (candidates.length !== 1) {
      return {
        policyId: null,
        steps: [],
        unavailableReason: candidates.length ? "CURRENT_APPROVAL_POLICY_AMBIGUOUS" : "CURRENT_APPROVAL_POLICY_UNAVAILABLE",
      };
    }
    const selected = candidates[0];
    const rawPolicySteps = Array.isArray(selected?.steps) ? selected.steps : [];
    const policySteps = rawPolicySteps.map((value) => objectValue(value as JsonValue, "approval policy step"));
    if (!selected || policySteps.length === 0) {
      return { policyId: null, steps: [], unavailableReason: "CURRENT_APPROVAL_POLICY_HAS_NO_STEPS" };
    }
    const route = await resolveCompanyApprovalRoute(
      client as unknown as ApprovalRouteReader,
      requesterEmployeeId,
      policySteps.map((step) => ({
        kind: "ROLE" as const,
        roleKey: requiredText(objectValue(step.requiredRole as JsonValue, "required role").key, "required role key"),
        selection: "SYSTEM_PICKS_FIRST" as const,
        peerFallback: true,
      })),
      { defaultSelection: "SYSTEM_PICKS_FIRST" },
    );
    if (!route) {
      return { policyId: String(selected.id), steps: [], unavailableReason: "REQUESTER_COMPANY_ROUTE_UNAVAILABLE" };
    }
    const routed: {
      policyStepIndex: number;
      candidateEmployeeIds: readonly string[];
      selectedEmployeeId?: string | null;
      unresolvedReason?: string;
    }[] = route.route.steps.map((step) => ({
      policyStepIndex: step.policyStepIndex,
      candidateEmployeeIds: step.candidateIds,
      selectedEmployeeId: step.selectedId,
    }));
    const skipped: typeof routed = route.route.skipped.map((step) => ({
      policyStepIndex: step.policyStepIndex,
      candidateEmployeeIds: [] as readonly string[],
      unresolvedReason: `CURRENT_POLICY_${step.reason}`,
    }));
    const ordered = [...routed, ...skipped].sort((left, right) => left.policyStepIndex - right.policyStepIndex);
    return {
      policyId: String(selected.id),
      steps: ordered.map(({ candidateEmployeeIds, selectedEmployeeId, unresolvedReason }) => ({
        candidateEmployeeIds,
        ...(selectedEmployeeId !== undefined ? { selectedEmployeeId } : {}),
        ...(unresolvedReason ? { unresolvedReason } : {}),
      })),
    };
  }

  private async legacyTarget(
    client: object,
    sourceTab: string,
    legacyId: string,
    sourcePeriod = "CURRENT",
  ): Promise<string> {
    const found = await delegate(client, "legacyRecord").findFirst({
      where: { sourceSystem: "APP_LEAVE_GAS", sourceTab, legacyId, sourcePeriod, targetEntityId: { not: null } },
      orderBy: { importedAt: "desc" },
    });
    if (typeof found?.targetEntityId !== "string") {
      throw new Error(`Missing target mapping for ${sourceTab} legacy identity.`);
    }
    return found.targetEntityId;
  }

  private async targetFromKey(client: object, key: unknown): Promise<string> {
    const provenance = parseProvenanceKey(requiredText(key, "request provenance"));
    return this.legacyTarget(client, provenance.sourceTab, provenance.legacyId, provenance.sourcePeriod);
  }

  private async createDomainEntity(client: object, input: TargetCreateInput): Promise<string> {
    const payload = objectValue(input.payload, input.targetEntityType);
    const id = randomUUID();
    switch (input.targetEntityType) {
      case "organization_agency": {
        const companyName = optionalText(payload.companyName);
        let companyId: string | null = null;
        if (companyName) {
          const company = await delegate(client, "company").findFirst({ where: { name: companyName } });
          const storedCompany = company ?? await delegate(client, "company").create({ data: { id: randomUUID(), name: companyName, active: true } });
          companyId = String(storedCompany.id);
        }
        const name = requiredText(payload.name, "agency name");
        const agency = await delegate(client, "agency").findFirst({ where: { name, companyId } });
        if (agency) return String(agency.id);
        const created = await delegate(client, "agency").create({ data: { id, name, companyId, active: true } });
        return String(created.id);
      }
      case "organization_department": {
        const name = requiredText(payload.name, "department name");
        const existing = await delegate(client, "department").findFirst({ where: { name } });
        if (existing) return String(existing.id);
        const created = await delegate(client, "department").create({ data: { id, name, active: true } });
        return String(created.id);
      }
      case "identity_profile_bundle": {
        const employeeData = objectValue(payload.employee as JsonValue, "employee");
        const accountData = objectValue(payload.userAccount as JsonValue, "user account");
        const agencyLegacyId = optionalText(employeeData.legacyAgencyId);
        const departmentLegacyId = optionalText(employeeData.legacyDepartmentId);
        const agencyId = agencyLegacyId ? await this.legacyTarget(client, "Agency", agencyLegacyId) : null;
        const departmentId = departmentLegacyId ? await this.legacyTarget(client, "Departments", departmentLegacyId) : null;
        const companyName = optionalText(payload.companyCrosswalk);
        const agency = agencyId ? await delegate(client, "agency").findUnique({ where: { id: agencyId } }) : null;
        const companyId = companyName
          ? (await delegate(client, "company").findFirst({ where: { name: companyName } }))?.id
          : agency?.companyId;
        if (companyName && typeof companyId !== "string") throw new Error("Owner-confirmed company mapping is missing.");
        const employeeId = randomUUID();
        const employee = await delegate(client, "employee").create({
          data: {
            id: employeeId,
            fullName: requiredText(employeeData.fullName, "employee name"),
            nickname: optionalText(employeeData.nickname),
            dateOfBirth: optionalDate(employeeData.dateOfBirth, "dateOfBirth"),
            employmentStart: optionalDate(employeeData.employmentStart, "employmentStart"),
            resignationDate: optionalDate(employeeData.resignationDate, "resignationDate"),
            agencyId,
            departmentId,
            companyId: typeof companyId === "string" ? companyId : null,
            attendanceExempt: payload.attendanceExempt === true,
          },
        });
        const accountId = randomUUID();
        const account = await delegate(client, "userAccount").create({
          data: {
            id: accountId,
            employeeId: String(employee.id),
            loginName: requiredText(accountData.loginName, "login name"),
            normalizedLogin: requiredText(accountData.normalizedLogin, "normalized login"),
            passwordHash: null,
            legacyPasswordHash: optionalText(accountData.legacyPasswordHash),
            state: requiredText(accountData.accountState, "account state"),
          },
        });
        const roleKey = requiredText(payload.roleKey, "role key");
        const role = await delegate(client, "role").findUnique({ where: { key: roleKey } });
        if (!role) throw new Error(`Target role ${roleKey} is not seeded in the disposable database.`);
        await delegate(client, "userRole").create({
          data: {
            userAccountId: String(account.id),
            roleId: String(role.id),
            ...parseScope(payload, agencyId, typeof companyId === "string" ? companyId : null),
          },
        });
        return String(employee.id);
      }
      case "leave_entitlement": {
        const employeeId = await this.legacyTarget(client, "Users", requiredText(payload.employeeLegacyId, "employee identity"));
        const leaveTypeKey = requiredText(payload.leaveTypeKey, "leave type");
        let leaveType = await delegate(client, "leaveType").findUnique({ where: { key: leaveTypeKey } });
        if (!leaveType) {
          leaveType = await delegate(client, "leaveType").create({
            data: { id: randomUUID(), key: leaveTypeKey, name: leaveTypeKey === "ANNUAL" ? "Annual leave" : leaveTypeKey === "PERSONAL" ? "Personal leave" : "Sick leave", active: true },
          });
        }
        const created = await delegate(client, "leaveEntitlement").create({
          data: {
            id,
            employeeId,
            leaveTypeId: String(leaveType.id),
            quota: Number(payload.quota),
            validFrom: new Date(Date.UTC(2026, 0, 1)),
            validTo: new Date(Date.UTC(2026, 11, 31)),
          },
        });
        this.reconcileExceptions.push({
          entityType: "leave_entitlement",
          checkName: "legacy_quota_comparison",
          status: Number(payload.quotaDifference) === 0 ? "PASS" : "EXCEPTION",
          sourceValue: String(payload.comparisonQuota),
          targetValue: String(payload.quota),
          exceptionCode: Number(payload.quotaDifference) === 0 ? null : "LEGACY_QUOTA_DIFFERS_FROM_CURRENT_POLICY",
          disposition: `difference=${String(payload.quotaDifference)}`,
          evidenceRef: requiredText(payload.legacyPolicyId, "policy identity"),
        });
        return String(created.id);
      }
      case "holiday": {
        const created = await delegate(client, "holiday").create({
          data: { id, holidayDate: dateOnly(payload.holidayDate, "holidayDate"), description: requiredText(payload.description, "holiday description"), active: true },
        });
        return String(created.id);
      }
      case "weekly_work_rule": {
        const isoWeekday = Number(payload.isoWeekday);
        if (!Number.isInteger(isoWeekday) || isoWeekday < 1 || isoWeekday > 7) throw new Error("Invalid ISO weekday");
        const created = await delegate(client, "weeklyWorkRule").upsert({
          where: { isoWeekday },
          create: { id, isoWeekday, isWorking: payload.isWorking === true },
          update: { isWorking: payload.isWorking === true },
        });
        return String(created.id);
      }
      case "leave_request": {
        const employeeId = await this.legacyTarget(client, "Users", requiredText(payload.employeeLegacyId, "employee identity"));
        const leaveType = await delegate(client, "leaveType").findUnique({ where: { key: requiredText(payload.leaveTypeKey, "leave type") } });
        if (!leaveType) throw new Error("Leave type is not configured in the target database.");
        const policyId = optionalText(payload.legacyPolicyId);
        let entitlementId: string | null = null;
        if (policyId) {
          const mapping = await delegate(client, "legacyRecord").findFirst({
            where: { sourceSystem: "APP_LEAVE_GAS", sourceTab: "UserPolicies", legacyId: policyId, targetEntityType: "leave_entitlement", targetEntityId: { not: null } },
          });
          if (typeof mapping?.targetEntityId === "string") entitlementId = mapping.targetEntityId;
        }
        const status = requiredText(payload.status, "request status");
        const instance = await delegate(client, "approvalInstance").create({
          data: {
            id: randomUUID(), requestKind: "LEAVE", requesterEmployeeId: employeeId,
            status, currentStepOrder: status === "PENDING" ? Number(payload.currentStepOrder) || 1 : null,
          },
        });
        const created = await delegate(client, "leaveRequest").create({
          data: {
            id,
            requesterEmployeeId: employeeId,
            leaveTypeId: String(leaveType.id),
            entitlementId,
            approvalInstanceId: String(instance.id),
            description: String(payload.description ?? ""),
            startDate: dateOnly(payload.startDate, "startDate"),
            endDate: dateOnly(payload.endDate, "endDate"),
            durationCode: requiredText(payload.durationCode, "duration code"),
            startTime: clockTime(payload.startTime, "startTime"),
            endTime: clockTime(payload.endTime, "endTime"),
            status,
            decisionReason: optionalText(payload.decisionReason),
            submittedAt: dateOnly(payload.submittedDate, "submittedDate"),
            updatedAt: dateOnly(payload.updatedDate, "updatedDate"),
          },
        });
        return String(created.id);
      }
      case "leave_approval_step":
        return this.createApprovalStep(client, input, payload, "LEAVE");
      case "attendance_record_bundle": {
        const employeeId = await this.legacyTarget(client, "Users", requiredText(payload.employeeLegacyId, "employee identity"));
        const created = await delegate(client, "attendanceRecord").create({
          data: {
            id,
            employeeId,
            workDate: dateOnly(payload.workDate, "workDate"),
            checkInAt: timestamp(payload.checkInAt, "checkInAt"),
            checkOutAt: optionalTimestamp(payload.checkOutAt, "checkOutAt"),
            checkInLocationText: optionalText(payload.checkInLocationText),
            checkOutLocationText: optionalText(payload.checkOutLocationText),
          },
        });
        return String(created.id);
      }
      case "time_correction_request": {
        const employeeId = await this.legacyTarget(client, "Users", requiredText(payload.employeeLegacyId, "employee identity"));
        const status = requiredText(payload.status, "time correction status");
        const instance = await delegate(client, "approvalInstance").create({
          data: {
            id: randomUUID(), requestKind: "TIME_CORRECTION", requesterEmployeeId: employeeId,
            status, currentStepOrder: status === "PENDING" ? 1 : null,
          },
        });
        const matches = await delegate(client, "attendanceRecord").findFirst({
          where: { employeeId, workDate: dateOnly(payload.attendanceDate, "attendanceDate") },
        });
        const created = await delegate(client, "timeCorrectionRequest").create({
          data: {
            id,
            employeeId,
            attendanceRecordId: matches ? String(matches.id) : null,
            approvalInstanceId: String(instance.id),
            attendanceDate: dateOnly(payload.attendanceDate, "attendanceDate"),
            originalCheckIn: clockTime(payload.originalCheckIn, "originalCheckIn"),
            originalCheckOut: clockTime(payload.originalCheckOut, "originalCheckOut"),
            correctedCheckIn: clockTime(payload.correctedCheckIn, "correctedCheckIn"),
            correctedCheckOut: clockTime(payload.correctedCheckOut, "correctedCheckOut"),
            reason: requiredText(payload.reason, "correction reason"),
            status,
            decisionComment: optionalText(payload.decisionComment),
            requestedAt: dateOnly(payload.requestedDate, "requestedDate"),
            decidedAt: optionalDate(payload.decidedDate, "decidedDate"),
          },
        });
        const approverLegacyId = optionalText(payload.assignedApproverLegacyId);
        if (approverLegacyId && status !== "PENDING") {
          const approverId = await this.legacyTarget(client, "Users", approverLegacyId);
          await delegate(client, "approvalStep").create({
            data: {
              id: randomUUID(), approvalInstanceId: String(instance.id), stepOrder: 1,
              approverEmployeeId: approverId, status,
              assignedAt: dateOnly(payload.requestedDate, "requestedDate"),
              decidedAt: optionalDate(payload.decidedDate, "decidedDate"),
              decidedByEmployeeId: status === "APPROVED" || status === "REJECTED" ? approverId : null,
              comment: optionalText(payload.decisionComment),
            },
          });
        }
        if (!matches) this.reconcileExceptions.push({
          entityType: "time_correction",
          checkName: "attendance_record_link",
          status: "EXCEPTION",
          sourceValue: requiredText(payload.legacyCorrectionId, "correction identity"),
          targetValue: "NO_MATCHING_ATTENDANCE_RECORD",
          exceptionCode: "TIME_CORRECTION_ATTENDANCE_UNMATCHED",
          disposition: "Preserve the correction request without guessing an attendance record.",
          evidenceRef: input.provenance.legacyId,
        });
        return String(created.id);
      }
      case "overtime_request_bundle": {
        const employeeId = await this.legacyTarget(client, "Users", requiredText(payload.employeeLegacyId, "employee identity"));
        const status = requiredText(payload.status, "overtime status");
        const instance = await delegate(client, "approvalInstance").create({
          data: {
            id: randomUUID(), requestKind: "OVERTIME", requesterEmployeeId: employeeId,
            status, currentStepOrder: status === "PENDING" ? Number(payload.currentStep) || 1 : null,
          },
        });
        const created = await delegate(client, "overtimeRequest").create({
          data: {
            id,
            employeeId,
            approvalInstanceId: String(instance.id),
            reason: requiredText(payload.reason, "overtime reason"),
            status,
            decisionReason: optionalText(payload.comment),
            submittedAt: dateOnly(payload.requestDate, "requestDate"),
            updatedAt: dateOnly(payload.updatedDate, "updatedDate"),
          },
        });
        const segments = Array.isArray(payload.segments) ? payload.segments : [];
        for (const [index, rawSegment] of segments.entries()) {
          const segment = objectValue(rawSegment as JsonValue, "overtime segment");
          const startTime = clockTime(segment.startTime, "segment startTime");
          const endTime = clockTime(segment.endTime, "segment endTime");
          if (!startTime || !endTime) throw new Error("Overtime segment is missing start/end time.");
          await delegate(client, "overtimeSegment").create({
            data: {
              id: randomUUID(), overtimeRequestId: String(created.id),
              workDate: dateOnly(segment.workDate, `segment[${index}].workDate`),
              startTime, endTime, requestedMinutes: Number(segment.requestedMinutes),
            },
          });
        }
        return String(created.id);
      }
      case "overtime_approval_step":
        return this.createApprovalStep(client, input, payload, "OVERTIME");
      case "medical_claim": {
        const employeeId = await this.legacyTarget(client, "Users", requiredText(payload.employeeLegacyId, "employee identity"));
        const status = requiredText(payload.status, "medical status");
        const instance = await delegate(client, "approvalInstance").create({
          data: {
            id: randomUUID(), requestKind: "MEDICAL", requesterEmployeeId: employeeId,
            status, currentStepOrder: status === "PENDING" ? Number(payload.currentStepOrder) || 1 : null,
          },
        });
        let leaveRequestId: string | null = null;
        const linkedLeaveLegacyId = optionalText(payload.linkedLeaveLegacyId);
        if (linkedLeaveLegacyId) {
          const leave = await delegate(client, "legacyRecord").findFirst({
            where: { sourceSystem: "APP_LEAVE_GAS", sourceTab: "LeaveRequests", legacyId: linkedLeaveLegacyId, targetEntityType: "leave_request", targetEntityId: { not: null } },
          });
          if (typeof leave?.targetEntityId === "string") leaveRequestId = leave.targetEntityId;
        }
        const created = await delegate(client, "medicalClaim").create({
          data: {
            id, employeeId, leaveRequestId, approvalInstanceId: String(instance.id),
            claimDate: dateOnly(payload.claimDate, "claimDate"),
            sicknessDate: dateOnly(payload.sicknessDate, "sicknessDate"),
            amount: Number(payload.amount), description: String(payload.description ?? ""),
            status, decisionReason: optionalText(payload.decisionReason),
            submittedAt: dateOnly(payload.updatedDate, "updatedDate"), updatedAt: dateOnly(payload.updatedDate, "updatedDate"),
          },
        });
        return String(created.id);
      }
      case "medical_approval_step":
        return this.createApprovalStep(client, input, payload, "MEDICAL");
      case "leave_attachment_reference":
      case "medical_attachment_reference":
        throw new Error("Attachment bytes are absent from the sanitized XLSX snapshot; attachment reference was not created.");
      default:
        throw new Error(`Unsupported migration target type ${input.targetEntityType}`);
    }
  }

  private async createApprovalStep(client: object, input: TargetCreateInput, payload: Row, requestKind: "LEAVE" | "OVERTIME" | "MEDICAL"): Promise<string> {
    const key = payload.currentRequestProvenanceKey ?? payload.requestProvenanceKey;
    const requestId = await this.targetFromKey(client, key);
    const requestModel = requestKind === "LEAVE" ? "leaveRequest" : requestKind === "OVERTIME" ? "overtimeRequest" : "medicalClaim";
    const request = await delegate(client, requestModel).findUnique({ where: { id: requestId } });
    if (!request || typeof request.approvalInstanceId !== "string") throw new Error("Approval request has no target approval instance.");
    const approverId = await this.legacyTarget(client, "Users", requiredText(payload.approverLegacyId, "approver identity"));
    const status = requiredText(payload.normalizedStatus ?? payload.status, "approval status");
    const approvedDate = optionalDate(payload.approvedDate, "approvedDate");
    const assignedDate = optionalDate(payload.assignedDate, "assignedDate");
    const created = await delegate(client, "approvalStep").create({
      data: {
        id: randomUUID(),
        approvalInstanceId: String(request.approvalInstanceId),
        stepOrder: Number(payload.stepOrder),
        approverEmployeeId: approverId,
        status,
        assignedAt: assignedDate,
        decidedAt: approvedDate,
        decidedByEmployeeId: status === "APPROVED" || status === "REJECTED" ? approverId : null,
        comment: optionalText(payload.comment),
        legacyRawStatus: optionalText(payload.rawStatus),
      },
    });
    void input;
    return String(created.id);
  }
}
