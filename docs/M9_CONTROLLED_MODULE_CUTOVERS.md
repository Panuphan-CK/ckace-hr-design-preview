# CKACE HR — M9 Controlled Module Cutovers

Last Updated: 2026-10-06 Asia/Bangkok

## Phase Status

M9 is in engineering / preparation.

- M9.1 Server-side Module Routing + Write-Freeze Foundation — PASS / CLOSED.
- M9.2 Routing / Freeze Security & Failure QA — NEXT.
- Production authority/source-of-truth switching — NO-GO until later Owner-gated cutover prerequisites pass.

## M9.1 — Server-side Module Routing + Write-Freeze Foundation

### Result — PASS

M9.1 implemented the server-side routing control plane and bounded write-freeze foundation in DEV/TEST only.

No Production resource, data, DNS, LINE, GAS or source-of-truth mutation occurred.

### Routing contract

`packages/contracts/src/module-routing.ts` now defines:

- authority targets: `LEGACY | NEW`;
- access modes: `READ | WRITE`;
- 13 HR module keys;
- 26 paired route keys;
- complete M7 surface coverage:
  - Identity;
  - Leave;
  - Attendance;
  - Time Correction;
  - OT;
  - Medical;
  - Benefits;
  - Request Status;
  - Attachments;
  - Announcements;
  - Notifications;
  - Admin;
  - Onboarding.

Every module has paired READ/WRITE authority state even when the current HTTP surface exposes only one side.

The default state is `LEGACY_ONLY_ROUTING`.

### Fail-closed routing configuration

`apps/api/src/routing/module-routing-config.ts` provides server-only parsing for:

- `CKACE_MODULE_ROUTING_STATE`;
- `CKACE_MODULE_WRITE_FREEZE`.

Rules:

1. omitted routing state defaults every route to `LEGACY`;
2. unknown route keys fail;
3. unknown authority values fail;
4. READ and WRITE authority for the same module must match;
5. Production rejects any `NEW` route during M9.1;
6. unknown write-freeze module names fail.

The coarse runtime safety marker `CKACE_MODULE_ROUTING=LEGACY` remains unchanged.

### Server-side authority resolver

`ModuleRoutingService` resolves a route key into a server-derived context containing:

- route key;
- module;
- READ/WRITE access;
- LEGACY/NEW authority;
- write-freeze state.

The routing context is never accepted from the client as authority.

`ModuleRoutingGuard` overwrites any forged request routing context with the server-derived value.

M9.1 establishes the control plane only. It does not authorize Production dispatch or source-of-truth switching.

### Bounded write freeze

The global routing guard runs before controller execution.

For a frozen WRITE route it fails closed with:

- HTTP 503;
- code `MODULE_WRITE_FROZEN`;
- module identifier;
- `retryable=false`.

READ routes for the same module remain readable during a bounded write-freeze.

This provides the freeze primitive required for final legacy delta capture and reconciliation in later M9 work.

### HTTP route coverage

Business controllers use `@ModuleRoute(...)` metadata.

Verified mappings cover 40 existing business HTTP handlers.

A regression test now scans every HTTP handler in the business controllers and fails if a future business endpoint is added without server-side routing metadata.

Intentionally non-routed endpoints are limited to infrastructure/contract surfaces such as health/readiness and `security/contract`.

### Configuration documentation

`.env.example` documents the DEV/TEST-only M9.1 controls:

- `CKACE_MODULE_ROUTING_STATE`;
- `CKACE_MODULE_WRITE_FREEZE`.

It continues to contain placeholders only and no real credentials.

### Verification

Targeted routing tests:

- 4 test files;
- 51 tests PASS.

Full repository gate:

- `npm run check` — PASS;
- lint — PASS;
- typecheck — PASS;
- tests — 52 files / 332 tests PASS;
- package builds — PASS;
- NestJS API build — PASS;
- Next.js production build — PASS.

The concurrent duplicate check attempt that reported another Next build process was not a code failure; the already-running full gate completed successfully.

### Safety

- Production deploy = 0.
- Production database write = 0.
- Production DNS change = 0.
- Production LINE change = 0.
- Production GAS change = 0.
- Production module authority switch = 0.
- Runtime coarse routing remains `LEGACY`.
- Project A was not modified.

### M9.1 decision

M9.1 is PASS / CLOSED.

The routing control plane, full M7 route coverage and bounded write-freeze primitive are now implemented and verified in DEV/TEST.

This does not mean a request is authorized to switch Production authority. Later M9 work must still exercise security/failure behavior, reconciliation/delta tooling, Production landing-zone gates and named module cutover approval.

## M9.2 — Routing / Freeze Security & Failure QA

### Result — PASS / CLOSED

M9.2 completed DEV/TEST-only security and failure QA for the M9.1 routing/write-freeze control plane.

No Production resource, data, DNS, LINE, GAS or source-of-truth mutation occurred.

### Runtime gap corrected — auth before freeze disclosure

M9.2 found one real security-ordering gap in the M9.1 guard flow:

- the routing guard derived the server-side module route correctly;
- but a frozen protected route could expose freeze state before authentication/authorization completed.

The runtime was hardened so protected routes now behave in this order:

1. ModuleRoutingGuard derives and overwrites the server-owned routing context;
2. AuthorizationGuard verifies authentication and permission;
3. only an authorized protected request reaches the write-freeze assertion;
4. public business writes that intentionally have no permission guard are still frozen directly in ModuleRoutingGuard.

Verified outcomes:

- unauthenticated protected frozen route -> 401;
- authenticated but unauthorized protected frozen route -> 403;
- authorized protected frozen write -> 503 `MODULE_WRITE_FROZEN`;
- no protected route exposes freeze state before auth.

### Invalid / incomplete routing configuration

Fail-closed cases are covered and PASS:

- malformed routing JSON;
- array/null instead of object;
- unknown route key;
- invalid authority value;
- split READ/WRITE authority for one module;
- Production `NEW` routing;
- unknown module in write-freeze config.

Default/no-config behavior remains all `LEGACY` with no frozen modules.

### Client-forged authority resistance

The route authority is still server-derived.

A client-provided/forged `moduleRouting` object is overwritten by the routing guard and cannot select `LEGACY` or `NEW`.

### Freeze concurrency

A concurrent freeze test sends 32 write attempts through the frozen public-write guard path.

Result:

- all 32 attempts rejected;
- every rejection is `ServiceUnavailableException`;
- no request is permitted to proceed into the controller.

### Restart / config stability

`ModuleRoutingService` snapshots its routing/freeze configuration when the service instance is created.

Changing environment values after an instance exists does not mutate that instance.

A newly created instance reads the new environment state.

This matches the intended Cloud Run revision/config model and avoids per-request authority drift.

### Ambiguous write / no-blind-retry boundary

Representative write services were verified for:

- Leave;
- Attendance;
- OT;
- Medical.

When the repository raises an ambiguous commit-state error:

- the error propagates;
- the repository method is called exactly once;
- the service does not blindly retry the business write.

This preserves the project rule that ambiguous business commits must be reconciled rather than automatically replayed.

### Verification

Targeted M9.2 QA:

- 6 test files;
- 67 tests PASS.

Full repository gate:

- `npm run check` — PASS;
- lint — PASS;
- typecheck — PASS;
- tests — 53 files / 344 tests PASS;
- package builds — PASS;
- NestJS API build — PASS;
- Next.js production build — PASS.

Authoritative full QA task:

`aa6a16a7-90ed-448d-b4fa-0c8e6852b5bc`

One earlier targeted failure was test-only: the OT test used a 7-character client key below the pre-existing minimum length. The test input was corrected to `m9-ot-01`; runtime behavior was not changed for that issue.

### Safety

- Production deploy = 0.
- Production database write = 0.
- Production DNS change = 0.
- Production LINE change = 0.
- Production GAS change = 0.
- Production module authority switch = 0.
- coarse runtime routing remains `LEGACY`.
- Project A was not modified.

### M9.2 decision

M9.2 is PASS / CLOSED.

Routing/freeze security ordering, invalid-config behavior, forged-authority resistance, freeze concurrency, service-recreation stability and no-blind-retry boundaries are verified.

## M9.3 — Reconciliation / Delta Cutover Tooling

### Result — PASS / CLOSED

M9.3 completed deterministic, source-qualified named-module cutover evidence tooling in DEV/TEST only.

No live Production resource, data, DNS, LINE, GAS, routing or source-of-truth mutation occurred.

### Final legacy delta capture

Added `packages/migration/src/cutover-evidence.ts`.

`buildFinalLegacyDelta(...)`:

- requires the same bounded legacy source descriptor set before and after the freeze window;
- preserves source-qualified provenance;
- classifies changes as `ADDED`, `CHANGED` or `REMOVED`;
- creates import snapshots only for ADDED/CHANGED rows;
- computes deterministic baseline/final snapshot-set hashes and a delta SHA-256;
- rejects duplicate source-qualified records.

Snapshot integrity is re-verified before evidence construction:

- provenance must match the snapshot descriptor;
- row payload hash must match canonical row values;
- provenance row fingerprint must match the payload hash;
- snapshot hash must recompute exactly.

Tampered snapshots therefore fail closed.

### Reconciliation / pre-switch gate

`buildModuleCutoverEvidence(...)` requires:

- named module;
- READ authority = `LEGACY`;
- WRITE authority = `LEGACY`;
- write-freeze active;
- exact migration-report coverage for every bounded import snapshot;
- no unexpected/duplicate import report;
- explicit reconciliation for every REMOVED source record;
- module-level reconciliation evidence;
- health/readiness/authentication/idempotency verification.

Blocking migration outcomes, reconciliation failures or missing evidence produce `BLOCKED`.

Explicit legacy exceptions remain visible as `PASS_WITH_EXCEPTIONS`; they are never silently rewritten to PASS.

The returned evidence package includes the full reconciliation rows and dispositions, not only counts.

Every package carries:

- schema `m9.3-v1`;
- mode `DEV_TEST_EVIDENCE_ONLY`;
- `productionMutationAuthorized=false`;
- deterministic `evidenceHash`.

### Synthetic named-module evidence

Added:

- `infra/rehearsal/m9.3-generate-leave-evidence.cjs`;
- `infra/rehearsal/m9.3-leave-cutover-evidence.json`.

The LEAVE synthetic package rendered successfully through the real compiled migration tooling:

- gate = `PASS`;
- pre-switch authority = `LEGACY / LEGACY`;
- write-freeze = active;
- delta = 1 ADDED + 1 CHANGED + 0 REMOVED;
- reconciliation = 3 PASS / 0 EXCEPTION / 0 FAIL;
- blockers = 0;
- production mutation authorized = false;
- evidence hash = `e96bb2935d42a4b3070f8e4ef53eb8b1d491dc505c589ccf58ebce70d669f90b`.

This is synthetic DEV/TEST evidence only and is not a Production data cutover.

### Failure coverage

M9.3 tests verify fail-closed behavior for:

- source descriptor drift;
- source-qualified provenance mismatch;
- payload/snapshot tampering;
- unsafe pre-switch authority;
- missing write freeze;
- missing or unexpected migration reports;
- import-report coverage mismatch;
- missing removal reconciliation;
- blocking module reconciliation;
- failed runtime readiness;
- deterministic evidence hashing.

### Verification

Targeted migration/cutover QA:

- 4 test files;
- 24 tests PASS.

Workspace typecheck — PASS.

Full repository gate task `99891b65-9d03-43bc-b48c-80a6bb1c6204`:

- `npm run check` — PASS;
- lint — PASS;
- typecheck — PASS;
- tests — 54 files / 353 tests PASS;
- package builds — PASS;
- NestJS API build — PASS;
- Next.js production build — PASS.

### M9.3 decision

M9.3 is PASS / CLOSED.

The project now has a reusable evidence contract for bounded final-delta capture and pre-switch reconciliation. It does not itself execute an authority switch.

## M9.4 — Production Landing Zone Preparation

### Result — PASS / PREPARED / NOT PROVISIONED

M9.4 refreshed the live Production landing-zone inventory and produced a bounded non-executable provisioning contract.

No Production resource was created, changed, deployed, bound or switched.

### Live inventory refresh

Read-only evidence observed on 2026-10-06:

- Project B Production Cloud Run services matching `ckace-hr-*-prod`: 0.
- planned runtime service account `ckace-hr-prod@ckrr-leave-system-2026.iam.gserviceaccount.com`: absent.
- planned CKACE_HR Production Secret Manager secrets: 0 present / 4 missing.
- only the existing Neon DEV database secret was observed: `ckace-hr-neon-dev-database-url`.
- Cloud Monitoring alert policies in the project: 0.
- `hr.ckaceaccount.com`: NXDOMAIN.
- Firebase CLI is not installed locally, so the Production Hosting site is not claimed live-verified.
- Neon project config points to `flat-tree-71711157`, but the Neon connector currently returns HTTP 401; Production database presence is therefore not claimed verified.
- R2 provider inventory is not directly readable from the current connected toolchain; Production R2 resources are therefore not claimed provisioned until live verification is available.
- legacy Production `ckrr-line-gateway-ownerui-20261006a` remains the observed 100% traffic revision.

The Neon and R2 limitations are observability limitations, not evidence that those provider resources exist. M9.4 remains fail-closed and treats them as not ready until Owner-approved provisioning or successful live verification.

### M9 prerequisite reconciliation

Historical M8.8 correctly recorded the following as blockers at that time:

- server-side routing plane;
- full M7 route coverage;
- bounded write-freeze.

Those engineering prerequisites are now PASS through M9.1.

M9.2 security/failure QA is PASS and M9.3 deterministic final-delta/reconciliation tooling is PASS.

Remaining Production blockers are:

- explicit Owner provisioning approval;
- Production landing zone actually provisioned;
- Production alert policies;
- Production database backup/recovery verification;
- Production independent R2 backup verification;
- fresh immutable post-M9 release candidate;
- live legacy execution-window baseline immediately before switch;
- named-module reconciliation PASS immediately before switch;
- explicit Owner approval for the named module authority switch.

### Fresh release rule

The M8.4 release `ckace-hr-m8-rc-20261006a` remains valid historical M8 evidence, but it is not valid deployment authority for current M9 source because M9.1-M9.3 changed build inputs.

A fresh immutable API/Web release must therefore be built and digest-verified before any Project B Production Cloud Run deployment.

### Landing-zone plan artifacts

Created:

- `infra/production/m9-landing-zone-manifest.json`;
- `infra/production/verify-m9-landing-zone.mjs`;
- `infra/production/render-m9-landing-zone-plan.mjs`.

The plan is `PLAN_ONLY_NON_EXECUTABLE`, sets `productionMutationAuthorized=false`, embeds no credential values, and keeps every Production-mutating phase at `NOT_AUTHORIZED`.

Planned bounded phases:

1. P1 — dedicated Production service account + four Secret Manager containers + exact per-secret access.
2. P2 — dedicated Neon Production boundary + backup/PITR verification + private R2 primary/independent backup buckets + bucket-scoped credentials.
3. P3 — fresh post-M9 immutable API/Web release and digest verification; this phase itself is non-Production build work.
4. P4 — Production Cloud Run API/Web + Firebase Hosting, while every module remains `LEGACY`.
5. P5 — seven alert policies + database backup/recovery + R2 independent backup/restore verification.
6. P6 — custom-domain/DNS/TLS staging without changing the existing Production LINE LIFF endpoint.

Explicitly excluded from M9.4 execution:

- LINE/LIFF/Login/Messaging/Rich Menu mutation;
- GAS Production mutation;
- source-of-truth switch;
- module authority switch to `NEW`;
- Production data import;
- GAS retirement.

### Verification

`verify-m9-landing-zone.mjs` PASS marker:

`M9_4_LANDING_ZONE_VERIFY_PASS prod_services=0 prod_sa=0 prod_secrets=0 alerts=0 dns=NXDOMAIN fresh_release=NOT_BUILT production_mutation=0`

`render-m9-landing-zone-plan.mjs` renders `PLAN_ONLY_NON_EXECUTABLE`, `productionMutationExecuted=false`, `ownerApprovalRequired=true`, and all Production-mutating phases remain `NOT_AUTHORIZED`.

Both scripts pass `node --check`.

### M9.4 decision

M9.4 preparation is PASS / CLOSED.

At M9.4 close, the Production landing zone itself was **not provisioned** and remained an Owner gate. M9.6 later provisioned/staged that landing zone without authorizing a Production cutover.

## M9.5 — Fresh Post-M9 Immutable Release Candidate

### Result — PASS / CLOSED

M9.5 built and verified a fresh post-M9 immutable API/Web release candidate without deploying it to Production.

### Frozen post-M9 provenance

Runtime image inputs:

- selector: `package.json`, `package-lock.json`, `tsconfig.base.json`, `apps/**`, `packages/**`;
- generated `dist/.next/node_modules` excluded;
- file count: 221;
- source SHA-256: `478e320df30215adb79965abbbe54c34db3c02ac5da41b6669bfa23c850f86a2`;
- package-lock SHA-256: `d55db9c755ccd8056d5724df2393eefc4acf74badadfec4ce92ab8b197260286`.

Schema provenance remains:

- Prisma schema SHA-256: `0b7d9ad4dc893d0f1f644150d0dfca80bdff22be0fdb81dc43f5de45adea37c0`;
- migration count: 5;
- migration-set SHA-256: `0f21a111f6fd30a06378d51900e1b0974b91d04aba636366fea5e682e54fabe5`.

The M8.4 release remains historical evidence only and is not reused as post-M9 deployment authority.

### API release candidate

- release ID: `ckace-hr-m9-rc-20261006a`;
- tag: `ckace-hr-api-release:m9-rc-20261006a`;
- Cloud Build: `e81e8278-8332-4eab-9328-1b2896b86ada`;
- build status: SUCCESS;
- digest: `sha256:8a14832c4361e4813e786899ee169a93fa4e07beafcb4866771a950d198bb88b`;
- immutable ref: `asia-southeast1-docker.pkg.dev/ckrr-leave-system-2026/cloud-run-source-deploy/ckace-hr-api-release@sha256:8a14832c4361e4813e786899ee169a93fa4e07beafcb4866771a950d198bb88b`;
- Artifact Registry tag-to-digest readback verified.

### Web release candidate

- tag: `ckace-hr-web-release:m9-rc-20261006a`;
- Cloud Build: `1160f5a5-17dd-4b00-ade9-4c09d7bda460`;
- build status: SUCCESS;
- digest: `sha256:a7bc1b9b729518a47345a610a96b7927e5f81defb00fc9ac702f46344656aeeb`;
- immutable ref: `asia-southeast1-docker.pkg.dev/ckrr-leave-system-2026/cloud-run-source-deploy/ckace-hr-web-release@sha256:a7bc1b9b729518a47345a610a96b7927e5f81defb00fc9ac702f46344656aeeb`;
- Artifact Registry tag-to-digest readback verified.

### Release artifacts

Created:

- `infra/production/m9-release-manifest.json`;
- `infra/production/verify-m9-release-manifest.mjs`.

Current landing-zone readiness was advanced from fresh release `NOT_BUILT` to `BUILT_VERIFIED`.

The corresponding fresh-release blocker was removed, and M9.5 was added to completed M9 prerequisites.

P3 `FRESH_POST_M9_RELEASE` is now `COMPLETED_NON_PRODUCTION_BUILD`.

All actual Production-mutating P1/P2/P4/P5/P6 phases remain `NOT_AUTHORIZED`.

### Verification

Release verifier:

`M9_5_RELEASE_VERIFY_PASS release=ckace-hr-m9-rc-20261006a source=478e320df30215adb79965abbbe54c34db3c02ac5da41b6669bfa23c850f86a2 api=sha256:8a14832c4361e4813e786899ee169a93fa4e07beafcb4866771a950d198bb88b web=sha256:a7bc1b9b729518a47345a610a96b7927e5f81defb00fc9ac702f46344656aeeb migrations=0f21a111f6fd30a06378d51900e1b0974b91d04aba636366fea5e682e54fabe5 production_mutation=0`

Current landing-zone verifier:

`M9_4_LANDING_ZONE_VERIFY_PASS prod_services=0 prod_sa=0 prod_secrets=0 alerts=0 dns=NXDOMAIN fresh_release=BUILT_VERIFIED production_mutation=0`

Final repository gate task `563da958-187f-41f9-af20-e2b2823ce101`:

- `npm run check` — PASS;
- lint — PASS;
- typecheck — PASS;
- tests — 54 files / 353 tests PASS;
- package builds — PASS;
- NestJS API build — PASS;
- Next.js production build — PASS.

### Safety

- Production deploy = 0.
- Production resource provisioning = 0.
- Production database write/import = 0.
- Production DNS / LINE / GAS mutation = 0.
- module authority switch = 0.
- coarse routing remains `LEGACY`.

### M9.5 decision

M9.5 is PASS / CLOSED.

The project now has a fresh immutable post-M9 release authority, but that does **not** authorize Production deployment or provisioning.

## M9.6 — Production Landing Zone Provisioning / Staging

### Status — PASS / CLOSED / PROVISIONED + STAGED / NO CUTOVER

Owner approved the bounded M9.6 landing-zone provisioning/staging phase. The approved scope is complete.

This approval did **not** include DNS/custom-domain mutation, LINE/LIFF mutation, GAS/source-of-truth changes, Production business-data import, module authority switching, or Legacy retirement. Those surfaces remain unchanged.

### P1 — Identity + Secret Containers — PASS

- dedicated runtime service account `ckace-hr-prod@ckrr-leave-system-2026.iam.gserviceaccount.com` exists;
- four Production Secret Manager containers exist;
- runtime IAM is limited to per-secret `roles/secretmanager.secretAccessor`;
- no project-wide runtime role was added.

### P2 — Database + Private Object Storage — PASS

Neon:

- dedicated project `CKACE HR PROD` / `falling-paper-66157438` created in Singapore;
- Production branch `br-flat-sky-b3swsapw`;
- database `ckace_hr_prod`, PostgreSQL 18;
- DEV/TEST resources were not reused;
- no application tables/business data were imported during M9.6;
- pre-stage snapshot `m9-6-prestage-20261007` / `snap-green-frost-b3f0kh95` exists;
- multi-step restore proof created branch `br-withered-shape-b3in6ifc` while leaving the Production branch unchanged.

R2:

- private buckets `ckace-hr-prod-private` and `ckace-hr-prod-backup-private` created;
- runtime token is Object Read & Write only for the primary bucket; backup bucket is excluded from runtime credentials;
- synthetic backup/restore proof PASS on key `m9-6-recovery-proof/synthetic-proof-20261007.txt`;
- final primary/backup SHA-256 match: `b38bd91575bbc7781e9292d14edbd66c038741d5a7d27347de07361b6e1f6c03`;
- temporary recovery tokens were revoked after proof.

Secret Manager:

- all four required Production secret containers have enabled version 1.

### P4 — Cloud Run + Firebase — PASS

Cloud Run:

- API service `ckace-hr-api-prod`, revision `ckace-hr-api-prod-m9-6-stage-20261007a`;
- Web service `ckace-hr-web-prod`, revision `ckace-hr-web-prod-m9-6-stage-20261007a`;
- both deploy from M9.5 immutable digests;
- dedicated Production service account/secrets are used;
- coarse module routing remains `LEGACY`.

Firebase Hosting:

- site `ckace-hr-prod`;
- version `8522b62a53769e5e`;
- release `1791343772413000`;
- rewrite `/api/**` -> `ckace-hr-api-prod`;
- rewrite `**` -> `ckace-hr-web-prod`.

Final front-door smoke:

- `/api/health` = 200;
- `/api/ready` = 200, database connected;
- Web root = 200;
- signed-out `/api/profile/me` = 401.

### P5 — Observability + Recovery — PASS

- four uptime checks: Health, Ready, Web and Auth Guard;
- seven Production alert policies: revision-not-ready, readiness-failure, health-failure, server-error-rate, latency-regression, auth-regression and attachment-storage-failure;
- final Production Cloud Run ERROR-log query returned 0 entries;
- Neon snapshot restore proof PASS;
- R2 independent primary/backup restore proof PASS.

Alert-policy source is retained under `infra/production/m9.6-alerts/`.

### P6 — Domain staging — PASS / HELD BY SEPARATE OWNER GATE

- `hr.ckaceaccount.com` remains NXDOMAIN;
- no DNS/custom-domain mutation occurred;
- no LINE, GAS, source-of-truth or module-authority switch occurred.

### Final repository gate

Task `56dd6aa8-cac8-4f67-a171-83a418ba69ff`:

- lint PASS;
- typecheck PASS;
- 54 test files / 353 tests PASS;
- package/API/Next.js production build PASS.

Final verifier marker:

`M9_6_PROVISIONING_STATUS_VERIFY_PASS p1=PASS p2=PASS p4=PASS p5=PASS p6=HELD_BY_GATE qa=PASS routing=LEGACY source=LEGACY cutover=0`

### Current safety state

- source of truth = `LEGACY`;
- module routing = `LEGACY`;
- Production business-data import = 0;
- LINE mutation = 0;
- GAS mutation = 0;
- DNS/custom-domain mutation = 0;
- module authority switch = 0.

### Required next action

Before the first named-module Production cutover:

1. refresh the live Legacy Production baseline;
2. run actual Production migration/reconciliation evidence for the named module using M9.3 tooling;
3. keep the bounded write-freeze/read-write authority rules;
4. obtain a separate explicit Owner approval before Production data import, module authority switch, DNS/LINE change or GAS/source-of-truth cutover.

## M9.7 — First Named-Module Production Cutover Preparation — LEAVE

### Result — PASS / CLOSED / PRE-CUTOVER ONLY

M9.7 prepared LEAVE as the first named-module Production cutover candidate without performing a Production cutover.

Final safety state remains:

- READ authority = `LEGACY`;
- WRITE authority = `LEGACY`;
- source of truth = `LEGACY`;
- module routing = `LEGACY`;
- Production business-data import = 0;
- Production module schema apply for this cutover = 0;
- module authority switch = 0;
- DNS/LINE/GAS mutation = 0;
- Legacy retirement = 0.

### Legacy execution-window baseline

The live Legacy service remains `ckrr-line-gateway-ownerui-20261006a` at 100% with immutable digest `sha256:272fc4db43213b50b90387477d7f0e864f8c2d9cd0a4354c2b1608effea87d7f`.

Basic smoke remained green:

- `/` = 200;
- `/liff` = 200;
- `/health` = 200.

An earlier 30-minute window contained transient 502s around `2026-10-07T05:00:43Z`. The final M9.7 30-minute `severity>=ERROR` re-check returned zero entries at `2026-10-07T05:51:15Z`. This quiet-window evidence must be refreshed again immediately before any write-freeze activation.

### LEAVE source contract

The bounded source set is now explicit:

1. `CK&RR_Requests / UserPolicies / CURRENT`;
2. `Data_CK&RR_Requests / LeaveRequests / CURRENT`;
3. `Data_CK&RR_Requests / LeaveRequests_2025 / 2025`;
4. `Data_CK&RR_Requests / ApprovalSteps / CURRENT`;
5. `Data_CK&RR_Requests / Attachments / CURRENT`.

Extraction remains read-only. Final-delta capture requires the same descriptor set before and after the bounded freeze window and source-qualified provenance throughout.

### Attachment coverage gap closed

M9.7 identified that the Legacy LEAVE `Attachments` source was present in the M0 source-target map but had no LEAVE migration transformer in Project B.

Added `leaveAttachmentTransformer` version `leave-attachment-v1` with these fail-closed rules:

- accepts only current `Attachments`;
- requires source-qualified FileID provenance;
- links only to the current `LeaveRequests` provenance;
- privacy class = `EMPLOYEE_PRIVATE`;
- preserves the Legacy Drive reference only;
- does not infer archive attachment ownership from colliding leave IDs;
- R2 copy/checksum/authorization reconciliation remains a separately approved execution-window concern.

LEAVE reconciliation now also requires `attachment_count`.

### Pre-cutover manifest and verifier

Added:

- `infra/production/m9.7-leave-precutover-status.json`;
- `infra/production/verify-m9.7-leave-precutover-status.mjs`.

Final verifier marker:

`M9_7_LEAVE_PRECUTOVER_VERIFY_PASS quiet30m=PASS sources=5 attachments=COVERED targeted=19 full=355 lint=PASS typecheck=PASS build=PASS authority=LEGACY cutover=0 ownerGate=REQUIRED`

### Verification

- targeted migration/cutover tests: 2 files / 19 tests PASS;
- full repository tests: 54 files / 355 tests PASS;
- lint PASS;
- typecheck PASS;
- production build PASS;
- M9.7 verifier PASS.

### Next gate

M9.7 does not authorize execution.

Before Production LEAVE schema/data writes, write-freeze activation or paired LEAVE read/write authority switch, obtain a separate explicit Owner approval for the bounded execution window. The execution window must begin with a fresh Legacy quiet-window/baseline check.

## M9.8 — LEAVE Production Execution Window

### Current result — PREFLIGHT BLOCKED / NO CUTOVER MUTATION STARTED

The Owner approved the bounded LEAVE Production execution window. M9.8 started with a fresh read-only preflight and intentionally stopped before write-freeze activation or Production import.

Verified preflight:

- fresh Legacy 30-minute `severity>=ERROR` window = 0 errors;
- deployed Legacy revision remains `ckrr-line-gateway-ownerui-20261006a`;
- Production LINE LIFF traffic still enters the Legacy gateway;
- the deployed Legacy gateway sends `/api/liff/*` to Apps Script/GAS and has no Project B LEAVE bridge;
- Project B Production routing still contains the M9.1 safety lock that rejects any `NEW` module authority;
- Production Neon `ckace_hr_prod` remains at 0 application tables;
- M9.6 pre-stage Neon snapshot remains present;
- no LEAVE write freeze, schema/data import, authority switch, DNS/LINE/GAS mutation or Legacy retirement occurred.

A Project B-only authority switch cannot satisfy the cutover contract because real Production LINE LEAVE requests would continue to reach GAS.

### Required unblock

Current Project B rules prohibit modifying Project A without separate explicit Owner authorization.

M9.8 therefore requires one additional bounded approval:

`BOUNDED_PROJECT_A_LEGACY_GATEWAY_COMPATIBILITY_CHANGE_FOR_LEAVE_ONLY`

The compatibility scope is limited to `D:\APP_Leave\line-gateway` and must:

- preserve the existing Production LIFF ID;
- preserve the existing Rich Menu objects;
- keep all non-LEAVE routes on Legacy GAS;
- not change GAS code/deployment;
- not change DNS;
- provide the verified LEAVE-only transport/identity bridge to CKACE_HR needed for the later paired authority switch.

Evidence:

- `infra/production/m9.8-leave-execution-status.json`;
- `infra/production/verify-m9.8-leave-execution-status.mjs`.

Verifier marker:

`M9_8_LEAVE_EXECUTION_PREFLIGHT_BLOCKED_PASS quiet30m=PASS dbTables=0 authority=LEGACY freeze=OFF import=0 cutover=0 blocker=LEGACY_GATEWAY_BRIDGE_APPROVAL_REQUIRED`
