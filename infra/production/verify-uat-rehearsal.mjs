import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const uat=JSON.parse(readFileSync(path.join(here,"uat-rehearsal-manifest.json"),"utf8"));
const release=JSON.parse(readFileSync(path.join(here,"release-manifest.json"),"utf8"));

function assert(condition,message){if(!condition) throw new Error(message);}

assert(uat.mode==="PRODUCTION_LIKE_NON_PRODUCTION_UAT","UAT mode drift");
assert(uat.productionMutationAuthorized===false,"M8.7 must not authorize Production mutation");
assert(uat.releaseAnchor.releaseId===release.releaseId,"Release ID drift");
assert(uat.releaseAnchor.apiImage===release.artifacts.api.immutableRef,"API artifact drift");
assert(uat.releaseAnchor.webImage===release.artifacts.web.immutableRef,"Web artifact drift");

assert(uat.scopeDecision.backendApiUat==="IN_SCOPE","Backend/API UAT must remain in scope");
assert(uat.scopeDecision.webFoundationReachability==="IN_SCOPE","Web foundation reachability must remain in scope");
for(const key of ["webLiffFunctionalUi","mobileUserJourneys","loadingEmptyErrorDisabledUx"]){
  assert(uat.scopeDecision[key]==="DEFERRED_TO_LATER_WEB_LIFF_PROJECT",key+" must remain explicitly deferred");
}
assert(uat.webEvidence.functionalUiClaimed===false,"M8.7 must not claim functional Web/LIFF UI");
assert(uat.webEvidence.deferredNotFailed===true,"Deferred Web/LIFF scope must not be classified as failure");

assert(uat.rehearsalRuntime.apiHealthHttp===200,"API health must pass");
assert(uat.rehearsalRuntime.apiReadyHttp===200,"API readiness must pass");
assert(uat.rehearsalRuntime.database==="connected","Database readiness must pass");
assert(uat.rehearsalRuntime.stage==="test","Rehearsal must remain TEST");
assert(uat.rehearsalRuntime.runtime==="NON_PRODUCTION","Rehearsal must remain non-Production");
assert(uat.rehearsalRuntime.moduleRouting==="LEGACY","Routing must remain LEGACY");
assert(uat.rehearsalRuntime.webRootHttp===200,"Web root must be reachable");
assert(uat.rehearsalRuntime.webLiffHttp===200,"Web LIFF foundation must be reachable");

for(const evidence of uat.backendEvidence){
  assert(evidence.status==="PASS",evidence.area+" must be PASS");
}
assert(uat.finalCrossModuleMarker.marker==="M7_FINAL_E2E_PASS","Final cross-module marker missing");
assert(uat.finalCrossModuleMarker.genericAttachmentDenied===403,"Generic attachment access must remain denied");
assert(uat.finalCrossModuleMarker.pendingActorDenied===true,"Pending actor denial must remain verified");
assert(uat.finalCrossModuleMarker.forgedHeadersIgnored===true,"Forged headers must remain ignored");
assert(uat.finalCrossModuleMarker.privacyNoProviderMetadata===true,"Provider metadata privacy must remain verified");

assert(uat.safety.canonicalTestTrafficChanged===false,"Canonical TEST traffic must remain unchanged");
assert(uat.safety.productionMutation==="NONE","Production mutation by M8.7 must remain zero");
assert(uat.safety.productionMutationByM8_7==="NONE","M8.7 must record zero Production mutation");
assert(uat.safety.externalLegacyProductionDriftObserved===true,"Observed Project A Production drift must be explicit");
assert(uat.safety.externalLegacyProductionCurrentRevision==="ckrr-line-gateway-ownerui-20261006a","Current legacy Production revision drift");
assert(uat.safety.externalLegacyProductionTrafficPercent===100,"Current legacy Production traffic must be 100%");
assert(uat.safety.externalDriftOwner==="PROJECT_A_SEPARATE_WORKSTREAM","External Production drift ownership must remain explicit");
assert(uat.safety.m8_8MustRefreshLegacyBaseline===true,"M8.8 must refresh the legacy baseline");
for(const key of ["productionDataUsed","productionLineChanged","productionDnsChanged","productionGasChanged","sourceOfTruthChanged","routingChanged"]){
  assert(uat.safety[key]===false,key+" must remain false");
}
assert(uat.uatharness.targetApiArtifactUnchanged===true,"UAT harness correction must not change the target API artifact");
assert(uat.releaseProvenance.immutableArtifactAuthority===true,"Immutable M8.4 artifact must remain release authority");
assert(uat.releaseProvenance.m8_4ReleaseManifestFrozen===true,"M8.4 release manifest must remain frozen");
assert(uat.releaseProvenance.currentWorkingTreeDigestMatchesM8_4===false,"Post-release working-tree drift must be explicit");
assert(uat.decision==="PASS","M8.7 decision must be PASS");

console.log(
  "M8_UAT_REHEARSAL_VERIFY_PASS "+
  "release="+uat.releaseAnchor.releaseId+" "+
  "backend="+uat.backendEvidence.length+" "+
  "web=FOUNDATION_ONLY "+
  "routing="+uat.rehearsalRuntime.moduleRouting+" "+
  "production_mutation=0"
);
