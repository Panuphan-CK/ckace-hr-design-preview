# Local sanitized XLSX migration rehearsal

This is a DEV-only rehearsal. It reads only the Owner-supplied sanitized XLSX files in `D:\CKACE_HR_snapshot` and writes only to a loopback PostgreSQL database named `ckace_hr_dev`. The scripts reject remote database hosts and any other database name. They do not invoke Cloud tools, contact GAS/Drive, publish a deployment, or access Production.

## Preconditions

1. Install the repository's Node dependencies and local PostgreSQL client tools (`pg_dump`, `pg_restore`).
2. Create a disposable local PostgreSQL database named `ckace_hr_dev` on `127.0.0.1` or `localhost`.
3. Set `DATABASE_URL` in the local process environment using the local credential manager. Do not save it in Git or send it in chat.
4. Ensure `DATABASE_URL` points to the disposable local database. The rehearsal runner independently checks host and database name.
5. Confirm both sanitized workbooks and `MANIFEST.md` are present under `D:\CKACE_HR_snapshot`.
6. Provision the target role catalog and active approval policies for Leave, Time Correction, OT, and Medical from an Owner-approved non-Production baseline before taking the baseline dump. The checked-in schema migrations do not seed these business policies. The importer never invents a policy; if one is absent/ambiguous or yields no approver, the request remains Pending with an explicit HR exception.
7. The snapshot contains no notification-delivery history (LINE/chat tabs are excluded) and its attachment URLs are redacted. These remain explicit out-of-scope/blocked reconciliation items until separately supplied through an approved safe transfer.

## Prepare the database

From the repository root in PowerShell:

```powershell
npm ci
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
npm run build:packages
```

`migrate deploy` here targets only the local `ckace_hr_dev` connection supplied through `DATABASE_URL`.

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

When a source approval ID collides between current and 2025 tabs, the importer links it only if exactly one candidate request date has the same year as the approval assignment date. Missing or non-unique date matches are explicit period-ambiguity rejections. It never selects a current/archive request by row order. The supplied sanitized snapshot has one conflicting `TimeLog.LogID` group containing two rows; both colliding rows are rejected with `ATTENDANCE_DUPLICATE_SOURCE_LOG_ID` so no attendance row is silently selected. Resolve that source collision before expecting a clean reconciliation.

Pending-specific code tests cover stage 1, stage 2 after a decided step, co-approvers, a resigned former approver, requester-only eligibility, and completed requests. The script reports Pending request counts before/after, rerouted count, changed approvers, and unresolved cases.

Acceptance for this rehearsal:

- All source data rows must have one outcome: `outcomesByTab` counts sum to `sourceRowsByTab` counts for every tab; unaccounted rows = **0**.
- `ambiguousWrites` = **0** and `stoppedEarly` = **false**.
- `rejected` = **0** except a named, Owner-approved source exception with an explicit disposition.
- If duplicate attendance `LogID` values exist, every colliding row is reported with `ATTENDANCE_DUPLICATE_SOURCE_LOG_ID` and none is imported. Resolve the source conflict before requiring zero rejected rows; do not choose a winner automatically.
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

## Read-only switch checks

Run the read-only and default-`ACTIVE` tests from the repository root:

```powershell
npx vitest run apps/api/src/runtime/system-write-mode.test.ts apps/api/src/routing/module-routing-config.test.ts apps/api/src/routing/module-routing.service.test.ts apps/api/src/routing/module-routing.guard.test.ts apps/api/src/security/authorization.guard.test.ts --pool=threads --maxWorkers=1
```

`CKACE_SYSTEM_WRITE_MODE` absent or set to `ACTIVE` preserves existing DEV/TEST writes. `READ_ONLY` freezes every module write route; unclassified mutation endpoints fail closed; authentication/session operations remain available. The notification and cleanup jobs skip/refuse writes. The standalone migration runner is the only component permitted to bypass the HTTP write guard.

## Evidence files

- `docs/migration/evidence/*-import-summary.json`: counts, IDs, hashes and exception codes only.
- `docs/migration/evidence/database-*.json`: action and elapsed seconds only.
- Do not copy workbooks, database dumps, cell values, credentials or record-level personal data into this repository.
