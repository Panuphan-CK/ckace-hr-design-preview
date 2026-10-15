# CKACE HR — M8.6 Production Cutover Runbook

Status: RUNBOOK ONLY / NO PRODUCTION MUTATION

## Purpose

This runbook defines the exact control sequence for moving CKACE HR from the accepted legacy Production path to Project B without performing the cutover in M8.6.

The current user-facing Production path remains:

`LINE / Rich Menu -> Production LIFF 2011403971-rHQJIrOx -> ckrr-line-gateway -> GAS v38 -> legacy Sheets/Drive`

The target is:

`LINE / Web -> hr.ckaceaccount.com -> Firebase front door -> ckace-hr-web-prod / ckace-hr-api-prod -> ckace_hr_prod / private R2`

M8.6 does not authorize any Production provisioning, DNS, LINE, GAS, data or routing change.

## Verified current baseline

- Legacy Cloud Run service: `ckrr-line-gateway`.
- Current Production revision: `ckrr-line-gateway-readretry-20261006a` at 100%.
- Current image digest: `sha256:0b475189399a2f0d5d18e7fbdaf7d3522713e15332dde001fb0367ff88c380a8`.
- Immediate gateway rollback revision: `ckrr-line-gateway-projectafinal-20261005a`.
- Accepted GAS: v38; historical GAS rollback: v37.
- Existing Production LIFF: `2011403971-rHQJIrOx`.
- Existing LIFF endpoint: `https://ckrr-line-gateway-442311716273.asia-southeast1.run.app/liff`.
- Existing Rich Menu aliases: `employee-user`, `approver-menu`, `account-link`; global default is Unlinked.
- Current Project B Production services are not provisioned.
- `hr.ckaceaccount.com` is currently NXDOMAIN.
- Project B runtime still accepts `CKACE_MODULE_ROUTING=LEGACY` only.

## Critical M9 prerequisites discovered by M8.6

The codebase contains a `ModuleRoutingState` contract, but there is currently no runtime routing plane consuming it. `CKACE_MODULE_ROUTING` is a single fail-closed marker and rejects any non-`LEGACY` value.

The current route-key contract also does not cover all M7 surfaces. Benefits, Request Status, Attachments, Notifications, Onboarding and announcement-write granularity require an explicit routing decision before the first Production module authority switch.

Therefore, before M9 executes its first module cutover:

1. implement a server-only module routing plane;
2. cover every Production user/business surface;
3. implement a bounded module write-freeze control;
4. test both legacy and new authority paths;
5. preserve server-derived identity and fail-closed behavior;
6. do not enable indefinite GAS/PostgreSQL dual-write.

This is an execution prerequisite, not a reason to change architecture during M8.6.

## Phase 0 — Freeze the plan

Before any Production action:

- M8.4 immutable release verifier must PASS;
- M8.5 observability/rollback verifier must PASS;
- M8.7 production-like UAT must PASS;
- M8.8 Go/No-Go must explicitly authorize the next bounded Production gate;
- exact Owner approval must identify the resource/module/action being changed.

If any of these are missing, STOP.

## Phase 1 — Provision Project B Production landing zone

Owner approval is mandatory.

Provision:

- dedicated Production runtime service account and narrow secret access;
- dedicated `ckace_hr_prod` Neon database;
- private `ckace-hr-prod-private` R2 bucket;
- independent private `ckace-hr-prod-backup-private` backup bucket;
- Production Secret Manager values;
- `ckace-hr-api-prod` using the M8.4 API immutable digest;
- `ckace-hr-web-prod` using the M8.4 Web immutable digest;
- Firebase site `ckace-hr-prod`;
- M8.5 alert policies and verified database/object recovery controls.

All module authority remains LEGACY at the end of this phase.

Do not point LINE at Project B yet.

## Phase 2 — Establish the target domain before changing LINE

Owner approval is mandatory.

1. Attach `hr.ckaceaccount.com` to the Production front door.
2. Create the required DNS records.
3. Wait for DNS and Google-managed TLS to become ready.
4. Verify:
   - `/`;
   - `/liff`;
   - `/api/health`;
   - `/api/ready`;
   - authentication/session behavior;
   - immutable API/Web release digests;
   - Production DB/R2 isolation.
5. Keep Production LIFF endpoint on the legacy gateway.

DNS staging alone must not move existing LINE users.

## Phase 3 — M9 controlled module cutovers

Keep the existing Production LIFF ID and Rich Menus stable while modules move one by one.

For every named write-capable module:

1. Owner approves that exact module cutover.
2. Verify last-known-good immutable artifacts, DB snapshot and R2 backup evidence.
3. Enable bounded write freeze for that module.
4. Extract the final legacy delta read-only.
5. Import only the bounded delta to Project B.
6. Run module reconciliation and known-exception gates.
7. Verify new runtime health/readiness/auth/idempotency.
8. Switch the module read + write authority together within the freeze window.
9. Run a controlled read and only the specifically approved Production write smoke.
10. Release write freeze on the new authority.
11. Monitor M8.5 signals and reconciliation.
12. Owner accepts the module or invokes the rollback rule.

### Why read and write switch together

A read-first switch would allow later legacy writes to make Project B stale.

A write-first switch would create new Project B writes that legacy reads cannot see.

Therefore a write-capable module must switch read/write authority as one bounded source-of-truth transition after final delta reconciliation.

## Rollback boundary

### Before the first new-authority business write

Rollback can be routing/transport only:

- keep or restore module authority to LEGACY;
- if the Production LIFF endpoint was changed, restore it to the accepted legacy endpoint;
- verify legacy gateway health and critical reads.

### After any new-authority business write

Do not simply point writes back to GAS.

Instead:

1. stop new Project B writes for the affected module;
2. enumerate Project B writes after the authority-switch timestamp;
3. reconcile DB and private-object changes;
4. choose forward-fix or controlled data rollback;
5. require explicit Owner approval;
6. restore exactly one source of truth;
7. run reconciliation before writes resume.

Ambiguous commit state must never be blindly retried.

## Phase 4 — Direct Project B LIFF entry

Do this only after the user-visible module set required for the direct Project B UI is NEW and stable.

Preconditions:

- target domain/TLS/health/readiness/auth PASS;
- M8.7 UAT PASS;
- required module authority cutovers accepted;
- Production LIFF ID remains `2011403971-rHQJIrOx`;
- Rich Menu aliases still resolve to the accepted three menu objects;
- every menu URI still targets the same Production LIFF ID.

The intended LINE mutation is deliberately minimal:

- change the endpoint of the existing Production LIFF ID to `https://hr.ckaceaccount.com/liff`;
- preserve the LIFF ID;
- preserve `openid` / `profile` scopes;
- preserve Add friend behavior;
- do not recreate Rich Menus when their URI actions already target the same LIFF ID.

Immediately verify real LINE launch, Home, navigation, auth/session, self reads and the Employee/Approver/Unlinked Rich Menu launch paths.

If this gate fails, restore the LIFF endpoint to:

`https://ckrr-line-gateway-442311716273.asia-southeast1.run.app/liff`

The Rich Menu objects should not require rollback when they still point to the unchanged LIFF ID.

## Phase 5 — Stabilization and GAS retirement boundary

After direct Project B entry:

- keep GAS v38 and the legacy gateway available through stabilization;
- keep v37 as historical GAS rollback evidence;
- do not retire legacy Sheets/Drive/GAS during M8 or M9;
- GAS retirement remains M11 and needs separate Owner approval.

## Abort conditions

Abort or rollback when any of these occur:

- release digest mismatch;
- target revision not Ready;
- health/readiness failure;
- DB reconciliation failure;
- missing/invalid backup evidence;
- R2 checksum/restore failure;
- auth/session regression;
- unexpected signed-out access;
- ambiguous business-write commit state;
- source-of-truth split or routing mismatch;
- any unapproved Production mutation.

## Owner gates

Explicit Owner approval is required for:

- Production IAM/secrets/service creation;
- Production Neon creation/import/write;
- Production R2/backup creation or credential changes;
- Production Cloud Run/Firebase deployment;
- DNS/custom-domain changes;
- LINE LIFF/Login/Messaging/Rich Menu changes;
- GAS Production/source-of-truth changes;
- any module authority switch;
- any Production rollback mutation.

## M8.6 acceptance

M8.6 is complete when the current-to-target map, cutover phases, module freeze/switch rule, post-write rollback boundary, LINE/DNS sequencing, GAS retirement boundary and Owner gates are machine-verifiable and no Production mutation has occurred.
