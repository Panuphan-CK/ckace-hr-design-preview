# CKACE HR — ACTIVE TASK

Updated: 2026-10-26 Asia/Bangkok

## PROD-READINESS-09 — Reviewer rerun corrected disposition + full-system route/export checks

Status: WAITING FOR REVIEWER — local implementation and requested code verification passed. Database rehearsal is limited to a disposable loopback PostgreSQL database named `ckace_hr_dev`. Production remains NO-GO.

Priority: P1 — reviewer evidence is still needed to confirm the corrected named exception gate and exercise the marker/export against PostgreSQL before this recovery plan can be treated as rehearsed.

Objective / why now:
Have the reviewer rerun the sanitized XLSX migration rehearsal against the pushed implementation, then validate the marker and post-cutover read-only export using only disposable loopback `ckace_hr_dev`.

Scope:
- Rerun the import and disposition checks, including the exact Owner-approved LEV-0109 changed-next-approver exception.
- Confirm import accounting, idempotency, Pending parity, and no unapproved disposition outcomes.
- Generate an external marker and run the exporter while `CKACE_SYSTEM_WRITE_MODE=READ_ONLY`, with the migration-job guard and `ckace_hr_dev` database-name attestation.
- Review per-module export counts, marker/run ID, read-only transaction evidence, and external output-path safety.
- Record only numeric/aggregate evidence in Git; keep XLSX, marker, export, dump, and employee data outside Git.

Out of scope:
- Production or any non-loopback database, cloud commands, deploy, traffic/DNS/Firebase/LINE changes, Project A, root checkout `D:\CKACE_HR`, production credentials/IAM/secrets, or real employee data access.
- Reverse replay or automated GAS writes. A forced fallback remains manual HR re-entry after separate Owner approval.

Acceptance criteria:
1. Reviewer rehearsal exits 0 with 5,234 imported, 35 skipped, 0 rejected, 0 unaccounted/ambiguous writes, all approved dispositions matched, and exactly one changed-next-approver item: LEV-0109. Any other changed item or duplicate remains blocking.
2. Idempotent rerun adds 0 duplicates; source/target Pending counts match; the LEV-0109 HR exception remains explicit and is not auto-approved.
3. Marker has a valid UTC `cutoverAt` and unique UUID `runId`, is written outside every Git checkout, and is not overwritten.
4. Export runs only against loopback `ckace_hr_dev` with `READ_ONLY`; the PostgreSQL transaction is read-only and attests the database name before module queries; exported module counts and marker ID are reviewed.
5. No export data, workbook, dump, or secrets enter the repository; no Production access or operation occurs.

Verification:
- Codex local gates already passed for this implementation: `npm run lint`, `npm run typecheck`, `npm exec -- vitest run --pool=threads --maxWorkers=1`, `npm run build:packages`, and `npm run build -w @ckace/hr-api`.
- Reviewer runs DB steps from `docs/migration/RUN_REHEARSAL.md` and `docs/migration/POST_CUTOVER_EXPORT.md`; use only loopback `ckace_hr_dev`. Do not execute the documented Production example.
- Update evidence with aggregates only and rerun relevant tests if any discrepancy requires a code change.

Evidence/result so far:
- Local code gates: PASS, 121 test files / 857 tests, package builds and API build passed.
- Static exporter model/delegate/timestamp-field check: PASS, 38 timestamped sources matched Prisma DMMF; no missing delegate/time field found.
- PostgreSQL importer/export rehearsal on this worktree: NOT RUN; no `DATABASE_URL` was configured. Reviewer execution remains required.

Owner decision needed: None for the bounded disposable-DEV reviewer rerun. Any real Production export requires separate explicit Owner approval for that exact run; no such operation is authorized by this task.
