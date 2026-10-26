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

The Owner reviewed the disposable PostgreSQL 16 rehearsal from revision `21101da` and confirmed these dispositions for the next DEV rehearsal. At that point, the exact TESTm74 policy export had not yet been supplied; the later reviewer result below supersedes that waiting status.

- `TimeLog.LogID` `LOG-001112` is reused by different employees in the source GAS bug. Import both rows with `(LogID, UserID)` provenance and record `ATTENDANCE_LOG_ID_REUSED_ACROSS_EMPLOYEES` as a named exception. If a LogID repeats for the same employee, reject every row in that collision group as before.
- A Pending request with no remaining step under the target policy, including LEV-0109, stays Pending as an HR exception. Report “อนุมัติครบตาม policy ใหม่แล้ว รอ HR ยืนยันปิดคำขอ”. Before future write freeze, notify the assigned approver to close the still-Pending request in GAS and have HR confirm its terminal status. Never auto-approve or close it in CKACE HR.
- The 34 legacy attachment records are deferred to separate file-transfer work. PROD-READINESS-06 may prepare a local SHA-256-checked copy tool, but must not upload objects in this round.
- Snapshot paths may be overridden by `CKACE_SNAPSHOT_DIR`; the default stays `D:\CKACE_HR_snapshot`.
- `CKACE_SYSTEM_WRITE_MODE=READ_ONLY` rejects all API POST/PUT/PATCH/DELETE operations, including routes labelled READ. Only desktop login, LINE login, and logout remain allowed; session confirmation and password-recovery mutations are blocked.
- The prior reviewer-created temporary global approval policies were not verified as the TESTm74 baseline. Do not copy those values into code/docs as current policy. The owner-supplied sanitized export and reviewer read-only verification are recorded in the following result section.

These are DEV migration and rehearsal instructions only. The review does not authorize Production database/resource creation, data mutation, deploy, traffic/DNS/LINE changes, or cutover.

## PROD-READINESS-06 reviewer result and TESTm74 policy evidence (2026-10-26)

The reviewer reported a PostgreSQL 16 loopback `ckace_hr_dev` rehearsal from revision `a793020` using the sanitized snapshot and the actual TESTm74 policy export. This is reviewer-provided evidence; Codex did not connect to the database in PROD-READINESS-07.

- Import accounted for 5,269 rows: 5,234 imported, 35 skipped, 0 rejected, 0 unaccounted, 0 ambiguous writes, and no early stop; elapsed time 62 seconds.
- Target counts: 25 employees, 193 leave requests, 508 OT requests, 2,416 attendance records, 23 medical claims, 64 time corrections, and 1,948 approval steps. The 2026 entitlement set covered 23 employees x 3 types.
- Replay skipped 5,234 identical rows and added 0 rows. Pending source/target count was 1/1; LEV-0109 remained an HR exception. Backup/restore/reset took 0.30/0.59/0.83 seconds. Restore returned to baseline with 0 employee rows and 4 policy rows.
- Read-only TESTm74 policy evidence: 4 active global policies (LEAVE, TIME_CORRECTION, OVERTIME, MEDICAL), each `ADMIN/SAME_AGENCY` then `SUPERADMIN/GLOBAL`; all employees use `STANDARD`. The names and table are in `docs/migration/REHEARSAL_POLICY_BASELINE.md`. The sanitized seeder JSON remains outside Git.
- Owner accepts 2 cross-employee LOG-001112 attendance rows, LEV-0109 as an HR close-out exception, and 34 attachment rows without bytes as a separately deferred transfer. The runner may exit 0 only for this exact named/count disposition set plus the expected replaced Pending approval step; any other mismatch remains exit 2.

This result does not authorize Production actions. It does not change the full-system authority/rollback blocker or the requirement for separate Owner approval for each Production action.

## Implementation implications

- Current module contracts expose 26 route keys across 13 modules. Production startup accepts all routes as `LEGACY` or all as `NEW`; any mixed state fails. The old single-value `CKACE_MODULE_ROUTING` runtime field has been removed so health/Admin report the actual route-state summary.
- Owner decision PROD-READINESS-08 (2026-10-26) replaces the earlier dispatcher/reverse-replay design: do not build a per-module LEGACY/FROZEN/NEW dispatcher, do not accept concurrent GAS/CKACE writes, and do not reverse-replay data into GAS.
- Use `CKACE_SYSTEM_WRITE_MODE=READ_ONLY` while preparing/importing, then `ACTIVE` at opening, together with one switch of employee links/LIFF/rich menu. There is no Production parallel run. TEST defaults remain unchanged.
- The point of no return is the first change of an official employee entry link to CKACE HR. Before it, return links to GAS and unfreeze GAS after verifying CKACE accepted **0** employee writes. After it, fix-forward is preferred. If forced to GAS, freeze CKACE, export post-marker changes, have HR manually re-enter all items, reconcile **100%**, then resume GAS writes. Keep R2 objects for attachment recovery; the JSON exporter contains metadata, not file bytes.
- `CKACE_SYSTEM_WRITE_MODE=READ_ONLY` is a fail-closed system-wide API write freeze; unset/ACTIVE preserves TEST behavior. Migration data writes remain guarded to a local loopback `ckace_hr_dev`. The new post-cutover export has a separate `READ_ONLY` transaction guard and requires `CKACE_PROD_EXPORT_CONFIRM=YES` for `ckace_hr_prod`; this flag is not Owner approval and the tool has not been run against Production.

## Data and safety boundaries

- Use an Owner-exported, privacy-scrubbed XLSX snapshot for DEV/TEST rehearsal. Do not create a live Sheets/Drive reader for this plan.
- The reviewer reported rehearsal revision `fb0e444`: 5,234 imported, 35 skipped, 0 rejected; every configured disposition matched and `unapprovedOutcomeCount=0`. The runner still exited 2 because `changedNextApprovers=1` for the already Owner-approved LEV-0109 HR exception. The code fix in this work permits only exactly one changed-next-approver row for LEV-0109; the reviewer must rerun to verify it.
- Reviewer-reported full-dump reset was 0.83 seconds and full-data backup was 0.30 seconds. This is reviewer-provided DEV evidence; Codex did not connect to the temporary database in this task.
- The prior in-memory run row accounting and the PostgreSQL rehearsal are distinct evidence. The reviewer run from `a793020` imported 5,234, skipped 35, rejected 0, and reported no ambiguous writes; two cross-employee `LOG-001112` rows were imported by the Owner-approved disposition.
- `docs/migration/RUN_REHEARSAL.md` remains the reviewer entry point for sanitized XLSX import, pending reconciliation, and timed backup/restore/reset. The new `docs/migration/POST_CUTOVER_EXPORT.md` describes a guarded manual recovery export; no live DB operation was performed here.
- For request IDs duplicated between the current and 2025 tabs, the importer matches approval history only when exactly one candidate request date shares the approval assignment year; otherwise it records a period ambiguity instead of choosing a row.
- `docs/migration/RUN_REHEARSAL.md` is the reviewer-run entry point for the disposable local DB import, Pending reconciliation, and timed backup/restore/reset. The supplied manifest redacts file URLs and contains no attachment bytes; notification/LINE history and chat are excluded.
- No live GAS/Sheets/Drive data, Project A repository, Production system, cloud command, deployment, credential, secret, or IAM setting was accessed or changed during this planning task.
- Full-system migration targets and proposed thresholds are planning evidence only. Production remains NO-GO.
- Secrets and real employee/medical data must not be sent in chat or committed to Git. Use an approved protected data-transfer path for any later snapshot.

## Separate Production approvals

Every future Production action needs separate explicit Owner approval, including live source export/read, production database or bucket creation, credentials/Secret Manager/IAM, migration/data mutation, system routing, deploy/traffic, DNS/Firebase, LINE/LIFF, employee notification, and rollback.

## Owner decision PROD-READINESS-08 — atomic full-system opening and manual fallback (2026-10-26)

This decision supersedes the earlier PROD-READINESS-08 idea of a per-module dispatcher and reverse replay:

- Keep GAS and CKACE HR from accepting writes at the same time. No Production parallel run is planned.
- Keep `CKACE_SYSTEM_WRITE_MODE=READ_ONLY` during preparation/import; switch all module routes to `NEW`, change official employee entry links, record the cutover marker, then set the system write mode to `ACTIVE` for opening. Mixed route state must fail startup. No module-by-module authority dispatcher is required.
- The first official employee-link change is the point of no return. Before it, the Owner may return links to GAS and unfreeze GAS after verifying CKACE accepted zero employee writes.
- After it, fix-forward is preferred. If the Owner chooses a GAS fallback, set CKACE to `READ_ONLY`, export all post-marker module changes, have HR re-enter them manually, and reconcile 100% before enabling GAS writes. Do not reverse-replay into GAS.
- Hypercare lasts the first three business days and follows the daily gates in `docs/migration/CUTOVER_RUNBOOK.md`.
- Production export uses a separate guard: READ_ONLY PostgreSQL transaction, `ckace_hr_prod` attestation, and `CKACE_PROD_EXPORT_CONFIRM=YES`. This task did not run or access Production. Each future run still needs separate Owner approval.

## Reviewer finding PROD-READINESS-07 — changed next approver (2026-10-26)

The reviewer reported `fb0e444` returned exit 2 only because `changedNextApprovers=1` for LEV-0109, whose no-remaining-step HR exception is already Owner-approved. This work allows exactly one LEV-0109 changed-next-approver row, and keeps any other ID, duplicate LEV-0109 row, changed count, or other hard-gate failure blocking. Reviewer rerun remains required; the DB rehearsal was not repeated by Codex.
