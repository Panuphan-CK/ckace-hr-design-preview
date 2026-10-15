import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const runbook = JSON.parse(readFileSync(path.join(here, "cutover-runbook-manifest.json"), "utf8"));

if (runbook.productionMutationAuthorized !== false) {
  throw new Error("Production mutation unexpectedly authorized");
}

const executionBlockers = runbook.executionPrerequisites
  .filter((item) => item.blockingForExecution && item.status !== "PASS")
  .map((item) => item.id);

const plan = {
  mode: "PLAN_ONLY_NON_EXECUTABLE",
  productionMutationExecuted: false,
  ownerApprovalRequiredForProductionActions: true,
  currentEntry: {
    liffId: runbook.currentState.line.productionLiffId,
    endpoint: runbook.currentState.line.currentEndpoint,
    gatewayRevision: runbook.currentState.legacyProduction.revision,
    sourceOfTruth: runbook.currentState.legacyProduction.sourceOfTruth,
  },
  targetEntry: {
    liffId: runbook.targetState.productionLiffId,
    endpoint: runbook.targetState.liffEndpoint,
    preserveRichMenus: true,
  },
  executionBlockers,
  routingGap: runbook.routingGap,
  phases: runbook.cutoverPhases.map((phase) => ({
    id: phase.id,
    productionMutation: phase.productionMutation,
    ownerApprovalRequired: phase.ownerApprovalRequired,
    preconditions: phase.preconditions ?? [],
    actions: phase.actions,
  })),
  sourceOfTruthPolicy: runbook.authorityPolicy,
  rollbackBoundaries: runbook.rollbackBoundaries,
  ownerGates: runbook.ownerGates,
};

console.log(JSON.stringify(plan, null, 2));
