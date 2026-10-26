# CKACE HR — PROJECT PLAN

Last Updated: 2026-10-26 Asia/Bangkok

## One active TASK

PROD-READINESS-05R — Reviewer-run disposable DEV database rehearsal. READY FOR REVIEW RUN, P1. Local importer/read-only implementation and sanitized XLSX in-memory pass are prepared; no local DEV DB was configured. Production remains NO-GO.

## Verified baseline

- Application baseline: source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7, released as TESTm74.
- TESTm74 release, health, traffic, Hosting, Leave workflow, documented role/NAV, and responsive evidence are recorded in this handoff. The evidence does not prove full transaction coverage for every module.
- This task used only CKACE_HR files/history in D:\CKACE_HR\.worktrees\main-integration. Root checkout, live GAS, Project A, Production, and cloud commands were not used.
- Owner snapshot files are outside Git at D:\CKACE_HR_snapshot; `MANIFEST.md` reports 5,269 total source rows and excludes chat/LINE logs and settings.

## Current Owner decision

- Move all modules needed for the employee platform together from GAS to CKACE HR; employees use one system after cutover.
- Scope includes identity and organization dependencies, Leave, Attendance, Time Corrections, OT, Medical, Attachments, Notifications, Announcements, and Reports.
- The former Option 2 plan (Leave NEW while other modules stayed LEGACY) is superseded.
- New Leave quota/balance is calculated from CKACE HR's tenure policy. GAS quota values are reconciliation evidence, not the target's authoritative balance.
- This is a plan only. Production still requires separate Owner approval for each data, resource, routing, deployment, traffic, LINE/LIFF, and rollback action.

## Current importer and rehearsal status

- Implemented an ExcelJS-backed `ReadOnlyLegacySource`, source hashing, row validation, deterministic dispatch, in-memory target store, and provenance-keyed Prisma target store in `packages/migration/src/`.
- Added current identity/company/agency/department/calendar mappings, current-policy Leave entitlements, Attendance raw punches, Leave/OT/Medical/Time Correction records, and historical approvals. Legacy `WorkHours`/`OT_Hours` are ignored.
- Added system-wide API write freeze via `CKACE_SYSTEM_WRITE_MODE=READ_ONLY`; absent/`ACTIVE` preserves current TEST behavior. Tagged and unclassified HTTP mutations fail closed; notification and cleanup jobs stop/refuse writes. Migration writes require the explicit migration-job flag and a loopback `ckace_hr_dev` URL.
- Owner chose pending approval handoff B: retain decided history, replace source Pending assignment with current-policy Pending steps, report changed approvers for HR review, and keep unresolved/self-only routes Pending with an exception. Completed requests do not receive new steps.
- `docs/migration/RUN_REHEARSAL.md` explains the reviewer-run database import, pending count reconciliation, and timed backup/restore/reset steps.
- Sanitized XLSX in-memory run: 5,269 rows accounted for, 5,232 imported, 35 explicitly skipped, 2 colliding attendance rows rejected, 0 unaccounted rows, and 0 ambiguous writes. The evidence contains aggregate counts/hashes only at `docs/migration/evidence/sanitized-xlsx-in-memory-20261026.json`.
- The sanitized snapshot has one `TimeLog.LogID` collision group with two rows. Both remain rejected until the Owner/reviewer reconciles the source; neither is selected automatically.
- No local `DATABASE_URL` or disposable PostgreSQL service was available. The DB-backed import, actual target-policy routing/Pending parity, backup/restore timings, and database evidence remain unverified and must be run by the reviewer.
- The snapshot redacts attachment URLs and contains no file bytes; those records remain explicit exceptions until safe bytes are supplied. Notification/LINE history, chat, announcements, and report exports are not present as source rows in the supplied manifest; do not invent them.
- The prior TEST workbook/run provenance is still unverified; the new importer is the reproducible path for this rehearsal.
- Final local verification: lint, workspace typecheck, 115 Vitest files / 824 tests, package build, API build, Prisma schema validation, and rehearsal script syntax all passed.

## Full-system data dependencies and implementation order

1. Get full workbook/tab manifest and rule dictionary; preserve stable pseudonymous keys, row counts, export period/timezone, and hashes.
2. Map Company/Agency/Department, Employee, manager, roles/scopes, policies, approvers, LeaveType, AttendancePolicy/Holiday/WeeklyWorkRule, OT allowance/professional roles, and BenefitPolicy.
3. Import employee identity and organization crosswalk first; resolve manager and approval relationships after stable identities exist.
4. Import historical request facts and workflow state for Leave, Time Corrections, OT, and Medical; preserve IDs/status/history. Recompute Leave entitlement from CKACE HR tenure rules; do not use GAS quota as target truth.
5. Copy approved in-scope file bytes separately from the spreadsheet into private DEV/TEST R2, verifying SHA-256/size/owner/privacy/link before switching metadata.
6. Import notification state without sending; preserve pending delivery and suppress replay of already-sent messages. Rebuild reports from canonical modules.
7. Build one fail-closed whole-system LEGACY/FROZEN/NEW switch, route coverage, safe write freeze, and reverse-replay rollback. Existing per-module authority metadata alone is insufficient.
8. Rehearse import, reconciliation, restore, rollback, monitoring, cutover communications, and LIFF transition only in isolated DEV/TEST.

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
- Restore/rollback: 2 successful full-system rehearsals each; 100% restored database row and object checksum parity; rollback replays 100% post-cutover mutations for every module with 0 lost/duplicate writes.
- Monitoring/cutover: 60-second probes; 6/6 simulated critical alerts reach on-call within 5 minutes; 3 cutover rehearsals stay within proposed 120-minute freeze; 100% of module smoke routes pass; 100% of active test accounts receive in-app change notice, LINE delivery >=99%, and 100% of failures appear in the fallback roster.

See HANDOFF.md for sheet-to-model inventory, code evidence, switch/rollback design, and phase-by-phase Owner inputs.

## Reviewer/Owner action priority

1. Owner/reviewer resolves or supplies a corrected sanitized snapshot for the one conflicting attendance `LogID` group. Keep both rows rejected until this is resolved; do not choose a row automatically.
2. Reviewer provisions a disposable loopback `ckace_hr_dev` database and supplies the current non-Production role catalog and Leave/Time Correction/OT/Medical approval policies before running the DB rehearsal. Do not derive policies from GAS Agency approval columns.
3. Reviewer runs every step in `docs/migration/RUN_REHEARSAL.md`, captures the generated aggregate evidence, and reports import accounting, Pending counts, approver changes, backup/restore/reset timings, and each exception.
4. Owner supplies a separate safe attachment byte snapshot if retaining all historical files remains required; the current redacted XLSX cannot provide bytes or checksums.
5. HR reviews all changed next-approver IDs before cutover. Unresolved routes block cutover.
6. Later Production gates still require separately named Owner approval; no Production action is approved by this plan.

Production remains NO-GO.
