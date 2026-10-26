# CKACE HR — Active Decisions

Updated: 2026-10-26 Asia/Bangkok

## Current implementation and TEST authority

- Codex Local is the active executor.
- The verified application baseline is source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7, released as TESTm74.
- The active continuation branch is codex/main-integration; application publication uses the explicitly named source remote.
- Production remains NO-GO until readiness gates pass and the Owner separately approves each named Production action.

## Owner decision PROD-READINESS-02 — replaced by full-system cutover

On 2026-10-26, the Owner replaced the earlier Option 2 bounded Leave-only plan:

- The target is one coordinated migration from GAS to CKACE HR for the complete employee-facing system: Leave, Attendance, time correction, OT, Medical, Attachments, Notifications, Announcements, and Reports, with identity, organization, policies, and approval data required by those modules.
- Employees should use one system after cutover. Do not plan a Leave-only split between NEW and LEGACY.
- Leave quota/balance at cutover is calculated using CKACE HR's current tenure-based entitlement rules. GAS UserPolicies/LeaveQuota is evidence for reconciliation only and is not the authoritative target balance.
- The earlier Option 2 routing (LEAVE_READ/LEAVE_WRITE=NEW with other modules=LEGACY) is superseded and must not be used as the active cutover plan.
- This is a planning decision only. It does not authorize Production data access, resource creation, data mutation, deployment, traffic/DNS/Firebase changes, LINE/LIFF changes, or cutover.

## Owner decision PROD-READINESS-05 — Pending approval handoff (2026-10-26)

The Owner selected Option B for requests still Pending at a future cutover:

- Preserve every decided historical step and the historical approver.
- Replace old GAS Pending assignments with new Pending steps derived from the current CKACE HR policy for that request type.
- Report each request whose next approver changes from GAS so HR can review it before switching.
- If no current approver can be resolved, or the requester is the only candidate, record an exception and keep the request Pending. Never skip the step or auto-approve.
- Completed requests receive no new approval steps and no status changes.
- Reconcile source and target Pending request counts exactly.
- Exercise Pending at stage 1, Pending at stage 2 after a decided stage, co-approvers, and an inactive/resigned old approver. Also verify requester self-approval is impossible.

This is a migration/rehearsal business-rule decision only, not Production approval.

## PROD-READINESS-06 — Reviewer rehearsal dispositions and migration tools (2026-10-26)

The Owner reviewed the disposable PostgreSQL 16 rehearsal from revision `21101da` and confirmed these dispositions for the next DEV rehearsal:

- `TimeLog.LogID` `LOG-001112` is reused by different employees in the source GAS bug. Import both rows with `(LogID, UserID)` provenance and record `ATTENDANCE_LOG_ID_REUSED_ACROSS_EMPLOYEES` as a named exception. If a LogID repeats for the same employee, reject every row in that collision group as before.
- A Pending request with no remaining step under the target policy, including LEV-0109, stays Pending as an HR exception. Report “อนุมัติครบตาม policy ใหม่แล้ว รอ HR ยืนยันปิดคำขอ”. Before future write freeze, notify the assigned approver to close the still-Pending request in GAS and have HR confirm its terminal status. Never auto-approve or close it in CKACE HR.
- The 34 legacy attachment records are deferred to separate file-transfer work. PROD-READINESS-06 may prepare a local SHA-256-checked copy tool, but must not upload objects in this round.
- Snapshot paths may be overridden by `CKACE_SNAPSHOT_DIR`; the default stays `D:\CKACE_HR_snapshot`.
- `CKACE_SYSTEM_WRITE_MODE=READ_ONLY` rejects all API POST/PUT/PATCH/DELETE operations, including routes labelled READ. Only desktop login, LINE login, and logout remain allowed; session confirmation and password-recovery mutations are blocked.
- The prior reviewer-created temporary global approval policies are not verified as the actual TESTm74 baseline. Do not copy those values into code/docs as current policy. Require a sanitized external policy export matching TESTm74 revision `1322ed48e98428ffd580a6ec2e8bb7cdec5132c7`; if the export is scoped or multi-policy, extend the seeder rather than flattening it.

These are DEV migration and rehearsal instructions only. The review does not authorize Production database/resource creation, data mutation, deploy, traffic/DNS/LINE changes, or cutover.

## Implementation implications

- Current module contracts expose 26 route keys across 13 modules. Current Production validation permits exactly one module pair to be NEW and rejects a multi-module full-system route state.
- CKACE_MODULE_ROUTING_STATE and ModuleRoutingGuard currently provide per-route authority context. The context is not a universal legacy/new data dispatcher: standard controllers/services can call the new database directly.
- CKACE_MODULE_WRITE_FREEZE is a per-module API write guard; coverage of every mutation, worker, notification, and external GAS trigger is not yet proven as a system-wide stop switch.
- `CKACE_SYSTEM_WRITE_MODE=READ_ONLY` is now implemented as a fail-closed system-wide API write freeze; unset/ACTIVE preserves current TEST behavior, and the explicit migration job may write only to a loopback `ckace_hr_dev` database. This is not the full LEGACY/FROZEN/NEW read/write authority dispatcher.
- The full-system authority mode, stable employee entry point, external GAS ingress freeze, and reverse-replay rollback still need design and proof. Module route metadata alone is insufficient.
- A rollback must freeze NEW writes and side-effect workers, capture and reverse-reconcile every post-cutover change, and only then restore LEGACY. A config flip alone can lose writes. Reverse import/replay is not implemented or proven.

## Data and safety boundaries

- Use an Owner-exported, privacy-scrubbed XLSX snapshot for DEV/TEST rehearsal. Do not create a live Sheets/Drive reader for this plan.
- A new offline XLSX import path and Prisma target store now exist in `packages/migration/src/`; a DB-backed rehearsal has not run because no disposable local database is configured. The prior TEST workbook/run provenance remains unverified. infra/cloudbuild/test-release.yaml invokes ckace-hr-migrate-test, but its command is configured outside the repository and no local evidence proves it performed the earlier XLSX import.
- The supplied sanitized snapshot passed an in-memory row-accounting run: 5,269 rows, 0 unaccounted, 0 ambiguous writes. Two rows sharing an attendance `LogID` were both rejected pending source reconciliation. The run does not prove DB writes or target-policy routing.
- For request IDs duplicated between the current and 2025 tabs, the importer matches approval history only when exactly one candidate request date shares the approval assignment year; otherwise it records a period ambiguity instead of choosing a row.
- `docs/migration/RUN_REHEARSAL.md` is the reviewer-run entry point for the disposable local DB import, Pending reconciliation, and timed backup/restore/reset. The supplied manifest redacts file URLs and contains no attachment bytes; notification/LINE history and chat are excluded.
- No live GAS/Sheets/Drive data, Project A repository, Production system, cloud command, deployment, credential, secret, or IAM setting was accessed or changed during this planning task.
- Full-system migration targets and proposed thresholds are planning evidence only. Production remains NO-GO.
- Secrets and real employee/medical data must not be sent in chat or committed to Git. Use an approved protected data-transfer path for any later snapshot.

## Separate Production approvals

Every future Production action needs separate explicit Owner approval, including live source export/read, production database or bucket creation, credentials/Secret Manager/IAM, migration/data mutation, system routing, deploy/traffic, DNS/Firebase, LINE/LIFF, employee notification, and rollback.
