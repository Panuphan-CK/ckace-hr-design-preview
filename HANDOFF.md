# CKACE HR — HANDOFF

Last Updated: 2026-10-26 Asia/Bangkok

## Current state

- Active executor: Codex Local.
- Application repository: Panuphan-CK/ckace-hr, remote source.
- Current worktree: D:\CKACE_HR\.worktrees\main-integration, branch codex/main-integration. The similarly written path D:\CKACE_HR.worktrees\main-integration does not exist. The primary checkout D:\CKACE_HR was not accessed for this task.
- Verified application source: source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7; deployed TEST baseline is TESTm74.
- Continuation branch last published before this task at 43b73bfd14a72b00b7a6dba5a2efb437ea014101.
- Production is NO-GO. No Production access, commands, deployment, resource, database, credential, or traffic action was performed.
- No live Google Sheets/Drive data or Project A repository/source was accessed. This assessment uses CKACE_HR Local source and Owner direction only.

## TESTm74 evidence carried forward

- Cloud Build 3830ed94-07c4-49b5-a7e3-adaa073abd48 released TESTm74 from the unified source commit. API/Web reached 100% traffic on m74; public health reported stage=test and runtime=NON_PRODUCTION; Firebase Hosting release and /desktop response were verified.
- Authenticated Leave request LEV-0024 passed Employee submission, Manager first approval, SuperAdmin second approval, and Employee final status/notification verification.
- Documented Employee, Manager, and SuperAdmin NAV/direct-URL checks and responsive checks at 390px passed for the tested destinations. This does not claim full business transaction testing of every non-Leave module.
- Local checks on the unified code commit passed lint, typecheck, Vitest 109 files/796 tests, package/API builds, Web production build with webpack (31/31 routes), and Prisma validation with a dummy Local URL.

## Owner decision PROD-READINESS-02

Owner selected Option 2 on 2026-10-26: bounded Leave cutover only. LEAVE_READ and LEAVE_WRITE are the only routes intended to use NEW; every other route, including IDENTITY, remains LEGACY. The business goal is to migrate Leave data from APP_LEAVE_GAS so employees and approvers can continue current work in CKACE HR.

This is a planning decision only. It is not approval to read live GAS data, create Production resources, change credentials/Secret Manager/IAM, deploy, change traffic, DNS/Firebase, LINE/LIFF, mutate Production data, or perform cutover.

Required route shape for a future separately approved Production release:
- CKACE_PRODUCTION_CUTOVER_MODULE=LEAVE.
- CKACE_MODULE_ROUTING_STATE sets LEAVE_READ=NEW and LEAVE_WRITE=NEW; the other 24 route keys remain LEGACY.
- CKACE_MODULE_ROUTING remains LEGACY because runtime-config currently only accepts that global value. The per-module route state is configured separately by module-routing-config.

## Local-only gap inventory

| Area | Status | Evidence from CKACE_HR source | Gap / consequence |
| --- | --- | --- | --- |
| a. Read-only GAS source and route dispatch | มี contracts/config; ไม่มี concrete Sheets/Drive reader or target store. Actual per-module dispatch is not proven end to end. | packages/migration/src/migration-contracts.ts defines ReadOnlyLegacySource.readRows; packages/migration/src/source-snapshot.ts calls it and calculates canonical SHA-256 hashes. Implementations found only in tests. MigrationTargetStore is also only an interface in runtime code; test stores are in identity-profile.test.ts and engine.test.ts. In the API, ModuleRoutingGuard attaches route context; static search found authority consumed in legacy-leave-liff.service.ts, while standard LeaveController calls PrismaLeaveRepository without authority dispatch. | No live extraction, persistent target writer, or end-to-end LEGACY/NEW source switch is evidenced. The route-state contract alone does not prove the bounded cutover works. Require route integration evidence before any Production plan can pass. |
| b. Employee identity and organization | มี identity transformer; ไม่มี org/approval-policy transformer | packages/migration/src/identity-profile.ts maps Users to employee/account/role/LINE/profile metadata and stores legacyAgencyId/legacyDepartmentId. packages/database/prisma/schema.prisma defines Company, Agency, Department, Employee, UserAccount, LineAccount, UserRole and Employee.managerEmployeeId relations. | Leave requests and entitlements require target Employee/LeaveType references; approver steps require Employee references. Migrate minimal identity/reference rows for Leave FKs while leaving IDENTITY authority LEGACY. Organization/role/scope/policy mappings and stable ID crosswalks must exist first. Password-hash compatibility is supported in code for legacy GAS hashes but must be verified against the approved sanitized fixture; do not move credentials into test snapshots. |
| c. LEGACY_DRIVE attachments to R2 | มี reference transform and R2 upload/inspect primitives; ไม่มี bulk migration copier | packages/migration/src/leave.ts emits a legacyDriveUrl and a reference-only migration marker. packages/storage/src/private-attachment-storage.service.ts and r2-aws-request-signer.ts validate R2 uploads and inspect downloaded R2 bytes for size, MIME type, and SHA-256. AttachmentController labels these APIs ATTACHMENTS_READ/WRITE; both routes remain LEGACY in the selected boundary while the service uses Prisma/R2. | A privileged migration job must read each approved Drive file, stream bytes to a private R2 key, hash source and destination bytes, verify metadata/owner/request/privacy, then change provider metadata only after all checks pass. Prove how Leave files remain available without silently expanding the selected route boundary. Do not trust ETag as SHA-256. |
| d. Current-year entitlement/balance | มี entitlement transform and target usage formula; ไม่แน่ใจ about live GAS semantics | packages/migration/src/leave.ts maps UserPolicies.LeaveQuota to leave_entitlement quota but does not set validity dates or model an opening balance. packages/database/src/leave-repository.ts calculates remaining as quota minus approved usage and pending/revision reservations. packages/business-rules/src/leave-entitlement.ts and migration 20261027_entitlements_calendar_year state calendar-year/no-carry-over target rules. | The current code compares entitlement count and total quota, not each employee/type balance. Live GAS policy, manual adjustments, carry-over, and whether LeaveQuota means granted quota or remaining balance are unknown. Reconcile each person/type before accepting; do not infer a new balance from incomplete history. |
| e. Requests pending approval | มี request/status and single-approver step transformers; full continuity is unverified | packages/migration/src/leave.ts maps LeaveRequests and LeaveRequests_2025; its ApprovalSteps transformer maps one approverLegacyId, order, status, dates and comments. It does not map ApprovalInstance, coApproverEmployeeIds, or decidedByEmployeeId. archiveApprovalHistoryDisposition marks unavailable archived approval history as an exception. | At freeze, every open request must carry status, exact current step, full assigned/co-approver set, pending/decided steps, comments, actor/decider identities and entitlement reservation. Reject cutover if any open request/approver is missing. Avoid duplicate notifications when imported work resumes. |
| f. LINE LIFF/notifications after cutover | มี CKACE HR LIFF/API and LINE sender; ไม่แน่ใจ about Project A live target/config | apps/web/src/app/liff/page.tsx authenticates via CKACE HR same-origin API; apps/web/src/app/liff/bridge.ts sends Leave reads/writes to /api/leave routes. Its source comment says the screens are Project A's while the host/API provides Project B rules. apps/api/src/notifications/line-sender.ts sends through LINE Messaging API using runtime token configuration. | CKACE_HR Local source cannot establish the live Project A GAS web-app endpoint, LIFF ID/endpoint configuration, GAS triggers/webhooks, or named owners. Later, the Project A Apps Script admin must disable old Leave writes/triggers and duplicate sends; the LINE Developers/LIFF owner must verify and point the entry route to the approved CKACE HR LIFF endpoint; the CKACE HR runtime owner must configure the matching LIFF/channel and notification settings through secure config. Identify those people and URLs before cutover. No Project A file/config was touched. |
| g. Write freeze and downtime | มี CKACE API module freeze; ไม่มี GAS freeze procedure or measured cutover duration | apps/api/src/routing/module-routing-config.ts reads CKACE_MODULE_WRITE_FREEZE; module-write-freeze.ts rejects writes through CKACE HR API. | This does not freeze Google Apps Script, Sheets edits, LINE entry points, or Project A triggers. A Project A operator must freeze every Leave submission/edit/cancel/approval path and related triggers, then confirm a stable final snapshot. Proposed interruption is Leave writes only for at most 60 minutes; reads should remain on LEGACY until NEW passes smoke, but this availability is unproven until the route rehearsal. If rehearsal cannot keep the write freeze and read-path target, stop and obtain a revised Owner window. The 60-minute cap is unmeasured and requires Owner approval. |

## Dependency and migration order

1. Confirm the source tab/column manifest, stable legacy IDs, leave-year scope and explicit exceptions using an approved sanitized snapshot. Source transformers currently expect Users, UserPolicies, LeaveRequests, LeaveRequests_2025, ApprovalSteps and Attachments; the real live GAS schema remains unverified.
2. Create/map reference catalogs needed by the target: Company, Agency, Department, roles/scopes, LeaveType, active approval policy and policy steps, plus required manager/approver relationships.
3. Create Employee identities from Users using stable source-qualified provenance. Create employees first, then resolve managerEmployeeId in a second pass to handle cycles/order. Add UserAccount, role/scope and LineAccount mappings only after owner confirms which are required and safe. Validate legacy password hash compatibility without exporting credentials.
4. Import current-year LeaveEntitlement records after identity and LeaveType keys exist. Preserve the exact source-authoritative entitlement policy; derive target used/pending/remaining only after all in-scope requests and adjustments are reconciled.
5. Import Leave request records and their ApprovalInstance/ApprovalStep state. Preserve exact status/current step/assigned approvers/comments and never auto-resubmit.
6. Copy and verify attachment bytes to private DEV/TEST R2, then persist the target attachment links. Do not mark an object R2 until its SHA-256, size, ownership, privacy, and request link are verified.
7. Capture the final delta while the legacy source remains frozen, import/reconcile it idempotently, prove that the configured route state is actually consumed by every Leave read/write path, verify attachment/notification dependencies and unaffected legacy modules, then release only the Leave path under a separately approved cutover.

## PROD-READINESS-03 — Proposed acceptance plan

These numeric values are proposed DEV/TEST rehearsal targets, not confirmed Production SLOs. Confirm the proposed freeze <=60 minutes, restore RTO <=60 minutes, and RPO=0 committed Leave writes after the final freeze snapshot before using them for a Production gate.

### 1. Rehearse from a sanitized DEV/TEST snapshot

- Owner supplies a synthetic or anonymized export plus workbook/tab/column dictionary. Replace direct identifiers with stable pseudonymous keys so relationships remain testable.
- 100% of required manifest tabs and rows are accounted for; 0 unmasked names, employee IDs, emails, phones, LINE IDs, credentials, live Drive URLs, or private file content in the test fixture.
- Two reads of an unchanged source produce identical SHA-256 hashes per tab and snapshot-set hash.
- Run at least 2 DEV/TEST rehearsals: baseline import and idempotent replay. The replay creates 0 duplicate target rows.
- Evidence: sanitized fixture fingerprint, tab/row manifest, importer version/run IDs, source and target snapshots. No live GAS connection is used in this plan.

### 2. Reconcile source and target

- Match 100% of in-scope rows by source tab/entity and stable provenance; match 100% of employee identity sets and account states.
- Match 100% of Leave request IDs, request statuses, leave types, dates/durations and approval-step IDs/status/order/approver sets.
- Match 100% of each employee/leave-type current-year granted quota and remaining balance; target balance difference must be <=0.01 day per employee/type.
- Match 100% of open requests and their current approval step; 0 lost, duplicated, or orphaned pending requests.
- 0 unexplained differences and 0 unapproved exceptions. A named exception is acceptable only with source/target IDs, count, reason, impact, disposition, and Owner sign-off. The existing aggregate reconcileLeaveModule helper alone is insufficient for this gate.

### 3. Perform and time a real DEV/TEST database backup/restore

- Complete 2 restore rehearsals from a backup of the fully imported DEV/TEST candidate into an isolated recovery database.
- Restore 100% of in-scope Leave, identity, approval and migration-provenance row counts/hashes; database health, readiness, auth, and Leave reads pass 100%.
- Proposed RPO=0 committed Leave writes after the final freeze snapshot; proposed RTO<=60 minutes from restore start to validated service readiness.
- Record backup/restore IDs, timestamps, duration, row/hash comparisons, and operator. Current M8 helper is DEV-guarded and is not evidence of a completed production-provider restore.

### 4. Rehearse rollback to LEGACY

- Complete 2 DEV/TEST rollback rehearsals. Each includes at least 1 request and 1 approval written after switching Leave to NEW.
- Freeze NEW writes, replay/reconcile the post-switch delta back into the legacy test fixture through an explicit idempotent adapter, and compare 100% of request state, approvals, entitlement impact and attachment links.
- 0 missing or duplicate writes; 100% delta parity; proposed rollback completion <=60 minutes.
- Current source only builds a plan-only reset of imported target records; it has no proven reverse writer to GAS. If reverse replay is unavailable, rollback after the first NEW write is NOT PASS. A route flip alone is unsafe because it can hide NEW writes.

### 5. Establish minimum monitoring and alerting

- Health/readiness probes every 60 seconds; alert after 2 consecutive failed probes (<=2 minutes). Database unavailable alerts within 1 minute.
- Alert when API 5xx rate is >5% for 5 minutes with at least 20 requests, or P95 latency is >2 seconds for 5 minutes.
- Alert when Leave notification outbox has any item failing for >5 minutes, or when module routing differs from the approved pair.
- Simulate 4 cases (readiness failure, database failure, 5xx threshold, notification backlog); 4/4 alerts arrive at the named on-call destination within 5 minutes and are acknowledged. These are proposed initial thresholds, not existing configured alerts.

### 6. Cutover-day checklist

- Separate named Owner approval is recorded for Production data access, resource use, migration, route change, traffic/deploy if needed, and fallback execution. This planning decision is not that approval.
- Verify final backup/restore and rollback evidence; zero open blockers and zero unapproved exceptions.
- Project A operator freezes every Leave create/edit/cancel/approval path and relevant automatic trigger; capture final snapshot; two consecutive post-freeze snapshot hashes are identical.
- Proposed write freeze stays <=60 minutes. If the ceiling is exceeded, any hash changes unexpectedly, or any reconciliation/runtime check fails, abort and keep/fall back to LEGACY while still frozen.
- Apply exact route state: LEAVE_READ=NEW, LEAVE_WRITE=NEW, the other 24 route keys=LEGACY, and CKACE_PRODUCTION_CUTOVER_MODULE=LEAVE. Keep global CKACE_MODULE_ROUTING=LEGACY. Verify direct service integration proves every Leave API reaches the intended source while ATTACHMENTS and NOTIFICATIONS dependencies remain correct without changing other route authority.
- Pass 10/10 smoke bundles: (1) health/readiness, (2) Employee identity, (3) current balance/history, (4) Leave submit, (5) Employee history refresh, (6) Manager queue/assignee, (7) Manager approval, (8) SuperAdmin approval, (9) exactly-once notification and authorized/denied attachment access, (10) unaffected module route/data-source checks. Any Production write smoke requires a separately approved test identity and synthetic marker; otherwise keep write checks in DEV/TEST.
- Final row/status/balance/attachment reconciliation is 100% or has only preapproved named exceptions; release the write freeze and observe the agreed monitoring window. Record exact timestamps and approvers.

## Owner resources required by phase

| Acceptance step | Owner-provided access/resources | Approval boundary |
| --- | --- | --- |
| 1. Sanitized DEV/TEST snapshot | Approved sanitized export, source tab/column dictionary, history period, stable pseudonymization method, and allowed storage location. | No live Sheets/Drive read in this task; snapshot must contain 0 unmasked direct identifiers/secrets. |
| 2. Reconciliation and identity/org mapping | Stable employee key; Company/Agency/Department/manager/approver/role-scope crosswalk; source-of-truth for quota, carry-over, manual adjustments, request statuses, and exception sign-off owner. | No passwords, password hashes, LINE IDs, secrets, or keys in chat/test fixture. |
| 3. DEV/TEST backup/restore | Isolated disposable DEV/TEST database, backup/restore capability, database operator, and private TEST R2 read/write access for attachment verification. | TEST resources only; no Production credentials or database. |
| 4. DEV/TEST rollback | Isolated LEGACY test fixture plus a named test operator who can replay the frozen delta idempotently; test-only permission to exercise the rollback adapter. | Do not read or write live Project A. Any later real GAS access or change needs separate Owner authorization. |
| 5. Monitoring/alert rehearsal | Test monitoring sink, named on-call recipient, approved alert thresholds, and a safe test notification channel. | Do not use Production LINE credentials or send real employee notifications in rehearsal. |
| 6. Future cutover | Read-only Sheets/Drive access for final extraction; named Project A GAS admin to freeze/restore all Leave writers/triggers; named LINE Developers/LIFF owner; CKACE HR operations owner; dedicated database ckace_hr_prod, private bucket ckace-hr-prod-private, backup/restore, monitoring, and least-privilege identities. | Every Production resource, access, data read/write, route, deploy, LINE, and rollback action requires separate explicit Owner approval. Nothing was provisioned or accessed here. |

## Current unresolved risks

- Real GAS tab names/columns and policy semantics are not validated against a sanitized export.
- No runtime Sheets/Drive reader or Prisma-backed MigrationTargetStore exists in the examined migration package.
- No organization/approval-policy transformer or crosswalk, bulk Drive-to-R2 copier, or proven rollback writer exists.
- The live Project A LIFF/GAS/LINE destination and responsible configuration owner are unknown from CKACE_HR Local source. The Leave-only routing boundary may also conflict with separately keyed ATTACHMENTS/NOTIFICATIONS routes; prove the path without expanding the route boundary.
- Proposed freeze/RTO/RPO/monitor thresholds require Owner ratification before a Production readiness decision.
- Production remains NO-GO; no Production action was taken.

## Next active task

PROD-READINESS-04 — DEV/TEST Leave migration rehearsal from approved sanitized source. Wait for the required sanitized snapshot/schema and the Owner's confirmation of proposed operational limits. Implement and run the rehearsal in DEV/TEST only.

## Safety rules

Preserve uncertain Local work. Do not reset, clean, stash, discard, rebase, or force-push. Do not inspect the primary D:\CKACE_HR checkout for this task. Do not query live GAS or Project A sources. Do not touch Production, Secret Manager, IAM, gateways, project settings, protected design, or LINE configuration without the required separate approval.