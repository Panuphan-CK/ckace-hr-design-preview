import type {
  MigrationResetPlan,
  MigrationRunReport,
} from "./migration-contracts";

export function buildResetPlan(
  report: MigrationRunReport,
): MigrationResetPlan {
  const targets = report.outcomes
    .filter(
      (
        outcome,
      ): outcome is typeof outcome & {
        targetEntityType: string;
        targetEntityId: string;
      } =>
        outcome.status === "IMPORTED" &&
        outcome.targetEntityType !== null &&
        outcome.targetEntityId !== null,
    )
    .map((outcome) => ({
      targetEntityType: outcome.targetEntityType,
      targetEntityId: outcome.targetEntityId,
      provenanceKey: outcome.provenanceKey,
    }));

  return {
    migrationRunId: report.migrationRunId,
    sourceSnapshot: report.sourceSnapshot,
    mode: "PLAN_ONLY",
    requiresExplicitExecutionApproval: true,
    targets,
  };
}
