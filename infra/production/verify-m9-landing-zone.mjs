import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const m=JSON.parse(readFileSync(path.join(here,"m9-landing-zone-manifest.json"),"utf8"));
function assert(condition,message){if(!condition)throw new Error(message);}

assert(m.schemaVersion==="m9.4-v1","M9.4 schema drift");
assert(m.mode==="PRODUCTION_LANDING_ZONE_READINESS_PLAN_ONLY","M9.4 must remain readiness/plan only");
assert(m.productionMutationAuthorized===false,"M9.4 must never authorize Production mutation");
assert(m.target.moduleRouting==="LEGACY","M9.4 must keep coarse routing LEGACY");

assert(Array.isArray(m.liveInventory.cloudRun.productionServices) && m.liveInventory.cloudRun.productionServices.length===0,"Production Cloud Run services must not be claimed present");
assert(m.liveInventory.iam.runtimeServiceAccountPresent===false,"Production runtime service account must not be claimed present");
assert(m.liveInventory.secretManager.presentProductionSecrets.length===0,"Production secrets must not be claimed present");
assert(m.liveInventory.secretManager.missingProductionSecrets.length===4,"Expected four missing Production secrets");
assert(m.liveInventory.monitoring.alertPolicyCount===0,"Production alert policies must not be claimed present");
assert(m.liveInventory.dns.state==="NXDOMAIN","Production domain readiness drift");
assert(m.liveInventory.firebase.liveProductionSiteVerified===false,"Firebase Production site must remain unverified");
assert(m.liveInventory.neon.liveProductionDatabaseVerified===false,"Neon Production database must remain unverified");
assert(m.liveInventory.r2.providerInventoryReadableFromCurrentToolchain===false,"R2 live inventory limitation must remain explicit");

for(const item of m.completedM9Prerequisites){
  assert(item.status==="PASS","Completed M9 prerequisite drift: "+item.id);
}
const blockers=new Map(m.blockingBeforeProductionDeployOrSwitch.map((x)=>[x.id,x.status]));
for(const id of [
  "EXPLICIT_OWNER_PROVISIONING_APPROVAL",
  "PRODUCTION_LANDING_ZONE_PROVISIONED",
  "PRODUCTION_ALERT_POLICIES_ACTIVE",
  "PRODUCTION_DB_BACKUP_RECOVERY_VERIFIED",
  "PRODUCTION_R2_INDEPENDENT_BACKUP_VERIFIED",
  "EXPLICIT_OWNER_APPROVAL_FOR_NAMED_PRODUCTION_SWITCH"
]){
  assert(blockers.has(id),id+" must remain explicit blocker");
}
assert(!blockers.has("FRESH_POST_M9_IMMUTABLE_RELEASE_CANDIDATE"),"Fresh release must no longer be a blocker");
assert(m.completedM9Prerequisites.some((x)=>x.id==="FRESH_POST_M9_IMMUTABLE_RELEASE_CANDIDATE"&&x.status==="PASS"),"Fresh release completion missing");
assert(m.freshRelease.freshPostM9ReleaseRequired===true,"Fresh post-M9 release must be required");
assert(m.freshRelease.status==="BUILT_VERIFIED","Fresh post-M9 release must be built and verified after M9.5");
assert(m.freshRelease.releaseId==="ckace-hr-m9-rc-20261006a","Fresh post-M9 release ID drift");
assert(m.freshRelease.historicalReleaseReusableForM9ProductionDeploy===false,"M8 release must not be treated as current M9 deploy authority");

assert(m.provisioningPlan.executionMode==="PLAN_ONLY_NON_EXECUTABLE","Provisioning plan must remain non-executable");
assert(m.provisioningPlan.ownerApprovalRequired===true,"Owner approval gate missing");
for(const phase of m.provisioningPlan.phases){
  if(phase.wouldMutateProduction){
    assert(phase.ownerApprovalRequired===true,phase.id+" must be Owner-gated");
    assert(phase.executionStatus==="NOT_AUTHORIZED",phase.id+" must remain NOT_AUTHORIZED");
  }
}
assert(m.ownerDecision.current==="HOLD","Owner decision must remain HOLD");
assert(m.ownerDecision.approvalScopeMustBeNamed===true,"Owner approval must be bounded/named");

const serialized=JSON.stringify(m);
for(const forbidden of ["postgresql://","postgres://","BEGIN PRIVATE KEY","R2_SECRET_ACCESS_KEY="]){
  assert(!serialized.includes(forbidden),"Manifest must not embed secret material: "+forbidden);
}

console.log(
  "M9_4_LANDING_ZONE_VERIFY_PASS "+
  "prod_services=0 "+
  "prod_sa=0 "+
  "prod_secrets=0 "+
  "alerts=0 "+
  "dns=NXDOMAIN "+
  "fresh_release=BUILT_VERIFIED "+
  "production_mutation=0"
);
