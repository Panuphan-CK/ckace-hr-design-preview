import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..","..");
const go=JSON.parse(readFileSync(path.join(here,"go-no-go-manifest.json"),"utf8"));
const release=JSON.parse(readFileSync(path.join(here,"release-manifest.json"),"utf8"));
const rollback=JSON.parse(readFileSync(path.join(here,"observability-rollback-manifest.json"),"utf8"));
const cutover=JSON.parse(readFileSync(path.join(here,"cutover-runbook-manifest.json"),"utf8"));
const uat=JSON.parse(readFileSync(path.join(here,"uat-rehearsal-manifest.json"),"utf8"));
const readiness=JSON.parse(readFileSync(path.join(here,"readiness-manifest.json"),"utf8"));

function assert(condition,message){if(!condition)throw new Error(message);}
function collect(target){
  const stat=statSync(target);
  if(!stat.isDirectory()) return [target];
  return readdirSync(target).sort().flatMap((name)=>collect(path.join(target,name)));
}
function currentArtifactInput(){
  const files=[
    ...["package.json","package-lock.json","tsconfig.base.json"].map((file)=>path.join(root,file)),
    ...["apps","packages"].flatMap((dir)=>collect(path.join(root,dir))),
  ].filter((file)=>
    !file.includes(path.sep+"dist"+path.sep) &&
    !file.includes(path.sep+".next"+path.sep) &&
    !file.includes(path.sep+"node_modules"+path.sep)
  ).sort();
  const entries=files.map((file)=>{
    const relative=path.relative(root,file).replaceAll("\\","/");
    const hash=createHash("sha256").update(readFileSync(file)).digest("hex");
    return relative+"\0"+hash;
  });
  return {fileCount:files.length,sha256:createHash("sha256").update(entries.join("\n")).digest("hex")};
}

assert(go.mode==="FINAL_GO_NO_GO_EVIDENCE_ONLY","M8.8 must remain evidence-only");
assert(go.productionMutationAuthorized===false,"M8.8 must not authorize Production mutation");
assert(go.m8.status==="PASS","M8 must close PASS");
assert(go.m8.completedGates.length===7,"M8.1-M8.7 evidence must all be represented");

assert(go.decision.m8Close==="PASS","M8 close decision drift");
assert(go.decision.m9EngineeringDevTest==="GO","M9 DEV/TEST engineering must be GO");
assert(go.decision.productionAuthoritySwitch==="NO_GO","Production authority switch must remain NO_GO");
assert(go.decision.productionLineDnsGasCutover==="NO_GO","Production LINE/DNS/GAS cutover must remain NO_GO");
assert(go.decision.productionProvisioning==="HOLD_EXPLICIT_OWNER_APPROVAL_REQUIRED","Production provisioning must remain Owner-gated");

assert(go.releaseAuthority.releaseId===release.releaseId,"Release ID drift");
assert(go.releaseAuthority.immutableApiImage===release.artifacts.api.immutableRef,"API immutable artifact drift");
assert(go.releaseAuthority.immutableWebImage===release.artifacts.web.immutableRef,"Web immutable artifact drift");
assert(go.releaseAuthority.m8_4ArtifactInputSha256===release.source.artifactInputSha256,"Frozen M8.4 source digest drift");
assert(go.releaseAuthority.sourceTreeMatchesFrozenRelease===false,"Current tree drift must remain explicit");

const current=currentArtifactInput();
assert(current.fileCount===go.releaseAuthority.currentArtifactInputFileCount,"Current artifact input file count drift");
assert(current.sha256===go.releaseAuthority.currentWorkingTreeSha256,"Current working-tree digest drift");
assert(current.sha256!==release.source.artifactInputSha256,"Current tree must not be misrepresented as the frozen M8.4 source");

assert(rollback.rollbackRehearsal.api.result==="PASS","API rollback evidence must PASS");
assert(rollback.rollbackRehearsal.web.result==="PASS","Web rollback evidence must PASS");
assert(rollback.backupRecovery.database.result==="PASS","DB recovery evidence must PASS");
assert(rollback.backupRecovery.objectStorage.result==="PASS","R2 recovery evidence must PASS");
assert(rollback.observability.alerts.length===7,"Expected seven observability alert contracts");

assert(uat.decision==="PASS","M8.7 UAT must PASS");
assert(uat.webEvidence.functionalUiClaimed===false,"Functional Web/LIFF UI must not be falsely claimed");
assert(uat.scopeDecision.webLiffFunctionalUi==="DEFERRED_TO_LATER_WEB_LIFF_PROJECT","Web/LIFF deferral drift");
assert(uat.rehearsalRuntime.moduleRouting==="LEGACY","UAT routing must remain LEGACY");

assert(cutover.authorityPolicy.noIndefiniteDualWrite===true,"No-dual-write policy missing");
assert(cutover.authorityPolicy.pairedAuthoritySwitchRequired===true,"Paired read/write authority switch rule missing");
assert(cutover.routingGap.runtimeBehavior==="CKACE_MODULE_ROUTING_CURRENTLY_ACCEPTS_LEGACY_ONLY","Routing implementation gap must remain explicit");
assert(cutover.currentState.projectB.moduleRoutingPlaneImplemented===false,"Do not claim routing plane implemented");
assert(cutover.currentState.projectB.writeFreezeControlImplemented===false,"Do not claim write-freeze implemented");

assert(readiness.neon.provisioned===false,"Production Neon must not be claimed provisioned");
assert(readiness.r2.provisioned===false,"Production R2 must not be claimed provisioned");
assert(readiness.firebase.productionSiteProvisioned===false,"Production Firebase site must not be claimed provisioned");

assert(go.liveProjectBProductionInventory.cloudRunProdServicesPresent===false,"Production Cloud Run services must remain absent at M8.8 close");
assert(go.liveProjectBProductionInventory.domain==="hr.ckaceaccount.com","Production domain drift");
assert(go.liveProjectBProductionInventory.dnsState==="NXDOMAIN","Production DNS state drift");

const blockers=new Map(go.m9EntryPrerequisites.beforeFirstProductionAuthoritySwitch.map((x)=>[x.id,x.status]));
for(const id of [
  "SERVER_SIDE_MODULE_ROUTING_PLANE",
  "ROUTING_CONTRACT_FULL_M7_SURFACE_COVERAGE",
  "BOUNDED_MODULE_WRITE_FREEZE_CONTROL",
  "PRODUCTION_LANDING_ZONE_PROVISIONED",
  "FRESH_POST_M9_IMMUTABLE_RELEASE_CANDIDATE",
  "EXPLICIT_OWNER_APPROVAL_FOR_NAMED_PRODUCTION_SWITCH"
]){
  assert(blockers.has(id),id+" must remain an explicit Production-switch blocker");
}

assert(go.deferredScope.webLiffFunctionalUi.blockingM8===false,"Deferred Web/LIFF UI must not block M8");
assert(go.deferredScope.webLiffFunctionalUi.blockingM9Engineering===false,"Deferred Web/LIFF UI must not block M9 engineering");

assert(go.safety.productionMutationByM8_8==="NONE","M8.8 Production mutation must be zero");
assert(go.safety.routingAtClose==="LEGACY","Routing must close M8 as LEGACY");
for(const key of ["productionDataWrite","productionDnsChanged","productionLineChanged","productionGasChanged"]){
  assert(go.safety[key]===false,key+" must remain false");
}

console.log(
  "M8_FINAL_GO_NO_GO_VERIFY_PASS "+
  "m8=PASS "+
  "m9_engineering=GO "+
  "production_switch=NO_GO "+
  "release="+go.releaseAuthority.releaseId+" "+
  "legacy="+go.legacyProductionBaseline.revision+" "+
  "production_mutation=0"
);
