import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const m=JSON.parse(readFileSync(path.join(here,"m9-landing-zone-manifest.json"),"utf8"));

if(m.productionMutationAuthorized!==false) throw new Error("M9.4 unexpectedly authorizes Production mutation");
if(m.provisioningPlan.executionMode!=="PLAN_ONLY_NON_EXECUTABLE") throw new Error("M9.4 plan must remain non-executable");
if(m.ownerDecision.current!=="HOLD") throw new Error("Owner HOLD gate missing");

const plan={
  mode:"PLAN_ONLY_NON_EXECUTABLE",
  productionMutationExecuted:false,
  ownerApprovalRequired:true,
  target:m.target,
  observedLiveState:{
    productionCloudRunServices:m.liveInventory.cloudRun.productionServices,
    runtimeServiceAccountPresent:m.liveInventory.iam.runtimeServiceAccountPresent,
    presentProductionSecrets:m.liveInventory.secretManager.presentProductionSecrets,
    alertPolicyCount:m.liveInventory.monitoring.alertPolicyCount,
    dnsState:m.liveInventory.dns.state,
    firebase:m.liveInventory.firebase.observabilityStatus,
    neon:m.liveInventory.neon.observabilityStatus,
    r2:m.liveInventory.r2.observabilityStatus
  },
  blockers:m.blockingBeforeProductionDeployOrSwitch,
  phases:m.provisioningPlan.phases,
  excluded:m.explicitlyExcludedFromM9_4Execution,
  ownerDecision:m.ownerDecision
};
console.log(JSON.stringify(plan,null,2));
