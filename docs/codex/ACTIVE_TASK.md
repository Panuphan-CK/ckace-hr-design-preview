# CKACE HR — ACTIVE TASK

Updated: 2026-10-26 Asia/Bangkok

## PROD-READINESS-06R — Verify TESTm74 policy baseline and rerun updated DEV rehearsal

Status: WAITING FOR OWNER-SUPPLIED SANITIZED POLICY EXPORT — local implementation and automated coverage are ready; exact mutable TESTm74 policy rows are absent from the repository.
Priority: P1 — the migration seeder must use the actual active policy table, and the reviewer must rerun database reconciliation after the approved LogID exception change.

Objective / why now:
Capture the actual TESTm74 approval-policy configuration without guessing, seed the disposable loopback `ckace_hr_dev` rehearsal database, then rerun the updated importer, idempotency, pending handoff, and timed backup/restore/reset evidence. Production remains NO-GO.

Owner input required:
- Provide an external sanitized JSON export of TESTm74 active approval policies from revision `1322ed48e98428ffd580a6ec2e8bb7cdec5132c7` (request kind, policy name, global or agency stable ID, active state, ordered role/scope steps, capture time). Do not include employees, request rows, credentials, or secrets.
- Keep the export and database dump outside Git. The repository has no checked-in policy seeds; reviewer-created temporary global policies are not evidence of TESTm74 values.

Scope:
- Use only `docs/migration/RUN_REHEARSAL.md` on `codex/main-integration`, sanitized Owner workbooks, and a disposable loopback `ckace_hr_dev` database.
- Run the policy seeder only after the supplied baseline is checked against TESTm74 and the schema is migrated.
- Rerun import/reconcile after the approved `LOG-001112` cross-employee composite identity handling; verify two named exception imports and same-employee duplicate rejection.
- Recheck LEV-0109 remains Pending with the HR close-out exception and all source/target Pending counts match.
- Rerun idempotent import, backup/restore/reset timings, and record aggregate evidence without source cell values.

Out of scope:
- Root checkout `D:\CKACE_HR`, Project A, live GAS/Sheets/Drive, cloud commands, Production, deploy, real notifications, credential/IAM changes, or R2 upload.
- Treating reviewer-created rehearsal policies as TESTm74 truth or auto-approving/closing any request.

Acceptance criteria:
1. The supplied policy baseline identifies the verified revision and accounts for every active TESTm74 policy without flattening scoped rules.
2. Role and policy seeding is idempotent, never overwrites conflict, and writes only to the loopback `ckace_hr_dev` database with DEV + READ_ONLY + migration-job guards.
3. Every source row has exactly one outcome; zero unaccounted rows, zero ambiguous writes, and all named exceptions are dispositioned.
4. Distinct-employee repeated LogID rows import under `(LogID, UserID)` provenance; same-employee repeats remain rejected.
5. Pending source and target counts match exactly; LEV-0109 remains an HR close-out exception; no completed request changes status or gains a step.
6. The second import adds zero duplicate rows. Backup, restore, and reset complete on the disposable DB and record elapsed seconds.
7. No attachment upload is performed in this task; the separate copy tool remains dry-run by default.

Verification:
- Full lint, typecheck, Vitest suite, API build, script syntax checks.
- Reviewer output and aggregate evidence under `docs/migration/evidence/`; keep all XLSX and database dumps outside Git.

Production remains NO-GO and requires separate named Owner approval for each Production action.
