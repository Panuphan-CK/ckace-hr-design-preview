import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..","..");
const manifest=JSON.parse(readFileSync(path.join(here,"m9-release-manifest.json"),"utf8"));
const historical=JSON.parse(readFileSync(path.join(here,"release-manifest.json"),"utf8"));
const landing=JSON.parse(readFileSync(path.join(here,"m9-landing-zone-manifest.json"),"utf8"));

function assert(c,m){if(!c)throw new Error(m);}
function sha(relative){return createHash("sha256").update(readFileSync(path.join(root,relative))).digest("hex");}
function collect(target){const s=statSync(target);if(!s.isDirectory())return[target];return readdirSync(target).sort().flatMap(n=>collect(path.join(target,n)));}
function artifactInput(){
  const files=[
    ...["package.json","package-lock.json","tsconfig.base.json"].map(f=>path.join(root,f)),
    ...["apps","packages"].flatMap(d=>collect(path.join(root,d)))
  ].filter(f=>!f.includes(path.sep+"dist"+path.sep)&&!f.includes(path.sep+".next"+path.sep)&&!f.includes(path.sep+"node_modules"+path.sep)).sort();
  const entries=files.map(f=>path.relative(root,f).replaceAll("\\","/")+"\0"+createHash("sha256").update(readFileSync(f)).digest("hex"));
  return {fileCount:files.length,sha256:createHash("sha256").update(entries.join("\n")).digest("hex")};
}
function migrationEvidence(){
  const dir=path.join(root,"packages","database","prisma","migrations");
  const migrations=readdirSync(dir).filter(n=>statSync(path.join(dir,n)).isDirectory()).sort();
  const entries=migrations.map(n=>n+"\0"+createHash("sha256").update(readFileSync(path.join(dir,n,"migration.sql"))).digest("hex"));
  return {migrations,sha256:createHash("sha256").update(entries.join("\n")).digest("hex")};
}

assert(manifest.schemaVersion==="m9.5-v1","M9.5 schema drift");
assert(manifest.mode==="NON_PRODUCTION_RELEASE_CANDIDATE_BUILD_ONLY","M9.5 must remain build-only");
assert(manifest.productionMutationAuthorized===false,"M9.5 must not authorize Production mutation");
assert(manifest.releaseId==="ckace-hr-m9-rc-20261006a","Release ID drift");

const input=artifactInput();
assert(input.fileCount===manifest.source.artifactInputFileCount,"Artifact input count drift");
assert(input.sha256===manifest.source.artifactInputSha256,"Artifact input digest drift");
assert(sha("package-lock.json")===manifest.source.packageLockSha256,"package-lock digest drift");

const migration=migrationEvidence();
assert(JSON.stringify(migration.migrations)===JSON.stringify(manifest.schema.migrations),"Migration list drift");
assert(migration.migrations.length===manifest.schema.migrationCount,"Migration count drift");
assert(migration.sha256===manifest.schema.migrationSetSha256,"Migration set digest drift");
assert(sha("packages/database/prisma/schema.prisma")===manifest.schema.prismaSchemaSha256,"Prisma schema digest drift");

assert(historical.releaseId==="ckace-hr-m8-rc-20261006a","Historical M8 release identity drift");
assert(historical.source.artifactInputSha256!==manifest.source.artifactInputSha256,"Fresh post-M9 source must differ from M8.4 source");
assert(manifest.historicalRelease.reusableForPostM9Deploy===false,"M8 release must not be reusable for post-M9 deployment");

for(const [name,a] of Object.entries(manifest.artifacts)){
  assert(a.buildStatus==="SUCCESS",name+" build not SUCCESS");
  assert(a.registryDigestVerified===true,name+" registry digest not verified");
  assert(/^sha256:[0-9a-f]{64}$/.test(a.digest),name+" digest invalid");
  assert(a.immutableRef.endsWith("@"+a.digest),name+" immutable ref mismatch");
  assert(!a.immutableRef.includes(":m9-rc-"),name+" immutable authority must not be a tag");
  assert(sha(a.dockerfile)===a.dockerfileSha256,name+" Dockerfile drift");
  assert(sha(a.cloudBuildConfig)===a.cloudBuildConfigSha256,name+" Cloud Build config drift");
}
assert(manifest.deploymentPolicy.imageAuthority==="IMMUTABLE_DIGEST_ONLY","Image authority drift");
assert(manifest.deploymentPolicy.apiImage===manifest.artifacts.api.immutableRef,"API deployment authority mismatch");
assert(manifest.deploymentPolicy.webImage===manifest.artifacts.web.immutableRef,"Web deployment authority mismatch");
assert(manifest.deploymentPolicy.tagOnlyDeployForbidden===true,"Tag-only deploy must remain forbidden");
assert(manifest.deploymentPolicy.sourceTreeDeployForbidden===true,"Source-tree deploy must remain forbidden");
assert(manifest.deploymentPolicy.productionDeployAuthorized===false,"M9.5 must not authorize Production deploy");
assert(manifest.deploymentPolicy.ownerApprovalRequiredBeforeProductionDeploy===true,"Owner Production deploy gate missing");
assert(manifest.productionTarget.moduleRouting==="LEGACY","Production routing target must remain LEGACY");
assert(sha("firebase.prod.json")===manifest.productionTarget.firebaseProdSha256,"Firebase Production config drift");

assert(landing.freshRelease.status==="BUILT_VERIFIED","Landing-zone fresh release status drift");
assert(landing.freshRelease.releaseId===manifest.releaseId,"Landing-zone release ID mismatch");
assert(landing.freshRelease.apiImmutableRef===manifest.artifacts.api.immutableRef,"Landing-zone API immutable ref mismatch");
assert(landing.freshRelease.webImmutableRef===manifest.artifacts.web.immutableRef,"Landing-zone Web immutable ref mismatch");
assert(landing.productionMutationAuthorized===false,"Landing-zone manifest must remain non-mutating");
assert(landing.ownerDecision.current==="HOLD","Owner HOLD gate must remain");

const blockers=new Map(landing.blockingBeforeProductionDeployOrSwitch.map(x=>[x.id,x.status]));
assert(!blockers.has("FRESH_POST_M9_IMMUTABLE_RELEASE_CANDIDATE"),"Fresh release must no longer be a blocker after M9.5");
for(const id of ["EXPLICIT_OWNER_PROVISIONING_APPROVAL","PRODUCTION_LANDING_ZONE_PROVISIONED","PRODUCTION_ALERT_POLICIES_ACTIVE","PRODUCTION_DB_BACKUP_RECOVERY_VERIFIED","PRODUCTION_R2_INDEPENDENT_BACKUP_VERIFIED","LIVE_LEGACY_BASELINE_REFRESH","NAMED_MODULE_RECONCILIATION_PASS","EXPLICIT_OWNER_APPROVAL_FOR_NAMED_PRODUCTION_SWITCH"]){
  assert(blockers.has(id),id+" must remain an explicit blocker");
}
const completed=new Map(landing.completedM9Prerequisites.map(x=>[x.id,x.status]));
assert(completed.get("FRESH_POST_M9_IMMUTABLE_RELEASE_CANDIDATE")==="PASS","Fresh release completion must be recorded");

const serialized=JSON.stringify(manifest);
for(const forbidden of ["postgresql://","postgres://","BEGIN PRIVATE KEY","R2_SECRET_ACCESS_KEY="]){
  assert(!serialized.includes(forbidden),"Release manifest leaked secret material: "+forbidden);
}

console.log("M9_5_RELEASE_VERIFY_PASS release="+manifest.releaseId+" source="+manifest.source.artifactInputSha256+" api="+manifest.artifacts.api.digest+" web="+manifest.artifacts.web.digest+" migrations="+manifest.schema.migrationSetSha256+" production_mutation=0");
