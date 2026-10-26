# Post-cutover manual recovery export

Status: **Tool and procedure only. No Production export or DB connection was run.** Every Production export requires separate explicit Owner approval for that exact run. The output contains personal and potentially medical data and must be written to an encrypted, access-restricted location outside Git.

The export is an aid for HR manual recovery if the Owner decides to return to GAS after opening. It is not reverse replay and it does not enable parallel writes. Fix-forward remains the default.

Each successful run creates a paired JSON export and HR workbook beside it. For `post-cutover-recovery.json`, the companion is `post-cutover-recovery.hr.xlsx`. Both destinations must be outside every Git checkout, and neither file may already exist. The script creates both exclusively; if creating the second file fails, it removes the first file created by that run so the output is not mistaken for a complete pair.

## At the approved opening: create the marker

Run from the checked-out application worktree, while CKACE is still `READ_ONLY` and before changing it to `ACTIVE`:

```powershell
$env:CKACE_SYSTEM_WRITE_MODE = 'READ_ONLY'
$env:CKACE_CUTOVER_MARKER_CONFIRM = 'YES'
node scripts/migration/create-cutover-marker.mjs --output 'D:\CKACE_HR_secure\cutover-marker.json'
```

The marker contains a UTC `cutoverAt` and unique UUID `runId`. Store it outside the repository in a restricted directory. The command refuses to overwrite an existing marker and rejects a path that resolves inside any Git checkout. The runbook sequence is: keep CKACE `READ_ONLY`, set all 26 route keys to `NEW`, change the official employee links, record the marker, then set `CKACE_SYSTEM_WRITE_MODE=ACTIVE`. No employee write is accepted before ACTIVE.

## DEV rehearsal only

This path is restricted to loopback PostgreSQL database `ckace_hr_dev`. It requires the existing migration-job guard as well as system READ_ONLY. Put `DATABASE_URL` in the process environment from a local secret manager; never place it in a command, file in Git, or chat.

```powershell
$env:CKACE_RUNTIME_STAGE = 'dev'
$env:CKACE_SYSTEM_WRITE_MODE = 'READ_ONLY'
$env:CKACE_MIGRATION_JOB = 'YES'
Remove-Item Env:CKACE_PROD_EXPORT_CONFIRM -ErrorAction SilentlyContinue
node scripts/migration/export-post-cutover.mjs `
  --marker 'D:\CKACE_HR_secure\cutover-marker.json' `
  --output 'D:\CKACE_HR_secure\post-cutover-recovery.json'
```

Only local/disposable `ckace_hr_dev` may be used for an operational rehearsal. Unit tests use synthetic PostgreSQL URLs and in-memory Prisma delegates; they do not connect to any database. Do not run the exporter against a live database as part of TEST verification.

## Production fallback: Owner approval required for each run

If the Owner chooses a post-open return to GAS, freeze CKACE first and confirm user writes and notification/cleanup sends have stopped. The Owner must separately approve the Production read-only export before setting the confirmation variable below. Keep `DATABASE_URL` injected through the approved process environment; never put its value on the command line.

```powershell
$env:CKACE_RUNTIME_STAGE = 'production'
$env:CKACE_SYSTEM_WRITE_MODE = 'READ_ONLY'
$env:CKACE_PROD_EXPORT_CONFIRM = 'YES'
node scripts/migration/export-post-cutover.mjs `
  --marker 'D:\CKACE_HR_secure\cutover-marker.json' `
  --output 'D:\CKACE_HR_secure\post-cutover-recovery.json'
```

This guard accepts only `ckace_hr_prod` on a non-loopback host and requires `CKACE_PROD_EXPORT_CONFIRM=YES`. The script starts a PostgreSQL `REPEATABLE READ` transaction, executes `SET TRANSACTION READ ONLY` before its first query, attests the connected database name, and performs reads only. It has no update/delete/replay code. It prints aggregate counts and the output path, never row contents. The flag is not an approval by itself: Owner approval is still required before every actual Production run. This task does not set it or connect to Production.

## Export contents and HR reconciliation

The JSON remains the structured recovery snapshot. The companion XLSX is a separate HR-facing key-back report with a `สรุป` sheet and five business sheets: `การลา`, `OT`, `ลงเวลา`, `แก้ไขเวลา`, and `ค่ารักษา`. Its summary counts rows, new items, and changed items for each module. Each business row uses legacy `USER-xxx`/request IDs where a `LegacyRecord` mapping exists, employee name, type, BE dates (`DD/MM/YYYY`), times, quantities/hours or amounts, current status, and each approval step's approver, result, and decision time. Missing legacy mappings remain blank; the workbook does not show internal UUIDs. Every row is labeled `สร้างใหม่หลัง cutover` or `แก้ไขหลัง cutover` based on its creation timestamp relative to the marker.

The workbook is generated from the same database snapshot and read-only transaction as the JSON. It contains personal and potentially medical data, so store both files together in an encrypted, access-restricted location outside Git and apply the same retention/deletion controls to each. File mode is set to `0600` where supported; the script does not set Windows ACLs or encrypt either output.

- A timestamped scalar snapshot of identity/organization, roles/scopes, approval policy and history, Leave, Attendance/Time Correction, OT, Medical, calendar, attachment metadata, Announcements, Notifications, technical idempotency keys, and audit rows whose supported timestamps are at or after the marker.
- Relevant current relationship rows are attached to changed/audited parents. Audit events preserve the action/identifier trail for deleted rows; a missing current row must be treated as a possible deletion and reviewed.
- Reports are rebuilt from canonical Leave/Attendance/OT/Medical records. Report-export audit entries remain in the audit section.
- Password/secret/token/authorization fields and notification error text are omitted. Other personal and medical values are intentionally present for restricted HR recovery.
- Attachment object metadata, storage keys, and checksums are included; the file bytes in R2 are **not** embedded. Keep R2 readable and retain the objects until any manual GAS re-entry is reconciled. HR must securely retrieve any required attachment bytes separately; if they are unavailable, do not claim attachment recovery is complete.
- Notification rows are recovery evidence only. Do not resend messages automatically; HR/Owner decides any manual notice.

The exporter is not a write replay tool. Reviewer/HR must compare per-module IDs, statuses, relationships, and counts, then have HR manually enter the approved changes into GAS. Resume GAS writes only after **100%** item-level reconciliation and **0** unexplained/missing/duplicate items. `counts.totalRecords` includes related context/audit categories and is not itself a business-row reconciliation target.

Protect both outputs with a restricted NTFS ACL and encrypted storage. Node's file mode is set to `0600` where supported, but the script does not configure Windows ACLs or encrypt the files. Never commit marker/export/evidence files.
