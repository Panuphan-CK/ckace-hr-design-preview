# CKACE HR — PROJECT PLAN

Last Updated: 2026-10-26 Asia/Bangkok

## One active TASK

PROD-READINESS-09 — Reviewer rerun corrected disposition + full-system routing and export checks. WAITING FOR REVIEWER, P1. Re-run the disposable PostgreSQL rehearsal against the pushed implementation and verify the corrected LEV-0109 disposition, then test marker/export against `ckace_hr_dev` only. Production remains NO-GO.

## Verified baseline

- Application baseline: source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7, released as TESTm74.
- TESTm74 release, health, traffic, Hosting, Leave workflow, documented role/NAV, and responsive evidence are recorded in this handoff. The evidence does not prove full transaction coverage for every module.
- This task used only local source/tests/docs in D:\CKACE_HR\.worktrees\main-integration, branch `codex/main-integration`. Root checkout, live GAS, Project A, Production, and cloud commands were not used.
- Owner snapshot files are outside Git at D:\CKACE_HR_snapshot; `MANIFEST.md` reports 5,269 total source rows and excludes chat/LINE logs and settings.
- Reviewer reported a disposable PostgreSQL 16 loopback rehearsal from revision `a793020`: 5,269 rows accounted for (5,234 imported / 35 skipped / 0 rejected), 0 unaccounted/ambiguous writes, no early stop; replay skipped 5,234 identical rows and added 0; source and target Pending counts were 1; backup/restore/reset took 0.30/0.59/0.83 seconds. Policy values were read-only checked against TESTm74, not guessed.
- Reviewer later reported revision `fb0e444`: imported 5,234 / skipped 35 / rejected 0; all configured dispositions matched; unapproved outcome count = 0; runner exit 2 only because changed next approver count = 1 for the already Owner-approved LEV-0109 exception. Backup = 0.30s and full-dump reset = 0.83s. Reviewer rerun after this code fix is pending.
- PROD-READINESS-08 implementation verification passed locally: lint, workspace typecheck, 121 Vitest files / 857 tests, package builds, API build, and static exporter delegate/timestamp-field checks. No DB connection was made; the reviewer rerun remains pending on disposable loopback `ckace_hr_dev` only.

## Current Owner decision

- Move all modules needed for the employee platform together from GAS to CKACE HR; employees use one system after cutover.
- Scope includes identity and organization dependencies, Leave, Attendance, Time Corrections, OT, Medical, Attachments, Notifications, Announcements, and Reports.
- The former Option 2 plan (Leave NEW while other modules stayed LEGACY) is superseded.
- New Leave quota/balance is calculated from CKACE HR's tenure policy. GAS quota values are reconciliation evidence, not the target's authoritative balance.
- This is a plan only. Production still requires separate Owner approval for each data, resource, routing, deployment, traffic, LINE/LIFF, and rollback action.
- The latest Owner decision replaces the previous full-system dispatcher/reverse-replay proposal: all route keys are LEGACY or all are NEW; mixed state fails startup; no per-module dispatcher and no reverse replay to GAS. Preparation/import uses `CKACE_SYSTEM_WRITE_MODE=READ_ONLY`; opening uses `ACTIVE` together with the employee-link change. No Production parallel run.
- Point of no return: the first official employee-link change. Before it, revert to GAS and unfreeze after CKACE accepted zero employee writes. After it, prefer fix-forward; a forced GAS fallback freezes CKACE, exports changes from the cutover marker, requires HR manual re-entry and 100% reconciliation before GAS writes resume. Hypercare covers 3 business days.

## Current importer and rehearsal status

- Implemented an ExcelJS-backed `ReadOnlyLegacySource`, source hashing, row validation, deterministic dispatch, in-memory target store, and provenance-keyed Prisma target store in `packages/migration/src/`.
- Added current identity/company/agency/department/calendar mappings, current-policy Leave entitlements, Attendance raw punches, Leave/OT/Medical/Time Correction records, and historical approvals. Legacy `WorkHours`/`OT_Hours` are ignored.
- Added system-wide API write freeze via `CKACE_SYSTEM_WRITE_MODE=READ_ONLY`; absent/`ACTIVE` preserves current TEST behavior. Tagged and unclassified HTTP mutations fail closed; notification and cleanup jobs stop/refuse writes. Migration writes require the explicit migration-job flag and a loopback `ckace_hr_dev` URL.
- Production routing validation now accepts all 26 keys = LEGACY or all 26 = NEW, and fails mixed state. The obsolete single-value runtime field is removed; health/Admin report route summary from the actual state.
- The disposition evaluator accepts exactly one changed-next-approver row for LEV-0109 and blocks any other ID, a duplicate, a changed count, or other hard-gate failure.
- Added external cutover marker (`cutoverAt`, UUID `runId`) and a post-cutover snapshot exporter. Export requires system READ_ONLY, attests DB name inside a PostgreSQL READ ONLY / REPEATABLE READ transaction, and writes outside every Git checkout. Production use also requires `CKACE_PROD_EXPORT_CONFIRM=YES` plus separate Owner approval. The tool has not connected to any DB in this task.
- Owner chose pending approval handoff B: retain decided history, replace source Pending assignment with current-policy Pending steps, report changed approvers for HR review, and keep unresolved/self-only routes Pending with an exception. Completed requests do not receive new steps.
- `docs/migration/RUN_REHEARSAL.md` explains the reviewer-run database import, pending count reconciliation, and timed backup/restore/reset steps.
- The earlier snapshot evidence at `docs/migration/evidence/sanitized-xlsx-in-memory-20261026.json` records the pre-06 behavior (two attendance LogID collisions rejected). PROD-READINESS-06 changes this owner-approved distinct-employee collision to two imports with a named exception and composite provenance; same-employee duplicates remain rejected. The reviewer DB evidence is recorded numerically in `docs/migration/evidence/prod-readiness-06-rehearsal-20261026.json`.
- LEV-0109 remains an HR exception because it is Pending in GAS after three decisions while the current policy has no remaining steps. The report now says “อนุมัติครบตาม policy ใหม่แล้ว รอ HR ยืนยันปิดคำขอ”; notify its GAS approver to close it before the cutover write freeze.
- The reviewer DB run on a793020 demonstrated row accounting, idempotency, Pending-count parity, and backup/restore/reset. Codex did not connect to the database in this task.
- Actual active TESTm74 ApprovalPolicy rows were read-only confirmed: four active global policies, each `ADMIN/SAME_AGENCY` then `SUPERADMIN/GLOBAL`; every employee uses `STANDARD`. `REHEARSAL_POLICY_BASELINE.md` contains the names and details. The sanitized seeder JSON remains outside Git.
- `CKACE_SNAPSHOT_DIR` now selects the external workbook folder; default remains `D:\CKACE_HR_snapshot`.
- READ_ONLY now denies every controller `POST`/`PUT`/`PATCH`/`DELETE`, including routes marked READ; only desktop login, LINE login, and logout are exempt. The endpoint matrix covers the current 19 API controllers.
- The local attachment copier supports exact `FileID`/filename matching, rejects missing or ambiguous files, computes SHA-256, and defaults to dry-run. No R2 client, credentials, or upload operation was used; 34 attachment rows without bytes remain deferred.
- The snapshot redacts attachment URLs and contains no file bytes; those records remain explicit exceptions until safe bytes are supplied. Notification/LINE history, chat, announcements, and report exports are not present as source rows in the supplied manifest; do not invent them.
- The prior TEST workbook/run provenance is still unverified; the new importer is the reproducible path for this rehearsal.
- PROD-READINESS-07 local verification passed: lint, workspace typecheck, 120 Vitest files / 847 tests, package builds, API build, and migration script syntax checks. The reported DB rehearsal is reviewer-provided; no local DB run occurred.

## Full-system data dependencies and implementation order

1. Get full workbook/tab manifest and rule dictionary; preserve stable pseudonymous keys, row counts, export period/timezone, and hashes.
2. Map Company/Agency/Department, Employee, manager, roles/scopes, policies, approvers, LeaveType, AttendancePolicy/Holiday/WeeklyWorkRule, OT allowance/professional roles, and BenefitPolicy.
3. Import employee identity and organization crosswalk first; resolve manager and approval relationships after stable identities exist.
4. Import historical request facts and workflow state for Leave, Time Corrections, OT, and Medical; preserve IDs/status/history. Recompute Leave entitlement from CKACE HR tenure rules; do not use GAS quota as target truth.
5. Copy approved in-scope file bytes separately from the spreadsheet into private DEV/TEST R2, verifying SHA-256/size/owner/privacy/link before switching metadata.
6. Import notification state without sending; preserve pending delivery and suppress replay of already-sent messages. Rebuild reports from canonical modules.
7. Maintain all-or-nothing route state (all LEGACY or all NEW), fail startup on a mixed state, and use the system READ_ONLY/ACTIVE switch with official employee entry links; no module-by-module dispatcher is planned.
8. Rehearse import, reconciliation, restore, manual post-cutover export/re-entry, monitoring, employee communications, and LIFF transition only in isolated DEV/TEST.

## Numeric acceptance targets

All targets below are proposed rehearsal gates, not approved Production SLOs. Full-system freeze <=120 minutes, restore RTO <=60 minutes, rollback RTO <=60 minutes, and RPO=0 after final freeze must be ratified by the Owner before any Production use.

- XLSX: 2 unchanged parses have identical workbook/per-tab SHA-256; 100% declared tabs and rows accounted for; 0 unknown tabs, duplicate IDs, formula-only required values, unmasked identifiers/secrets, or unsafe live links.
- Identity/org/policies: 100% active employees and required company/team/manager/role/approver references mapped; 0 orphan/cyclic manager references and 0 unauthorized grants.
- Leave: 100% historical request counts/status/date/duration match; all target entitlements derive from tenure rules; 100% per-person/type deltas are explained and approved; 0 silent GAS quota imports.
- Attendance/Time Corrections: 100% logs/requests and workflow state accounted for; exact timestamps/IDs; 100% derived calculation deltas explained under target timezone/policy; 0 unresolved duplicates/orphans.
- OT: 100% requests/segments/approvals/status/minutes and money totals reconcile; 0 missing or duplicated pending work.
- Medical: 100% claims/status/amount/owner/approval totals reconcile to source precision; 0 unapproved health-data exceptions.
- Attachments: 100% in-scope files have exact byte size and SHA-256, privacy, owner, and request links; 0 missing, duplicate, public, or orphan files.
- Notifications: 100% pending/outstanding states accounted for; 0 duplicate sends; sent history is either imported 100% within the approved period or explicitly excluded.
- Announcements: 100% records/scope/attachments map; 0 incorrect recipient scope.
- Reports: 12 report scenarios (4 data domains x 3 periods) regenerate; 100% aggregates match under approved rule mapping or have signed exception; 0 unexplained deltas.
- Provenance/idempotency: 100% imported records have workbook/tab/period/stable-ID provenance; a second run creates 0 duplicate rows.
- Restore/fallback: backup/restore proof and 100% row/object checksum parity; before the point of no return, CKACE accepted writes = 0 before returning to GAS. After it, manual fallback export must account for 100% post-marker items, HR re-entry must reconcile 100%, duplicate/missing items = 0, and fallback target remains <=60 minutes. No reverse replay.
- Monitoring/cutover: 60-second probes; 6/6 simulated critical alerts reach on-call within 5 minutes; 3 cutover rehearsals stay within proposed 120-minute freeze; 100% of module smoke routes pass; 100% of active test accounts receive in-app change notice, LINE delivery >=99%, and 100% of failures appear in the fallback roster.

See HANDOFF.md for sheet-to-model inventory, code evidence, switch/rollback design, and phase-by-phase Owner inputs.

## Reviewer/Owner action priority

1. Reviewer reruns the corrected importer/disposition gate on disposable PostgreSQL `ckace_hr_dev`; verify runner exit 0 and retain numeric-only evidence.
2. Reviewer exercises marker/export against `ckace_hr_dev`, checks READ ONLY transaction attestation and external output path, and reviews per-module counts. Do not connect to Production.
3. Resolve attachment byte retrieval/re-entry and production infrastructure gaps using `PRODUCTION_INFRA_PLAN.md` and `PRODUCTION_CHECKLIST.md`; each Production action requires separate Owner approval.
4. Production resources, file transfer, employee notice, routing/opening, and manual fallback remain unverified and require separate named Owner approval.

Production remains NO-GO.
