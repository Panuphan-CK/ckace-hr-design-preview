# CKACE HR — ACTIVE TASK

Updated: 2026-10-26 Asia/Bangkok

## PROD-READINESS-10 — Reviewer rerun post-cutover JSON + HR XLSX export

Status: WAITING FOR REVIEWER — local export fixes and code verification passed. Reviewer validation is limited to disposable loopback PostgreSQL `ckace_hr_dev`. Production remains NO-GO.

Priority: P1 — the prior reviewer run exposed a Prisma `orderBy` mismatch and showed JSON alone is not usable for HR manual re-entry. The corrected query map and paired HR workbook need a DB-backed reviewer rerun.

Objective / why now:
Prove the post-cutover export against a disposable loopback PostgreSQL database and confirm HR can use the companion workbook's legacy identifiers and business fields for manual re-entry.

Scope:
- Rerun the exporter against loopback `ckace_hr_dev` only, with `CKACE_SYSTEM_WRITE_MODE=READ_ONLY` and database-name attestation.
- Confirm a JSON file and its `.hr.xlsx` companion are both created outside all Git checkouts without overwriting existing outputs.
- Review module totals, HR workbook summary counts, legacy employee/request IDs, Thai headers, Buddhist dates, approval history, and the exact post-cutover change notes.
- Confirm the workbook has no UUID values; retain both output files outside Git and record aggregate evidence only.

Out of scope:
- Production or any non-loopback database, cloud commands, deploy, traffic/DNS/Firebase/LINE changes, Project A, root checkout `D:\CKACE_HR`, production credentials/IAM/secrets, or real employee data access.
- Importer changes, reverse replay, or automated GAS writes. A forced fallback remains manual HR re-entry after separate Owner approval.

Acceptance criteria:
1. Prisma DMMF coverage validates each configured model delegate, order key, timestamp, lookup, parent, and attachment field; every `orderBy` is the model's actual primary key.
2. Reviewer run completes against loopback `ckace_hr_dev`; the database attestation matches, the transaction is read-only, and the exporter creates both JSON and HR XLSX outputs.
3. Both output paths are outside every Git checkout and pre-existing files are never overwritten; a failed second-file write does not leave a misleading partial pair.
4. The workbook has one summary sheet and five Thai business sheets, contains legacy IDs/names/status/amounts or durations/approver steps/change notes as available, formats dates in Buddhist `DD/MM/YYYY`, and contains no UUID values.
5. Reviewer checks summary counts against JSON module records and confirms the workbook can identify post-marker rows for manual GAS key-back; exceptions/missing legacy IDs are listed for HR review.
6. No workbook, export, marker, dump, secret, Production access, or Production operation enters this worktree.

Verification:
- Codex: lint, workspace typecheck, full Vitest suite, package builds, API build, migration script syntax, targeted synthetic XLSX test, and Prisma DMMF test.
- Reviewer: use only loopback `ckace_hr_dev` and the DEV instructions in `docs/migration/POST_CUTOVER_EXPORT.md`; do not execute its Production example.
- Retain aggregate numeric evidence only. Keep JSON, workbook, marker, and database dump outside Git.

Evidence/result so far:
- Owner reports prior sanitized import rehearsal passed: 5,234 imported, 35 skipped, 0 rejected/unaccounted, pending 1=1, and only the approved LEV-0109 changed-next-approver outcome remained.
- Reviewer reports the previous PostgreSQL exporter failed because `OvertimeAllowancePolicy` has primary key `kind`, not `id`; a temporary reviewer fix exported JSON with zero new and one changed Leave row, but JSON exposed internal UUIDs only.
- Local fix sets real primary-key ordering for non-`id` delegates and adds a Prisma DMMF regression test across every exporter/workbook source.
- Local synthetic workbook test covers five Thai business sheets, summary counts, legacy IDs/names, Buddhist dates, approvals, amounts/hours, change notes, and no UUIDs.
- Local verification: `npm run lint` passed; workspace typecheck passed; full Vitest passed (122 files / 862 tests); package builds and API build passed; direct lint of all changed migration scripts passed; synthetic exporter/workbook tests passed (2 files / 13 tests).
- DB-backed rerun of JSON + XLSX: NOT RUN by Codex; reviewer must run it on disposable loopback `ckace_hr_dev`.

Owner decision needed: None for the bounded disposable-DEV reviewer rerun. Any real Production export requires separate explicit Owner approval for that exact run; no such operation is authorized by this task.
