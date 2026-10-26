# CKACE HR — ACTIVE TASK

Updated: 2026-10-26 Asia/Bangkok

## PROD-READINESS-05 — Sanitized XLSX import tooling + full-module DEV/TEST rehearsal

Status: READY AFTER OWNER INPUT
Priority: P1 — the Owner has selected a full-system cutover, but the repository has no XLSX reader, durable target writer, global source switch, or complete module mapping.

Decision boundary:
The current plan moves all employee-facing modules together so employees use one system. The earlier Leave-only Option 2 is superseded. Leave balances are calculated from CKACE HR's tenure rules, not copied from GAS quotas. This remains planning/DEV/TEST work only; it is not Production approval.

Objective / why now:
Use an Owner-exported, sanitized XLSX snapshot as the reproducible source for a complete cross-module migration rehearsal. Extend the existing migration contracts and transformers rather than building a live Sheets/Drive connector. Prove identity/org dependencies, rule translations, module reconciliation, attachments, notifications, routing, backup/restore, and rollback before any Production readiness decision.

Required Owner inputs, in priority order:
1. Complete sanitized XLSX snapshot covering all in-scope GAS tabs, with tab/column dictionary, stable pseudonymous keys, export timestamp, period/timezone, and row counts. Keep the file outside Git and provide it through an approved local data-transfer path; do not attach unredacted employee/medical data or credentials in chat.
2. If the historical TEST import must be traced exactly, provide its workbook path/name or migration job/run/build identifier. No XLSX importer/workbook/run evidence was found; infra/cloudbuild/test-release.yaml invokes ckace-hr-migrate-test but does not define its command or prove XLSX import.
3. Confirm source-to-target crosswalks for companies, teams/departments, managers, roles, approval chains, attendance policies/holidays, OT policies, benefit policies, attachments, and notification retention. Confirm target effective-date/timezone rules and any exception approver.
4. Ratify measurable rehearsal limits: full-system write freeze/downtime target (proposed <=120 minutes), restore and rollback RTO (proposed <=60 minutes), and RPO=0 after final freeze. These are proposals, not approved SLAs.
5. Name later cutover owners: GAS administrator, LINE Developers/LIFF administrator, CKACE HR operations/database operator, employee communications owner, and on-call/monitoring recipient.

Scope:
- Implement an offline XLSX-backed ReadOnlyLegacySource and a durable provenance-keyed DEV/TEST target adapter using the current MigrationRun/LegacyRecord/Reconciliation contracts where appropriate.
- Inventory all workbook tabs and reject unknown tabs, duplicate IDs, missing required keys, formulas without approved cached values, unsafe URLs, or privacy failures.
- Map all source data needed for identity/org/policies/approvals, Leave, Attendance/Time Corrections, OT, Medical, Attachments, Notifications, Announcements, and report reproduction.
- Treat LeaveQuota as diagnostic only; derive target entitlement and balance using CKACE HR tenure rules and reconciled historical usage.
- Implement and test a full-system LEGACY/FROZEN/NEW switch enforced by every API write/read path and side-effect worker before exercising cutover/rollback.
- Run only local or isolated DEV/TEST rehearsals from sanitized fixtures. No Production access/action.

Out of scope:
- Reading live GAS Sheets/Drive or inspecting/changing Project A source/configuration.
- Production database, R2, credentials, Secret Manager, IAM, cloud settings/commands, migration, deployment, traffic, DNS/Firebase, LINE/LIFF, or real employee notification.
- Production cutover. Every Production action needs separate explicit Owner approval.
- Importing GAS LeaveQuota as the authoritative new balance.

Acceptance criteria:
1. Two parses of an unchanged sanitized XLSX produce identical workbook and per-tab SHA-256 manifests; 100% of declared tabs/rows are accounted for; 0 unknown tabs, duplicate stable IDs, unmasked direct identifiers/secrets, or unsafe live file URLs.
2. 100% of in-scope records in each source tab are imported, explicitly excluded with Owner-approved disposition, or rejected with a unique reason; 0 silent drops and 0 duplicate target rows on a second import.
3. 100% of active employees and required company/team/manager/role/approver relationships resolve; 0 orphan references or unauthorized role grants.
4. Leave history/statuses reconcile 100%; target entitlements are recomputed by the approved tenure policy; 100% of per-employee/type differences are explained and signed off; 0 GAS quotas silently become target balances.
5. Per-module thresholds in HANDOFF.md pass for Attendance, Time Corrections, OT, Medical, Attachments, Notifications, Announcements, Reports, and provenance. Attachment bytes match exact SHA-256 and size; notification replay produces 0 duplicate sends.
6. All full-system routes and writes are proven to obey one fail-closed LEGACY/FROZEN/NEW mode; 100% route coverage, 0 unguarded mutation paths, and 0 split-authority state during rehearsal.
7. Two full-system DEV/TEST backup/restore rehearsals pass with 100% row/object checks; two rollback rehearsals include at least one post-cutover mutation per in-scope module, with 100% replay parity and 0 lost/duplicate effects. Proposed RPO/RTO limits remain subject to Owner ratification.
8. Evidence includes XLSX hash/tab manifest, import run IDs, per-module reconciliation reports, file checksum manifest, route/write-coverage evidence, notification no-duplicate evidence, backup/restore timings, and rollback logs. No Production system is accessed or changed.

Next TASK:
After this rehearsal passes, create a separately gated Production go/no-go and cutover approval task. Production remains NO-GO until the Owner separately approves each action.
