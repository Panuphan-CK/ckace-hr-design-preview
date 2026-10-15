import { legacyProvenanceKey } from "@ckace/contracts";
import type { JsonValue, LegacyExtractedRecord, MigrationTransformer } from "./migration-contracts";
import { parseLegacyDateDdMmYyyy } from "./legacy-mappings";
import type { ReconciliationResult } from "./reconciliation";
import { canonicalJson } from "./source-snapshot";

function value(record: LegacyExtractedRecord, keys: readonly string[]): string {
  for (const key of keys) {
    const raw = record.values[key];
    if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
      return String(raw).trim();
    }
  }
  return "";
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return parseLegacyDateDdMmYyyy(raw);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid ManagerDB date");
  return parsed.toISOString();
}

export interface AnnouncementReconciliationSnapshot {
  readonly count: number;
  readonly scopeCounts: Readonly<Record<string, number>>;
  readonly attachmentReferenceCount: number;
}

export function reconcileAnnouncements(
  source: AnnouncementReconciliationSnapshot,
  target: AnnouncementReconciliationSnapshot,
): readonly ReconciliationResult[] {
  const check = (
    checkName: string,
    sourceValue: unknown,
    targetValue: unknown,
  ): ReconciliationResult => {
    const left = canonicalJson(sourceValue as JsonValue);
    const right = canonicalJson(targetValue as JsonValue);
    const matches = left === right;
    return {
      entityType: "announcement",
      checkName,
      status: matches ? "PASS" : "FAIL",
      sourceValue: left,
      targetValue: right,
      exceptionCode: matches ? null : "ANNOUNCEMENT_RECONCILIATION_DRIFT",
      disposition: matches ? null : "BLOCK_MIGRATION_AND_REVIEW_SOURCE_TARGET_DRIFT",
    };
  };

  return [
    check("count", source.count, target.count),
    check("scope_counts", source.scopeCounts, target.scopeCounts),
    check(
      "attachment_reference_count",
      source.attachmentReferenceCount,
      target.attachmentReferenceCount,
    ),
  ];
}

export const announcementTransformer: MigrationTransformer = {
  version: "announcement-v1",
  transform(record) {
    try {
      if (record.provenance.sourceTab !== "ManagerDB") {
        throw new Error("Announcement transformer accepts only ManagerDB");
      }
      const id = value(record, ["CodeID", "ID", "AnnouncementID"]);
      if (!id || id !== record.provenance.legacyId) {
        throw new Error("ManagerDB ID does not match provenance");
      }
      const content = value(record, ["Data1", "Description", "Content"]);
      if (!content) throw new Error("Announcement content is required");
      const rawScope = value(record, ["Scope"]) || "Global";
      const scope = rawScope === "Global" ? "GLOBAL" : rawScope === "SameAgency" ? "AGENCY" : null;
      if (!scope) throw new Error("Unsupported ManagerDB scope");
      const ownerLegacyId = value(record, ["UserID", "OwnerUserID"]);
      if (scope === "AGENCY" && !ownerLegacyId) {
        throw new Error("SameAgency announcement requires owner");
      }
      const legacyFileUrl = value(record, ["FileURL", "FileUrl"]);

      return {
        action: "IMPORT",
        targetEntityType: "announcement",
        payload: {
          legacyAnnouncementId: id,
          legacySourceRef: legacyProvenanceKey({
            sourceSystem: record.provenance.sourceSystem,
            sourceWorkbook: record.provenance.sourceWorkbook,
            sourceTab: record.provenance.sourceTab,
            sourcePeriod: record.provenance.sourcePeriod,
            legacyId: id,
          }),
          ownerEmployeeLegacyId: ownerLegacyId || null,
          content,
          scope,
          publishedAt: parseDate(value(record, ["Date", "PublishedAt"])),
          hasLegacyAttachment: Boolean(legacyFileUrl),
          legacyAttachmentReference: legacyFileUrl || null,
          attachmentMigrationAuthority: legacyFileUrl ? "REFERENCE_ONLY_UNTIL_PRIVATE_R2_COPY" : "NONE",
          agencyResolution: scope === "AGENCY" ? "RESOLVE_FROM_OWNER_EMPLOYEE" : "NOT_REQUIRED",
          legacyRaw: record.values,
        } satisfies JsonValue,
      };
    } catch (error) {
      return {
        action: "REJECT",
        code: "ANNOUNCEMENT_INVALID_SOURCE",
        reason: error instanceof Error ? error.message : "Invalid ManagerDB source",
      };
    }
  },
};
