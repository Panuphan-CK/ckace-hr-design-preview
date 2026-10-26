# Local sanitized XLSX migration rehearsal

This is a DEV-only rehearsal. It reads only the Owner-supplied sanitized XLSX files from `CKACE_SNAPSHOT_DIR` (default `D:\CKACE_HR_snapshot`) and writes only to a loopback PostgreSQL database named `ckace_hr_dev`. The scripts reject remote database hosts and any other database name. They do not invoke Cloud tools, contact GAS/Drive, publish a deployment, or access Production.

## Preconditions

1. Install the repository's Node dependencies and local PostgreSQL client tools (`pg_dump`, `pg_restore`).
2. Create a disposable local PostgreSQL database named `ckace_hr_dev` on `127.0.0.1` or `localhost`.
3. Set `DATABASE_URL` in the local process environment using the local credential manager. Do not save it in Git or send it in chat.
4. Ensure `DATABASE_URL` points to the disposable local database. The rehearsal runner independently checks host and database name.
5. Confirm both sanitized workbooks and `MANIFEST.md` are present under the directory selected by `CKACE_SNAPSHOT_DIR` (or the default). Example: `$env:CKACE_SNAPSHOT_DIR = 'D:\CKACE_HR_snapshot'`.
6. Use the sanitized policy JSON captured from the read-only TESTm74 review at `D:\CKACE_HR_snapshot\testm74-approval-policies.json`. Its reviewed values are summarized in `docs/migration/REHEARSAL_POLICY_BASELINE.md`; do not substitute the earlier temporary reviewer-created values. Keep the JSON outside Git.
7. The snapshot contains no notification-delivery history (LINE/chat tabs are excluded) and its attachment URLs are redacted. These remain explicit out-of-scope/blocked reconciliation items until separately supplied through an approved safe transfer.

## Prepare the database

From the repository root in PowerShell:

```powershell
npm ci
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
npm run build:packages
```

`migrate deploy` here targets only the local `ckace_hr_dev` connection supplied through `DATABASE_URL`.

## Seed the temporary role catalog and approval policies

Do this after schema migration and before import/baseline backup. The input policy JSON is an external sanitized export of the **actual** TESTm74 global policy table; no policy values are embedded in the repository because the checked-in code stores them as runtime DB data.

```powershell
$env:CKACE_RUNTIME_STAGE = 'dev'
$env:CKACE_SYSTEM_WRITE_MODE = 'READ_ONLY'
$env:CKACE_MIGRATION_JOB = 'YES'
node scripts/migration/seed-rehearsal-policies.mjs --policy-baseline "D:\CKACE_HR_snapshot\testm74-approval-policies.json"
```

The script ensures the four canonical role keys, inserts only absent global policy rows, skips exact matches, and refuses conflicts. Keep the external JSON outside Git. If its values conflict with the read-only reviewed table in `REHEARSAL_POLICY_BASELINE.md`, stop and request Owner review; never flatten or overwrite a different policy.

## Capture the baseline backup

The dump must remain outside Git. Set the confirmation variables only after checking the local database target:

```powershell
$env:CKACE_RUNTIME_STAGE = 'dev'
$env:CKACE_MIGRATION_REHEARSAL = 'YES'
$env:CKACE_REHEARSAL_CONFIRM = 'YES'
node scripts/migration/backup-restore-local.mjs backup "$env:TEMP\ckace-hr-dev-baseline.dump"
```

Record the returned duration. Keep the dump outside the repo and use that same file for the restore rehearsal.

## Import and reconcile

```powershell
$env:CKACE_SYSTEM_WRITE_MODE = 'READ_ONLY'
$env:CKACE_MIGRATION_JOB = 'YES'
node scripts/migration/rehearse-sanitized-xlsx.mjs
```

The importer runs through the shared migration engine, persists target rows and source-qualified `LegacyRecord` hashes in one transaction per record, and stores row outcome reconciliation codes. The generated evidence contains only workbook/tab row counts, source hashes, target IDs/run ID, status counts and exception codes; it omits source cell values.

For every source request that is Pending at import time, the importer keeps decided approval steps as history and does not keep the old GAS Pending assignment active. It resolves the current target policy and writes new Pending steps after the decided history. Multiple current eligible approvers are stored as one primary approver plus co-approvers. The requester is always excluded. A policy gap, missing/inactive approver, or requester-only candidate creates an unassigned Pending placeholder and an HR exception; the request is never auto-approved and no stage is silently removed. Completed requests get no new steps and retain their request status. The evidence report lists any changed next approver by stable request/USER IDs for HR review before cutover.

When a source approval ID collides between current and 2025 tabs, the importer links it only if exactly one candidate request date has the same year as the approval assignment date. Missing or non-unique date matches are explicit period-ambiguity rejections. It never selects a current/archive request by row order. The supplied snapshot also has `TimeLog.LogID` `LOG-001112` on two rows for different employees. Those rows are imported with composite provenance `LogID::USER:USER-xxx` and carry the named exception `ATTENDANCE_LOG_ID_REUSED_ACROSS_EMPLOYEES`; the source `LogID` is preserved in the attendance payload. If a repeated LogID occurs more than once for the same employee, every row in that collision group remains rejected with `ATTENDANCE_DUPLICATE_SOURCE_LOG_ID`.

Pending-specific code tests cover stage 1, stage 2 after a decided step, co-approvers, a resigned former approver, requester-only eligibility, and completed requests. The script reports Pending request counts before/after, rerouted count, changed approvers, and unresolved cases.

Acceptance for this rehearsal:

- All source data rows must have one outcome: `outcomesByTab` counts sum to `sourceRowsByTab` counts for every tab; unaccounted rows = **0**.
- `ambiguousWrites` = **0** and `stoppedEarly` = **false**.
- `rejected` = **0** except a named source exception with an explicit Owner-approved disposition.
- `ATTENDANCE_LOG_ID_REUSED_ACROSS_EMPLOYEES` is acceptable only when every row has a unique, non-empty `UserID`; every row is imported, keyed by `LogID + UserID`, and reported with the stable user IDs. A same-employee duplicate or missing/ambiguous employee mapping remains rejected in full.
- Every non-PASS reconciliation is tied to an exception code and disposition. No unexplained mismatch is accepted.
- `pendingApprovalHandoff.pendingRequestCountMatches` = **true**; source and target Pending request counts must be exactly equal.
- Every changed next approver is listed by request/USER ID and reviewed by HR before cutover; unresolved approver count = **0** for cutover.
- Attendance rows are created from punch timestamps only. Legacy `WorkHours`/`OT_Hours` are ignored and recalculation is deferred to the new policy.
- Legacy leave quotas are comparison evidence only. Target quotas use the current 2026 leave rules.
- Sanitized attachment URLs do not contain file bytes. Those rows are recorded as explicit exceptions and attachment acceptance remains open until a separate safe byte snapshot is supplied.
- The manifest contains no notification-delivery rows. Do not replay historical LINE/chat notifications; validate new-system delivery separately without sending real messages.

The rehearsal runner exits with code `2` when import accounting, policy routing, pending-count equality, rejected/ambiguous writes, or another recorded reconciliation gate is not clean. It still saves aggregate evidence first so the reviewer can resolve exceptions without exposing cell values.

## Restore and rollback timing

Restore the baseline dump to return the disposable database to its pre-import state:

```powershell
node scripts/migration/backup-restore-local.mjs restore "$env:TEMP\ckace-hr-dev-baseline.dump"
```

Record the returned duration and verify the migration-run/import row counts match the baseline. The script records a counts-and-timing-only evidence JSON under `docs/migration/evidence/`.

`reset <baseline-dump>` performs the same restore operation for an explicit reset rehearsal:

```powershell
node scripts/migration/backup-restore-local.mjs reset "$env:TEMP\ckace-hr-dev-baseline.dump"
```

The database name and loopback checks apply to backup, restore and reset. Never point these commands at a shared, hosted, TEST or Production database.

## Cutover-day Pending request close-out

Before enabling the GAS write freeze, HR must review the Pending handoff report. For an item reported as `CURRENT_APPROVAL_POLICY_HAS_NO_REMAINING_STEPS`, the report states “อนุมัติครบตาม policy ใหม่แล้ว รอ HR ยืนยันปิดคำขอ”. Notify the assigned approver to close the still-Pending request in GAS before the freeze, then have HR confirm its terminal status and ensure the final sanitized snapshot/reconciliation reflects that closure. Never auto-approve or close it in CKACE HR. If the owner/approver cannot close it or the final Pending count changes unexpectedly, keep the cutover blocked and record an exception.

## Read-only switch checks

Run the read-only and default-`ACTIVE` tests from the repository root:

```powershell
npx vitest run apps/api/src/runtime/system-write-mode.test.ts apps/api/src/routing/module-routing-config.test.ts apps/api/src/routing/module-routing.service.test.ts apps/api/src/routing/module-routing.guard.test.ts apps/api/src/routing/system-readonly-endpoint-matrix.test.ts apps/api/src/security/authorization.guard.test.ts --pool=threads --maxWorkers=1
```

`CKACE_SYSTEM_WRITE_MODE` absent or set to `ACTIVE` preserves existing DEV/TEST writes. `READ_ONLY` rejects every `POST`/`PUT`/`PATCH`/`DELETE` business endpoint, including routes whose metadata says `READ`; only Desktop login, LINE login, and logout remain available. Session confirmation and password recovery mutations are blocked during the freeze. The notification and cleanup jobs skip/refuse writes. The standalone migration runner is the only component permitted to bypass the HTTP write guard.

The runner reads `scripts/migration/approved-rehearsal-dispositions.mjs`. It exits `0` only when outcomes match the exact approved counts and IDs, all hard gates pass, and the only unresolved approval case is the approved LEV-0109 HR close-out exception. The accepted set is 34 attachment rows without sanitized bytes, one pending legacy approval step intentionally replaced by the target policy, and the two Owner-approved cross-employee LOG-001112 rows. A changed count/ID, new code, extra pending request, changed next approver, rejected row, ambiguous write, or accounting gap keeps exit code `2`.

The latest numeric rehearsal evidence is `docs/migration/evidence/prod-readiness-06-rehearsal-20261026.json`. These are reviewer-run results; this task does not connect to a database.

## Evidence files

- `docs/migration/evidence/*-import-summary.json`: counts, IDs, hashes and exception codes only.
- `docs/migration/evidence/database-*.json`: action and elapsed seconds only.
- Do not copy workbooks, database dumps, cell values, credentials or record-level personal data into this repository.
