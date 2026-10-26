# CKACE HR — PROJECT PLAN

Last Updated: 2026-10-26 Asia/Bangkok

## One active TASK

PROD-READINESS-05 — Sanitized XLSX import tooling + full-module DEV/TEST rehearsal. READY AFTER OWNER INPUT, P1. The full-system cutover plan replaces the earlier Leave-only Option 2. Production remains NO-GO.

## Verified baseline

- Application baseline: source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7, released as TESTm74.
- TESTm74 release, health, traffic, Hosting, Leave workflow, documented role/NAV, and responsive evidence are recorded in this handoff. The evidence does not prove full transaction coverage for every module.
- This task used only CKACE_HR files/history in D:\CKACE_HR\.worktrees\main-integration. Root checkout, live GAS, Project A, Production, and cloud commands were not used.

## Current Owner decision

- Move all modules needed for the employee platform together from GAS to CKACE HR; employees use one system after cutover.
- Scope includes identity and organization dependencies, Leave, Attendance, Time Corrections, OT, Medical, Attachments, Notifications, Announcements, and Reports.
- The former Option 2 plan (Leave NEW while other modules stayed LEGACY) is superseded.
- New Leave quota/balance is calculated from CKACE HR's tenure policy. GAS quota values are reconciliation evidence, not the target's authoritative balance.
- This is a plan only. Production still requires separate Owner approval for each data, resource, routing, deployment, traffic, LINE/LIFF, and rollback action.

## XLSX intake finding

- Owner reports that real employees and Leave balances were loaded into TEST from an uploaded XLSX.
- No workbook, XLSX parser/importer, or run identifier for that operation was found in the current checkout or reachable repository history. infra/cloudbuild/test-release.yaml does invoke ckace-hr-migrate-test, but the job command is configured outside this repository and no checked-in code proves it imports XLSX data. Current ExcelJS usage creates report workbooks; it does not read/import them.
- packages/migration has ReadOnlyLegacySource, snapshot hashing, provenance, and some entity transformers, but no XLSX adapter or durable database writer.
- Next: use a complete Owner-exported, sanitized XLSX snapshot and extend these contracts/transformers. Do not create a live GAS Sheets/Drive reader. To trace the earlier TEST load exactly, Owner must provide its file reference or run/build identifier; the existing migrate-test invocation alone is not evidence of an XLSX importer.

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

## Owner input priority

1. Provide the sanitized, complete XLSX snapshot and tab/column dictionary through an approved protected local path; keep it out of Git.
2. If exact prior TEST-import lineage matters, provide the old workbook reference or migration run/build identifier; none is evidenced in the repository.
3. Confirm crosswalks, historical periods, effective dates/timezone, approval history, and medical/attachment/notification retention.
4. Ratify full-system freeze, RTO/RPO, rollback, and alert limits.
5. Name GAS, LINE/LIFF, CKACE operations/database, employee communications, and on-call owners for a later separately approved cutover.

Production remains NO-GO.
