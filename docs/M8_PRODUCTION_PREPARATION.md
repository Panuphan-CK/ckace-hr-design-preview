# M8 — Production Preparation / Rehearsal

**Status:** PASS / CLOSED  
**Current gate:** M8.8 Final Go / No-Go Evidence Package — PASS  
**Date:** 2026-10-06 Asia/Bangkok

## Objective

Prepare CKACE_HR for a controlled Production cutover without changing Production source-of-truth until a later explicit Owner gate.

M8 is preparation/rehearsal only. It does not authorize:

- Production data import/write;
- Production DNS mutation;
- Production LINE/LIFF configuration mutation;
- GAS retirement;
- module-routing switch from `LEGACY`;
- source-of-truth cutover.

## M8 Plan

1. M8.1 Production inventory and topology audit.
2. M8.2 Production config / IAM / secrets parity audit.
3. M8.3 Production database migration rehearsal and rollback proof.
4. M8.4 Release artifact manifest and immutable image verification.
5. M8.5 Observability, backup and rollback rehearsal.
6. M8.6 DNS / LINE / GAS / source-of-truth cutover runbook.
7. M8.7 Production-like UAT and synthetic rehearsal.
8. M8.8 Final Go / No-Go evidence package for M9.

## M8.1 — Production Inventory / Topology Audit

### Legacy Production anchor — Project A

Current authoritative Production remains Project A:

- GAS deployment is v38 and Project A reports 53/53 source parity with local;
- Cloud Run canonical revision is `ckrr-line-gateway-projectafinal-20261005a` at 100%;
- immediate Cloud Run rollback pointer is `ckrr-line-gateway-singleliff-20261005a` at 0%;
- GAS rollback pointer remains v37;
- Production Rich Menu role synchronization is 24/24 PASS;
- Production LIFF remains `2011403971-rHQJIrOx`;
- Project A still has one acceptance limitation: a distinct already-linked active employee Production LIFF lifecycle has not yet been proven.

M8 treats this legacy Production as the rollback/source-of-truth anchor. M8 must not redeploy or retire it during preparation.

### Google Cloud live inventory

Project: `ckrr-leave-system-2026`  
Region: `asia-southeast1`

Current Cloud Run services:

- `ckace-hr-api-test` — TEST;
- `ckace-hr-web-test` — TEST;
- `ckrr-line-gateway` — current legacy Production gateway;
- `ckrr-line-gateway-test` — legacy TEST gateway.

There is currently no:

- `ckace-hr-api-prod`;
- `ckace-hr-web-prod`;
- dedicated CKACE_HR Production runtime service account.

Current CKACE_HR service account is TEST-only:

- `ckace-hr-test@ckrr-leave-system-2026.iam.gserviceaccount.com`.

Legacy Production `ckrr-line-gateway` currently uses the default compute service account. Project B must not inherit that identity automatically.

### Secret inventory

Existing CKACE_HR managed secrets are DEV/TEST scoped:

- Neon DEV database URL;
- TEST bridge secret;
- TEST R2 access key ID;
- TEST R2 secret access key.

No CKACE_HR Production database / bridge / R2 secret set was found in the current GCP inventory.

### Database inventory

Verified Project B database is Neon DEV:

- database: `ckace_hr_dev`;
- M7 schema: 5/5 migrations applied and current.

No Production PostgreSQL / Neon database is currently defined in repository evidence or GCP secret inventory.

### R2 inventory

Verified R2 resource is TEST-only:

- bucket: `ckace-hr-test-private`;
- public access disabled;
- runtime credentials are TEST Secret Manager entries.

No Production R2 bucket/credential boundary is currently defined.

### Firebase / front-door inventory

Repository `firebase.json` currently routes:

- `/api/**` -> `ckace-hr-api-test`;
- all other routes -> `ckace-hr-web-test`.

Therefore this file is **TEST-specific and not safe to deploy as Production configuration**.

The default Firebase domain is live and confirms:

- HTTP 200;
- stage = `test`;
- runtime = `NON_PRODUCTION`;
- module routing = `LEGACY`.

The local host does not have the Firebase CLI installed. A direct Firebase Hosting REST inventory attempt returned 403 with the currently available gcloud credential. This is an observability limitation only; the deployed default TEST front door is independently reachable and verified.

### DNS inventory

Read-only DNS resolution on 2026-10-06:

- `hr.ckaceaccount.com` — unresolved;
- `hr-test.ckaceaccount.com` — unresolved;
- `app.ckaceaccount.com` — unresolved.

No custom HR domain is active yet.

### Artifact / build inventory

Google Artifact Registry repository `cloud-run-source-deploy` exists in `asia-southeast1`.

Latest accepted M7 immutable TEST artifact remains:

- image: `m7-final-20261005b`;
- digest: `sha256:2c463c601c9c9e6af3d1e24a45dd19d26bd33d731ab721868bdbca9945e6705f`;
- TEST revision: `ckace-hr-api-test-00012-lwk`.

M8 must create a Production release manifest pinned by digest; Production must never deploy an unpinned local working tree.

## M8.1 Findings

### PASS

M8.1 has a sufficient verified inventory to define the Production landing-zone work.

### Production-preparation gaps

The following are prerequisites for M9 and are intentionally not resolved by M8.1:

1. dedicated Production API/Web Cloud Run services do not exist;
2. dedicated Production runtime service account does not exist;
3. Production PostgreSQL/Neon database does not exist;
4. Production R2 bucket/credential boundary does not exist;
5. Production HR Secret Manager set does not exist;
6. Production-safe Firebase target/config is not separated from TEST;
7. planned custom domains are unresolved;
8. Project A employee Production LIFF lifecycle evidence remains incomplete;
9. repository still has no approved Git baseline commit; review evidence must continue to use direct file/test/runtime verification.

These are M8 work items, not M7 regressions.

## Production landing-zone rule

Do not reuse TEST resources as Production.

Required isolation target:

`hr.ckaceaccount.com -> Production front door -> ckace-hr-web-prod / ckace-hr-api-prod -> Production Neon -> Production R2`

with a dedicated Production service account and Production Secret Manager references.

Legacy Project A remains live in parallel as rollback/source-of-truth until an explicit M9 module cutover.

## M8.2 — Production Config / IAM / Secrets Parity

### Result — PASS

M8.2 closes the Production configuration design gap without provisioning or mutating Production resources.

Production target names are now fixed in `infra/production/readiness-manifest.json`:

- Cloud Run API: `ckace-hr-api-prod`;
- Cloud Run Web: `ckace-hr-web-prod`;
- runtime service account: `ckace-hr-prod@ckrr-leave-system-2026.iam.gserviceaccount.com`;
- Neon database: `ckace_hr_prod`;
- private R2 bucket: `ckace-hr-prod-private`;
- Firebase Production site: `ckace-hr-prod`;
- Production domain target: `hr.ckaceaccount.com`.

Planned Production Secret Manager names contain references only, never secret values:

- `ckace-hr-neon-prod-database-url`;
- `ckace-hr-prod-bridge-secret`;
- `ckace-hr-prod-r2-access-key-id`;
- `ckace-hr-prod-r2-secret-access-key`.

### Runtime fail-closed readiness

`apps/api/src/runtime/runtime-config.ts` now supports a `production` stage for readiness while preserving `CKACE_MODULE_ROUTING=LEGACY`.

Production startup configuration fails closed unless:

- `DATABASE_URL` exists and targets database `ckace_hr_prod`;
- `CKACE_LEGACY_BRIDGE_SECRET` is present;
- R2 account ID and credentials are present;
- `R2_BUCKET_NAME=ckace-hr-prod-private`;
- `LINE_LOGIN_CHANNEL_ID` is present;
- module routing remains `LEGACY`.

No secret value is returned by runtime configuration or committed to source.

The local example environment variable name was also aligned with the implemented bridge middleware: `CKACE_LEGACY_BRIDGE_SECRET`.

### Firebase TEST / Production separation

Firebase routing is split explicitly:

- `firebase.test.json`
  - site = `ckrr-leave-system-2026`;
  - API = `ckace-hr-api-test`;
  - Web = `ckace-hr-web-test`.
- `firebase.prod.json`
  - site = `ckace-hr-prod`;
  - API = `ckace-hr-api-prod`;
  - Web = `ckace-hr-web-prod`.

The explicit site IDs prevent the Production config from silently targeting the existing default TEST Hosting site.

The Production Firebase site is a **planned target only** and has not been created or deployed.

### IAM model

Verified TEST parity shows the CKACE_HR TEST runtime identity has no project-wide role from the inspected project IAM binding and receives `roles/secretmanager.secretAccessor` at individual secret scope.

Production keeps the same least-privilege pattern:

| Identity / resource | Required boundary |
| --- | --- |
| Production runtime SA | no project-wide role by default |
| Production DB secret | `roles/secretmanager.secretAccessor` only on the Production DB secret |
| Production bridge secret | `roles/secretmanager.secretAccessor` only on the Production bridge secret |
| Production R2 access-key secret | `roles/secretmanager.secretAccessor` only on that secret |
| Production R2 secret-key secret | `roles/secretmanager.secretAccessor` only on that secret |
| Production Cloud Run API/Web | run as the dedicated Production runtime SA |
| Deployment identity | kept separate from runtime identity; grant deploy permissions only at an Owner-approved provisioning/deploy gate |
| R2 runtime token | Object Read & Write scoped only to `ckace-hr-prod-private` |

TEST database, TEST R2 bucket/token and TEST Secret Manager entries are forbidden as Production dependencies.

### Explicit Owner gates

M8.2 does **not** authorize any of the following:

1. create/mutate Production Cloud Run services;
2. create/mutate Production runtime service account or IAM;
3. create Production Neon resources or write Production data;
4. create Production R2 bucket/token;
5. create Production Secret Manager secrets or secret versions;
6. create/attach Production Firebase Hosting site or custom domain;
7. DNS mutation;
8. LINE/LIFF/Login/Messaging Production mutation;
9. GAS Production/source-of-truth mutation;
10. changing module routing away from `LEGACY`.

### Verification

- live M8.1/M8.2 inventory confirmed no existing CKACE_HR Production Cloud Run services, dedicated Production runtime SA or Production secret set;
- TEST secret parity confirmed per-secret `roles/secretmanager.secretAccessor`;
- final `npm run check` — PASS;
- lint — PASS;
- all workspace typechecks — PASS;
- tests — 47 files / 278 tests PASS;
- package build — PASS;
- NestJS API build — PASS;
- Next.js production build — PASS;
- Production deploy/data/DNS/LINE/GAS/routing mutation — NONE.

One initial lint finding in the new runtime test was corrected before final verification; the final repository gate is clean.

## M8.3 — Database Migration Rehearsal / Rollback Proof

### Result — PASS

M8.3 completed a hosted database rehearsal entirely inside the non-Production DEV/TEST boundary.

The rehearsal harness is implemented in:

- `packages/database/src/m8-database-rehearsal.ts`;
- `packages/database/src/m8-database-rehearsal.test.ts`.

Safety guards require all of the following before the harness can run:

- source database name = `ckace_hr_dev`;
- `M8_REHEARSAL_ALLOWED=true`;
- `CKACE_MODULE_ROUTING=LEGACY`;
- generated rehearsal database names must match the bounded safe-name pattern;
- session termination is restricted to the harness-owned M8 rehearsal database names only;
- no Production database name or Production connection is accepted.

### Hosted rehearsal topology

The rehearsal used a dedicated Cloud Run TEST job:

- job: `ckace-hr-m8-db-rehearsal-test`;
- service account: `ckace-hr-test@ckrr-leave-system-2026.iam.gserviceaccount.com`;
- database secret ref: `ckace-hr-neon-dev-database-url:latest`;
- final image tag: `m8-db-rehearsal-20261006b`;
- final image digest: `sha256:365d509a882ae290e98be42ef1d0be41831753c3ffd2558a05bad59e558ba1e0`;
- Cloud Build: `4acb2968-e4df-4c16-96a5-fd0d6287da08` — SUCCESS;
- successful execution: `ckace-hr-m8-db-rehearsal-test-xznk9`.

The harness created isolated DEV-project rehearsal databases rather than modifying `ckace_hr_dev` business data directly.

### Migration / reconciliation / recovery proof

The successful execution emitted:

`M8_DB_REHEARSAL_PASS migrations=5 schema_columns=326 synthetic_import=1 mutation_detected=1 snapshot_match=1 recovered_match=1 production_mutation=0 fingerprint=faf3daecb280265054ffe2b3a909eccb00effedd21d02a7b8c387c0bb757b2ea`

Verified gates:

- repository Prisma migration chain = 5/5 applied from an empty rehearsal database;
- resulting schema = 326 columns;
- synthetic migration bookkeeping/import evidence = PASS;
- deliberate post-snapshot mutation changed the database fingerprint;
- snapshot fingerprint matched the pre-mutation rehearsal state;
- recovered database fingerprint matched the snapshot exactly;
- recovered migration count matched the repository migration count;
- Production mutation count = 0.

The first hosted rehearsal execution failed with PostgreSQL `55006` because a harness-owned rehearsal database still had one active session during `CREATE DATABASE ... TEMPLATE`. The harness was corrected to terminate connections only for its explicitly allow-listed M8 rehearsal databases before cloning. The final hosted execution then passed.

### Final repository verification

After the final M8.3 correction:

- `npm run check` — PASS;
- lint — PASS;
- all workspace typechecks — PASS;
- tests — 48 files / 281 tests PASS;
- package build — PASS;
- NestJS API build — PASS;
- Next.js production build — PASS.

### Residual rehearsal resources

Rehearsal databases from the failed/successful evidence runs and the TEST Cloud Run rehearsal job remain intentionally present for evidence/review.

They are **not** Production resources and are not blocking M8.3 closeout.

Cleanup requires a separate explicit approval because deleting databases/job resources is destructive. M8.3 closeout does not perform that cleanup.

### Production safety

M8.3 performed no:

- Production database creation or write;
- Production migration/import;
- Production Cloud Run deploy;
- Production DNS/LINE/GAS mutation;
- module-routing cutover.

`CKACE_MODULE_ROUTING` remains `LEGACY`.

## M8.4 — Immutable Release Artifact Manifest / Digest Verification

### Result — PASS

M8.4 created an immutable release-candidate evidence package without deploying Production.

Release manifest:

- `infra/production/release-manifest.json`
- release ID: `ckace-hr-m8-rc-20261006a`
- mode: `READINESS_ONLY`
- `productionMutationAuthorized=false`

Because the repository still has no approved Git baseline commit, M8.4 records a deterministic source-input fingerprint instead of inventing a Git commit identity.

Source/build provenance:

- artifact input files: 208;
- artifact input SHA-256: `e7c189bc9a60030cc69167a090ccfafc8e190316d452cb2103fb582bfd5cb619`;
- package-lock SHA-256: `d55db9c755ccd8056d5724df2393eefc4acf74badadfec4ce92ab8b197260286`;
- Prisma schema SHA-256: `0b7d9ad4dc893d0f1f644150d0dfca80bdff22be0fdb81dc43f5de45adea37c0`;
- migration set: 5 migrations;
- migration-set SHA-256: `0f21a111f6fd30a06378d51900e1b0974b91d04aba636366fea5e682e54fabe5`.

### Immutable API artifact

- tag for traceability only: `ckace-hr-api-release:m8-rc-20261006a`;
- Cloud Build: `cbe7f999-2f5d-4de4-8956-76985ca11a9d` — SUCCESS;
- digest: `sha256:bef4064b47a4a1dfc6437522248243a60805299582b70e18087891e4c0aaee2b`;
- deployment authority:
  `asia-southeast1-docker.pkg.dev/ckrr-leave-system-2026/cloud-run-source-deploy/ckace-hr-api-release@sha256:bef4064b47a4a1dfc6437522248243a60805299582b70e18087891e4c0aaee2b`.

### Immutable Web artifact

- tag for traceability only: `ckace-hr-web-release:m8-rc-20261006a`;
- Cloud Build: `0efdf7b7-7bb3-4384-9930-a671a63dcc3c` — SUCCESS;
- digest: `sha256:aced93f23bc778bb33ff7c825b36763e450312c5ad143c7cd0ba19e184a1da49`;
- deployment authority:
  `asia-southeast1-docker.pkg.dev/ckrr-leave-system-2026/cloud-run-source-deploy/ckace-hr-web-release@sha256:aced93f23bc778bb33ff7c825b36763e450312c5ad143c7cd0ba19e184a1da49`.

Artifact Registry live verification confirmed both immutable refs resolve to the exact manifest digests.

### Release manifest verifier

`infra/production/verify-release-manifest.mjs` verifies:

- deterministic source-input file count and SHA-256;
- package-lock digest;
- Prisma schema digest;
- migration list/count and combined migration digest;
- Dockerfile and Cloud Build config digests;
- API/Web build status and registry-verification flags;
- immutable artifact refs match their exact SHA-256 digests;
- deployment policy rejects tag-only authority;
- Firebase Production config and Production readiness-manifest hashes;
- module routing remains `LEGACY`;
- Production database URLs are not embedded.

Verification marker:

`M8_RELEASE_MANIFEST_VERIFY_PASS release=ckace-hr-m8-rc-20261006a source=e7c189bc9a60030cc69167a090ccfafc8e190316d452cb2103fb582bfd5cb619 migrations=0f21a111f6fd30a06378d51900e1b0974b91d04aba636366fea5e682e54fabe5`

The negative self-test intentionally changes API deployment authority to a tag and confirms the verifier rejects it.

### Production deployment plan contract

`infra/production/render-production-deploy-plan.mjs` produces a **non-executable structured plan**.

It requires:

- API/Web images to be immutable `@sha256` references;
- Owner approval before Production mutation;
- `CKACE_RUNTIME_STAGE=production`;
- `CKACE_MODULE_ROUTING=LEGACY`;
- Production DB/R2/Secret Manager references from the readiness contract.

The plan is explicitly blocked until these still-unresolved Owner-gated values are supplied:

- `R2_ACCOUNT_ID`;
- `LINE_LOGIN_CHANNEL_ID`;
- Production provisioning/deploy approval.

No secret values are embedded in the manifest or plan.

### Final verification

- API Cloud Build — SUCCESS;
- Web Cloud Build — SUCCESS;
- immutable Artifact Registry digest verification — PASS;
- release manifest positive verification — PASS;
- tag-only negative self-test — PASS;
- structured non-executable deployment plan — PASS;
- final `npm run check` — PASS;
- lint — PASS;
- all workspace typechecks — PASS;
- tests — 48 files / 281 tests PASS;
- package/API/Next.js production builds — PASS;
- Production deploy/provisioning/data/DNS/LINE/GAS/routing mutation — NONE.

### M8.4 decision

M8.4 is PASS. Release artifacts are immutable and pinned by digest, while Production deployment remains intentionally blocked on unresolved Owner-gated configuration and explicit deployment approval.

## M8.5 — Observability / Backup / Rollback Rehearsal

### Result — PASS

M8.5 completed an isolated non-Production observability, backup and rollback rehearsal anchored to the immutable M8.4 release artifacts.

The formal evidence contract is stored in:

- `infra/production/observability-rollback-manifest.json`;
- `infra/production/verify-observability-rollback.mjs`;
- `infra/production/render-production-rollback-plan.mjs`;
- `infra/production/m8-r2-restore-rehearsal.mjs`;
- `infra/cloudbuild/m8-r2-restore.yaml`;
- `infra/cloudrun/m8-r2-restore.Dockerfile`.

### Observability proof

Live TEST signals were verified:

- `GET /api/health` — HTTP 200 with `ok=true`, stage `test`, runtime `NON_PRODUCTION`, routing `LEGACY` and service revision;
- `GET /api/ready` — HTTP 200 with `database=connected`, stage `test` and routing `LEGACY`;
- Google Cloud Run request logs expose HTTP status, latency, trace, span ID, revision and service name.

The M8.5 contract defines seven alert/abort signals covering:

- revision not ready;
- readiness failure;
- health failure;
- server 5xx regression;
- latency regression;
- authentication/session regression;
- attachment/R2 failure.

Production alert policies are intentionally not provisioned yet and remain Owner-gated.

### Cloud Run rollback rehearsal

Rollback was rehearsed on isolated private TEST services, leaving the primary TEST services unchanged.

API rehearsal:

- service: `ckace-hr-api-rollback-rehearsal-test`;
- baseline image: `sha256:2c463c601c9c9e6af3d1e24a45dd19d26bd33d731ab721868bdbca9945e6705f`;
- M8.4 candidate: `sha256:bef4064b47a4a1dfc6437522248243a60805299582b70e18087891e4c0aaee2b`;
- candidate revision Ready = true;
- forward traffic to candidate = 100%;
- rollback traffic to baseline = 100%;
- result = PASS.

Web rehearsal:

- service: `ckace-hr-web-rollback-rehearsal-test`;
- baseline image: `sha256:7d9752ec23bd90d9c7b49d1b1eaaa7a83e9233f1f8d67d1f4b17ac90403aafad`;
- M8.4 candidate: `sha256:aced93f23bc778bb33ff7c825b36763e450312c5ad143c7cd0ba19e184a1da49`;
- candidate revision Ready = true;
- forward traffic to candidate = 100%;
- rollback traffic to baseline = 100%;
- result = PASS.

Primary TEST remained unchanged after rehearsal:

- API: `ckace-hr-api-test-00012-lwk` at 100%;
- Web: `ckace-hr-web-test-00001-nwx` at 100%.

### Database recovery boundary

M8.5 reuses the verified M8.3 non-Production database recovery proof:

- migrations = 5;
- snapshot match = true;
- recovered match = true;
- recovered fingerprint = `faf3daecb280265054ffe2b3a909eccb00effedd21d02a7b8c387c0bb757b2ea`.

Production requires a verified pre-cutover database snapshot/recovery boundary before source-of-truth switching. No Production database backup resource was provisioned in M8.5.

### R2 object backup / restore rehearsal

A dedicated TEST restore harness was built from the immutable M8.4 API image.

- Cloud Build: `a6c5e23a-9424-4ec7-841b-3153bc34e63a` — SUCCESS;
- harness image digest: `sha256:7445bf8b16c329c8aa5095d27fe5df95b1f8e796260283003cfc431dcd04ad19`;
- Cloud Run Job: `ckace-hr-m8-r2-restore-test`;
- execution: `ckace-hr-m8-r2-restore-test-trxfl` — SUCCESS;
- marker:
  `M8_R2_RESTORE_PASS backup_match=1 mutation_detected=1 restore_match=1 retained=1`;
- restored checksum:
  `8b6623f0dc5d930c90f90bfa905cabefb6f1a0bd87afd3b416ffce89a699f6a9`.

The rehearsal deliberately retained the synthetic primary/backup evidence objects. Destructive cleanup remains separately Owner-gated.

The TEST rehearsal used the same TEST R2 bucket as its copy/restore fault domain. Production therefore requires a separate private backup bucket, planned as `ckace-hr-prod-backup-private`, before object-storage recovery can be accepted for Production.

### Coordinated rollback / abort contract

The non-executable rollback plan requires:

1. verify immutable release digests and revision readiness;
2. verify database/R2 backup evidence;
3. verify health/readiness and abort monitoring;
4. obtain explicit Owner approval before any Production rollback mutation;
5. route API/Web to last-known-good immutable revisions;
6. verify health/readiness/auth;
7. if data recovery is required, stop Project B writes or keep routing `LEGACY`;
8. restore and checksum private object bytes;
9. restore the database to the matching snapshot boundary;
10. run schema migration/reconciliation gates;
11. resume traffic only after verification and Owner approval.

Abort conditions include digest mismatch, revision-not-ready, health/readiness failure, reconciliation failure, missing backup evidence, R2 restore/checksum failure, auth/session regression and ambiguous business write state.

### Final verification

- `M8_OBSERVABILITY_ROLLBACK_VERIFY_PASS release=ckace-hr-m8-rc-20261006a api_rollback=PASS web_rollback=PASS db_recovery=PASS r2_recovery=PASS alerts=7`;
- M8.4 release manifest verifier — PASS;
- final `npm run check` — PASS;
- lint — PASS;
- all workspace typechecks — PASS;
- tests — 48 files / 281 tests PASS;
- package/API/Next.js production builds — PASS;
- Production deploy/provisioning/data/DNS/LINE/GAS/routing mutation — NONE;
- routing remains `LEGACY`.

### Residual rehearsal resources

The isolated rollback services, R2 restore TEST job/image and retained synthetic R2 evidence objects remain for review/evidence.

No destructive cleanup was performed. Cleanup requires separate explicit Owner approval.

### M8.5 decision

M8.5 is PASS. Runtime observability, immutable revision rollback, database recovery evidence, R2 copy/restore, alert triggers and coordinated rollback ownership are verified at the non-Production rehearsal level. Production alert policies and Production backup resources remain prerequisites for later Production provisioning/cutover and are not M8.5 rehearsal blockers.

## M8.6 — DNS / LINE / GAS / Source-of-Truth Cutover Runbook

### Result — PASS

M8.6 completed the cutover runbook only. No Production cutover action was executed.

Primary artifacts:

- `docs/M8_CUTOVER_RUNBOOK.md`;
- `infra/production/cutover-runbook-manifest.json`;
- `infra/production/verify-cutover-runbook.mjs`;
- `infra/production/render-production-cutover-plan.mjs`.

### Live current-state capture

The live control plane was re-read before writing the runbook:

- legacy Production Cloud Run remains `ckrr-line-gateway`;
- current canonical revision is `ckrr-line-gateway-readretry-20261006a` at 100%;
- current legacy image digest is `sha256:0b475189399a2f0d5d18e7fbdaf7d3522713e15332dde001fb0367ff88c380a8`;
- immediate gateway rollback revision remains `ckrr-line-gateway-projectafinal-20261005a`;
- Project A accepted GAS baseline is v38, with v37 retained as the historical GAS rollback;
- Production LIFF remains `2011403971-rHQJIrOx` on the legacy gateway `/liff` endpoint;
- Employee / Approver / Unlinked Rich Menus and aliases remain `employee-user`, `approver-menu`, `account-link`;
- no `ckace-hr-api-prod` or `ckace-hr-web-prod` service exists yet;
- `hr.ckaceaccount.com` remains NXDOMAIN.

This corrects the stale M8.1 gateway pointer: Project A advanced after M8.1, so M8.6 uses the current `readretry-20261006a` state as the rollback anchor.

### Target sequence

The runbook defines six phases:

1. freeze and verify the runbook;
2. provision the dedicated Project B Production landing zone;
3. establish `hr.ckaceaccount.com` and managed TLS before changing LINE;
4. perform M9 module cutovers one module at a time while preserving the current Production LIFF/Rich Menu entry;
5. switch the existing Production LIFF endpoint to `https://hr.ckaceaccount.com/liff` only after the required user-visible modules are NEW and stable;
6. retain GAS v38 / legacy gateway through stabilization and defer retirement to M11.

Every actual Production phase remains explicitly Owner-gated.

### Source-of-truth rule

Indefinite GAS/PostgreSQL dual-write remains prohibited.

For any write-capable module:

- freeze that module's writes;
- capture the final legacy delta read-only;
- import and reconcile the delta;
- verify health/readiness/auth/idempotency;
- switch read and write authority together inside one bounded freeze window;
- run controlled verification;
- resume writes on exactly one authority.

A read-first switch would become stale after a legacy write. A write-first switch would make new writes invisible to legacy reads. The runbook therefore requires a paired authority switch.

Before the first NEW-authority write, rollback can remain a routing/transport rollback.

After any NEW-authority write, blind routing back to GAS is forbidden. Writes must stop, Project B changes must be enumerated/reconciled and an Owner-approved forward-fix or controlled data rollback must restore exactly one source of truth.

### Routing-plane gap discovered

M8.6 verified that the codebase currently contains a `ModuleRoutingState` contract, but the runtime does not consume a per-module routing state.

Current runtime behavior still requires `CKACE_MODULE_ROUTING=LEGACY` and rejects any non-`LEGACY` value.

The current route-key contract also does not explicitly cover all M7 surfaces, including Benefits, Request Status, Attachments, Notifications, Onboarding and announcement-write granularity.

Therefore the first M9 module cutover is blocked until these are implemented and verified:

- server-side module routing plane;
- full Production surface route coverage;
- bounded module write-freeze control.

This is a later execution prerequisite, not an M8.6 runbook failure.

### LINE and Rich Menu strategy

The runbook intentionally preserves the existing Production LIFF ID and current Rich Menu objects.

During module cutovers:

- keep Production LIFF `2011403971-rHQJIrOx`;
- keep Employee / Approver / Unlinked Rich Menu objects and aliases stable;
- keep the legacy gateway as the user entry and rollback boundary.

Only after the direct Project B entry gate is ready:

- change the endpoint of the existing LIFF ID to `https://hr.ckaceaccount.com/liff`;
- preserve scopes and Add friend behavior;
- do not recreate Rich Menus if their URI actions still target the same LIFF ID.

LINE endpoint rollback restores the existing legacy gateway `/liff` endpoint. Rich Menu rollback is not expected when the LIFF ID itself does not change.

### Production execution blockers

The non-executable renderer correctly reports these as unresolved before Production execution:

- M8.7 Production-like UAT;
- M8.8 Final Go/No-Go;
- explicit Owner Production provisioning approval;
- Production landing zone;
- Production alert policies;
- Production database backup/recovery;
- independent Production R2 backup;
- server-side module routing plane;
- module write-freeze control;
- full routing-contract module coverage.

### Verification

- M8.4 release manifest verifier — PASS;
- M8.5 observability / rollback verifier — PASS;
- M8.6 marker:
  `M8_CUTOVER_RUNBOOK_VERIFY_PASS release=ckace-hr-m8-rc-20261006a legacy=ckrr-line-gateway-readretry-20261006a phases=6 owner_gates=9 production_mutation=0`;
- non-executable cutover renderer — PASS;
- final `npm run check` — PASS;
- lint — PASS;
- all workspace typechecks — PASS;
- tests — 48 files / 281 tests PASS;
- package/API/Next.js production builds — PASS;
- Production deploy/provisioning/data/DNS/LINE/GAS/routing mutation — NONE.

### M8.6 decision

M8.6 is PASS. The current-to-target topology, DNS/Firebase/Cloud Run order, LINE/Rich Menu strategy, GAS coexistence boundary, per-module source-of-truth transition, post-write rollback boundary and Owner gates are explicit and machine-verifiable.

The runbook does not claim that Production is ready to cut over today. It records the prerequisites that must be satisfied before M9 execution.

## M8.7 — Production-like UAT / Synthetic Rehearsal

### Result — PASS

Owner clarified the M8.7 acceptance scope:

- backend/API Production-like UAT is in scope;
- Web root and `/liff` foundation reachability are in scope;
- functional Web/LIFF UI, mobile user journeys and loading/empty/error/disabled UX are intentionally deferred to a later Web/LIFF project after backend/system testing;
- deferred Web/LIFF functionality is not an M8.7 defect and does not block M8.8.

This scope is encoded in:

- `infra/production/uat-rehearsal-manifest.json`;
- `infra/production/verify-uat-rehearsal.mjs`.

### Production-like rehearsal runtime

Dedicated non-Production services were created from the immutable M8.4 candidates:

- API service: `ckace-hr-api-uat-rehearsal-test`;
- API revision: `ckace-hr-api-uat-rehearsal-test-m8uat`;
- API image: M8.4 immutable digest `sha256:bef4064b47a4a1dfc6437522248243a60805299582b70e18087891e4c0aaee2b`;
- Web service: `ckace-hr-web-uat-rehearsal-test`;
- Web image: M8.4 immutable digest `sha256:aced93f23bc778bb33ff7c825b36763e450312c5ad143c7cd0ba19e184a1da49`;
- stage = `test`;
- runtime = `NON_PRODUCTION`;
- module routing = `LEGACY`.

Live probes:

- `/api/health` — HTTP 200;
- `/api/ready` — HTTP 200;
- database = connected;
- Web `/` — HTTP 200;
- Web `/liff` — HTTP 200;
- Web viewport includes `width=device-width, initial-scale=1`.

The current Web artifact correctly identifies itself as `Project B Foundation` / `Foundation Route`; M8.7 does not claim functional HR UI behavior that is not present.

### Backend / API UAT

Production-like synthetic UAT against the isolated API target passed:

- Auth/session/security — PASS;
- Identity/Profile — `M7_IDENTITY_PROFILE_E2E_PASS`;
- Leave — `M7_LEAVE_E2E_PASS`;
- Attendance / Check-in / Check-out / Time Correction — `M7_ATTENDANCE_E2E_PASS`;
- OT — `M7_OVERTIME_E2E_PASS`;
- Medical — `M7_MEDICAL_E2E_PASS`;
- Benefits / Request Status / Attachments / Announcements / Notifications / Admin / Onboarding — final cross-module PASS.

Final execution:

- job: `ckace-hr-m8-uat-final-test`;
- execution: `ckace-hr-m8-uat-final-test-t874m`;
- result: SUCCESS;
- marker:
  `M7_FINAL_E2E_PASS benefits=200 requests_self=200 requests_assigned=200 attachment_upload=201 attachment_finalize=201 announcement_create=201 announcement_read=200 announcement_relation_download=201 generic_attachment_denied=403 admin_notifications=200 admin_retry=201 admin_settings=200 onboarding_register=201 pending_line_bind=1 pending_actor_denied=1 onboarding_approve=201 onboarding_replay=201 active_actor=1 privacy_no_provider_metadata=1 forged_headers_ignored=1`.

### Medical UAT harness correction

The first Medical UAT attempt returned HTTP 400 from the smoke harness.

This did not require changing the immutable M8.4 target API artifact.

The standalone Medical smoke harness was corrected and rebuilt separately:

- Cloud Build: `3f119441-535b-4a35-a784-8363d823f64f`;
- harness digest: `sha256:cad7a94940073fa89e10b4dc1007cde3cf1d9219cba755eac99f3b334deda9cb`;
- successful execution: `ckace-hr-m8-uat-medical-test-6q4xh`;
- marker: `M7_MEDICAL_E2E_PASS`.

`hosted-medical-e2e-smoke.ts` is a standalone test harness and is not imported by the API runtime entrypoint.

### Release provenance boundary

The M8.4 release manifest remains frozen and authoritative for the immutable API/Web artifacts.

The current working tree no longer matches the original M8.4 source fingerprint because post-release UAT harness/test work occurred. M8.7 deliberately does not rewrite the M8.4 fingerprint to match the current tree.

For M8.8:

- use the M8.4 immutable image digests/source archive as the release authority;
- separately review post-release working-tree changes;
- do not treat current-tree fingerprint drift as an immutable artifact digest change.

### TEST and Production safety

Canonical TEST remained unchanged after the M8.7 isolated rehearsal:

- API: `ckace-hr-api-test-00012-lwk` at 100%;
- Web: `ckace-hr-web-test-00001-nwx` at 100%.

M8.7 performed no Production mutation.

A separate Project A workstream changed the live legacy Production gateway during M8.7:

- current gateway revision: `ckrr-line-gateway-ownerui-20261006a` at 100%;
- current image digest: `sha256:272fc4db43213b50b90387477d7f0e864f8c2d9cd0a4354c2b1608effea87d7f`;
- prior `readretry-20261006a` is retained as rollback according to Project A continuity.

This external drift is not an M8.7 mutation. M8.8 must refresh the live legacy baseline before issuing its Go/No-Go decision.

### Verification marker

`M8_UAT_REHEARSAL_VERIFY_PASS release=ckace-hr-m8-rc-20261006a backend=7 web=FOUNDATION_ONLY routing=LEGACY production_mutation=0`

Final repository gate:

- `npm run check` — PASS;
- lint — PASS;
- all workspace typechecks — PASS;
- tests — 48 files / 281 tests PASS;
- package/API/Next.js production builds — PASS.

### M8.7 decision

M8.7 is PASS under the Owner-confirmed scope.

Backend/API Production-like UAT passed. Web/LIFF foundation reachability passed. Functional Web/LIFF HR UI is intentionally deferred and must not be represented as tested or complete in this phase.

## M8.8 — Final Go / No-Go Evidence Package

### Result — PASS / M8 CLOSED

Primary artifacts:

- `docs/M8_FINAL_GO_NO_GO.md`;
- `infra/production/go-no-go-manifest.json`;
- `infra/production/verify-go-no-go.mjs`.

### Final decisions

- M8 Production Preparation / Rehearsal: **PASS / CLOSED**.
- M9 DEV/TEST engineering: **GO**.
- Production provisioning: **HOLD — explicit Owner approval required**.
- Production module authority / source-of-truth switch: **NO-GO**.
- Production DNS / LINE / GAS cutover: **NO-GO**.

Closing M8 is therefore not an authorization to mutate Production. It authorizes only progression into the bounded M9 engineering workstream.

### Refreshed legacy Production baseline

M8.8 live GCP readback supersedes the historical M8.6 current-state pointer:

- service: `ckrr-line-gateway`;
- current live revision: `ckrr-line-gateway-ownerui-20261006a`;
- traffic: 100%;
- current image digest: `sha256:272fc4db43213b50b90387477d7f0e864f8c2d9cd0a4354c2b1608effea87d7f`;
- immediate rollback according to Project A continuity: `ckrr-line-gateway-readretry-20261006a`;
- GAS: v38;
- historical GAS rollback: v37;
- Production LIFF remains `2011403971-rHQJIrOx`;
- source of truth remains Legacy GAS / Sheets / Drive.

Project A records transient read-only 502/timeouts on secondary APIs after the owner-ui deploy. This is an open operational risk for a future Production execution window, not a blocker to M9 DEV/TEST engineering. A fresh legacy health/readiness/log quiet-window readback is required immediately before any Production authority switch.

### Current Project B Production readiness

Live Cloud Run inventory still contains no:

- `ckace-hr-api-prod`;
- `ckace-hr-web-prod`.

`hr.ckaceaccount.com` remains NXDOMAIN.

The M8.2 readiness contract also still marks dedicated Production Neon, Production R2 and Production Firebase as not provisioned. M8.5 records Production alert policies and independent R2 backup as not provisioned.

Therefore Production execution remains NO-GO.

### Immutable release vs current source tree

Frozen M8.4 release authority remains:

- API digest: `sha256:bef4064b47a4a1dfc6437522248243a60805299582b70e18087891e4c0aaee2b`;
- Web digest: `sha256:aced93f23bc778bb33ff7c825b36763e450312c5ad143c7cd0ba19e184a1da49`;
- M8.4 source fingerprint: `e7c189bc9a60030cc69167a090ccfafc8e190316d452cb2103fb582bfd5cb619`;
- M8.4 artifact input count: 208 files.

Current source-tree artifact-input fingerprint is:

- file count: 208;
- SHA-256: `c76bbeb56f77c21ea434ae4601c5a179ca4e2b148b209af980d01591decf7b2f`.

The difference is intentionally retained because post-release M8.7 UAT harness/test work occurred. The historical M8.4 release manifest must not be rewritten to match the later working tree.

The current M8.4 release verifier will therefore detect source-tree drift if rerun against the later working tree. This is expected provenance protection, not evidence that the immutable Artifact Registry images changed.

Any M9 runtime/code change requires a fresh immutable release candidate and provenance verification before a future Production deploy.

### M9 Production-switch blockers

Before the first Production authority switch, all of the following must pass:

1. server-side per-module routing plane;
2. complete route coverage for every M7 Production surface;
3. bounded per-module write-freeze control;
4. dedicated Production landing zone;
5. Production alert policies;
6. Production DB backup/recovery proof;
7. independent Production R2 backup proof;
8. fresh post-M9 immutable release candidate;
9. refreshed live legacy baseline in the execution window;
10. named-module reconciliation PASS;
11. explicit Owner approval for that exact module switch.

### Web / LIFF scope

Owner-confirmed functional Project B Web/LIFF HR UI remains deferred to a later dedicated project.

This does not block M8 closure or M9 backend engineering. It must not be represented as functionally UAT-tested until that later project is performed.

### Final verification

- M8.5 verifier — PASS;
- M8.6 verifier — PASS;
- M8.7 verifier — PASS;
- M8.8 marker:
  `M8_FINAL_GO_NO_GO_VERIFY_PASS m8=PASS m9_engineering=GO production_switch=NO_GO release=ckace-hr-m8-rc-20261006a legacy=ckrr-line-gateway-ownerui-20261006a production_mutation=0`;
- last full repository gate after M8.7 source changes: `npm run check` PASS;
- tests: 48 files / 281 tests PASS;
- lint/typecheck/packages/API/Next.js production build PASS;
- Production mutation by M8.8: NONE;
- routing at M8 close: `LEGACY`.

### M8 close decision

M8 is PASS / CLOSED.

The project may move to M9.1 DEV/TEST engineering, but no Production resource provisioning, Production deployment, DNS/LINE/GAS change, data import/write or module authority switch is authorized by this decision.

## Next Phase — M9.1

Start **M9.1 — Server-side Module Routing + Write-Freeze Foundation** in DEV/TEST only:

- expand route coverage to every M7 Production surface;
- implement server-side authority resolution;
- implement bounded per-module write-freeze;
- keep `LEGACY` as fail-closed default;
- test paired READ+WRITE authority switching and rollback boundaries;
- do not provision or switch Production without a later explicit Owner gate.
