# CKACE HR — ACTIVE TASK

Updated: 2026-10-26 Asia/Bangkok

## PROD-READINESS-12 — Reviewer rerun Decimal-safe JSON + Thai HR XLSX export

Status: WAITING FOR REVIEWER — local fixes and verification passed. Reviewer validation is limited to disposable loopback PostgreSQL `ckace_hr_dev`. Production remains NO-GO.

Priority: P1 — reviewer confirmed the JSON/XLSX pair and module row counts on PostgreSQL, then exposed Prisma.Decimal serialization and Thai-label gaps that synthetic plain-number tests had missed.

Objective / why now:
Confirm that a DB-backed export preserves every Prisma Decimal as a precision-safe JSON string, displays medical amounts as numeric XLSX cells, and uses the same Thai business labels as the employee-facing UI.

Scope:
- Reviewer reruns the exporter against loopback `ckace_hr_dev` only, with `CKACE_SYSTEM_WRITE_MODE=READ_ONLY` and database-name attestation.
- Confirm a JSON file and its `.hr.xlsx` companion are generated from the same read-only snapshot, outside all Git checkouts, with exclusive creation and no partial pair on failure.
- Validate all seven Decimal fields in JSON, numeric/2-decimal medical amount cells, shared Thai leave-type/status/approval/duration labels, legacy keys, Buddhist dates, and no workbook UUIDs.
- Retain aggregate numeric evidence only; keep export, marker, and database dump outside Git.

Out of scope:
- Production or any non-loopback database, cloud commands, deploy, traffic/DNS/Firebase/LINE changes, Project A, root checkout `D:\CKACE_HR`, production credentials/IAM/secrets, or real employee data access.
- Importer changes, reverse replay, or automated GAS writes. A forced fallback remains manual HR re-entry after separate Owner approval.

Acceptance criteria:
1. Prisma DMMF coverage validates all export delegates/fields/order keys and verifies that the seven schema Decimal fields are covered by explicit precision scales.
2. All seven actual `Prisma.Decimal` values serialize to fixed-scale strings in JSON; medical `amount` is a numeric XLSX cell formatted to two decimal places.
3. Workbook status, approval result, leave type, and duration labels are Thai and shared with the relevant UI labels; special leave types retain the configured Thai name.
4. Reviewer confirms loopback read-only attestation, paired outputs, exact per-module JSON/XLSX counts, post-marker inclusion only, legacy identifiers, Buddhist dates, and no UUID values.
5. Existing files are never overwritten; both outputs remain outside every Git checkout; no workbook, export, marker, dump, or secrets enter this worktree.

Verification:
- Codex: lint, workspace typecheck, full Vitest suite, package builds, API build, direct ESLint for changed migration scripts, and Decimal/DMMF/UI-label synthetic tests.
- Reviewer: use only loopback `ckace_hr_dev` and the DEV instructions in `docs/migration/POST_CUTOVER_EXPORT.md`; do not execute its Production example.
- Retain aggregate numeric evidence only. Keep JSON, workbook, marker, and database dump outside Git.

Evidence/result so far:
- Reviewer report for `558790a`: sanitized import 5,234 imported / 35 skipped / 0 rejected, source/target Pending 1/1; backup/restore/reset 0.44/0.59/0.58 seconds. Marker-immediate export contained 0 records and created the paired files with mode 0600 outside Git.
- Post-marker workbook counts matched JSON; workbook contained 0 UUIDs and used legacy identifiers/Buddhist dates. Reviewer found the medical Decimal amount blank in XLSX and represented as Prisma internals in JSON.
- PROD-READINESS-11 converts all seven schema Decimal fields to fixed-scale strings, covers actual Prisma.Decimal instances and XLSX numeric formatting in tests, and centralizes Thai labels while preserving the Leave page's existing wording.
- Local verification passed: lint, workspace typecheck, full Vitest (123 files / 866 tests), package builds, API build, and direct migration-script lint. The default Vitest pool failed with Windows temporary-file ENOENT; rerunning with worker threads passed.
- Codex did not connect to any database. Reviewer rerun after these fixes is pending on disposable loopback `ckace_hr_dev` only.

Owner decision needed: None for the bounded disposable-DEV reviewer rerun. Any real Production export requires separate explicit Owner approval for that exact run; no such operation is authorized by this task.

Next TASK: If reviewer verification passes, proceed to the remaining attachment-byte recovery and Production infrastructure readiness gaps. Production remains NO-GO.
