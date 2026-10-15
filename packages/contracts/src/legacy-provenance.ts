export interface LegacyProvenance {
  readonly sourceSystem: "APP_LEAVE_GAS";
  readonly sourceWorkbook: string;
  readonly sourceTab: string;
  readonly sourcePeriod: string | null;
  readonly legacyId: string;
  readonly rowFingerprint: string;
  readonly migrationRunId: string;
}

export function legacyProvenanceKey(
  provenance: Pick<LegacyProvenance, "sourceSystem" | "sourceWorkbook" | "sourceTab" | "sourcePeriod" | "legacyId">,
): string {
  return [
    provenance.sourceSystem,
    provenance.sourceWorkbook,
    provenance.sourceTab,
    provenance.sourcePeriod ?? "CURRENT",
    provenance.legacyId,
  ].join("::");
}
