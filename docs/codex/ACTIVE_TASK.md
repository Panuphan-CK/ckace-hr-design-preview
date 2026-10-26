# CKACE HR — ACTIVE TASK

Updated: 2026-10-26 Asia/Bangkok

## PROD-READINESS-05R — Reviewer-run disposable DEV database rehearsal

Status: READY FOR REVIEW RUN — local checks and the sanitized XLSX in-memory pass completed; this worktree has no disposable PostgreSQL database configured.
Priority: P1 — importer and write-freeze code need database-backed evidence before the full-system migration can be considered ready.

Decision context:
The Owner chose full-system GAS-to-CKACE HR cutover; the former Leave-only Option 2 is superseded. For Pending requests, Owner chose B: keep all decided history and create new Pending steps from current target policy. Report changed next approvers for HR review. If no eligible approver exists or the requester is the only candidate, keep the request Pending with an exception; do not skip or auto-approve. Completed requests get no new steps. Pending counts before/after must match. Required cases: stage 1, stage 2, co-approver, resigned approver, requester-only candidate, completed request.

Objective / why now:
Run the prepared XLSX import on a disposable loopback `ckace_hr_dev` database, capture row-accounting and approval-handoff evidence, and exercise backup/restore/reset with elapsed times. Production remains NO-GO.

Scope:
- Reviewer runs `docs/migration/RUN_REHEARSAL.md` from `D:\CKACE_HR\.worktrees\main-integration` on `codex/main-integration`.
- Use only the Owner-supplied sanitized workbooks in `D:\CKACE_HR_snapshot`; keep workbook and DB dump outside Git.
- Before import, provision target role catalog and active Leave/Time Correction/OT/Medical approval policies from an Owner-approved non-Production baseline. Do not infer policy from GAS Agency columns.
- Review pending approver changes and unresolved routes by request/USER ID.
- Record timings and aggregate evidence under `docs/migration/evidence/` with no source cell values.
- Resolve the one conflicting `TimeLog.LogID` group (two source rows) from the sanitized snapshot before accepting a zero-rejection reconciliation. The importer reports both rows with `ATTENDANCE_DUPLICATE_SOURCE_LOG_ID` and imports neither.

Out of scope:
- Root checkout `D:\CKACE_HR`, Project A, live GAS/Sheets/Drive, cloud commands, TEST deployment, Production, R2, real employee notifications, secrets, IAM, or LINE configuration.
- Creating missing business approval rules by guesswork.
- Claiming complete file migration: the sanitized XLSX redacts links and contains no attachment bytes.

Acceptance criteria:
1. Every declared source row has exactly one importer outcome; `unaccountedRows` = 0 for every tab; 0 ambiguous writes; 0 silent drops.
2. Second import creates 0 duplicate target rows; source payload or transform drift is reported rather than overwritten.
3. Source Pending count equals target Pending count exactly; no completed request gains a new step or changes status.
4. Changed next approvers are listed with stable request/USER IDs for HR review; unresolved approver exceptions = 0 before a cutover decision; no self-approval or auto-approval.
5. Exercise stage 1, stage 2 after a decided step, co-approver, resigned approver, requester-only candidate, and completed-request cases.
6. Backup, restore, and reset each complete against only the loopback disposable DB; record seconds and verify pre/post migration counts. Restore/rollback target <=60 minutes for rehearsal; this is not an approved Production SLA.
7. `ACTIVE`/unset keeps TEST write behavior; `READ_ONLY` blocks all API business mutations fail-closed while the explicit migration job remains able to write; invalid mode fails closed.
8. Attachment rows with redacted URLs remain explicit exceptions; no fake file object/checksum is recorded. Notification/LINE history is excluded by the Owner manifest and is not replayed.
9. The local in-memory snapshot run accounts for all 5,269 rows with 0 unaccounted rows, 0 ambiguous writes, 5,232 imported rows, 35 explicit skips, and 2 rejected colliding attendance rows. This is not DB-backed evidence and does not prove target policy routing or Pending parity.

Verification:
- `docs/migration/RUN_REHEARSAL.md` commands and generated import/database evidence.
- Lint, workspace typecheck, full Vitest, package/API build, Prisma validation, and script syntax passed locally; `docs/migration/evidence/sanitized-xlsx-in-memory-20261026.json` records aggregate snapshot evidence.
- Reviewer adds DB-backed import, Pending reconciliation, and timed restore evidence.

Next TASK:
PROD-READINESS-06 — Full-system authority dispatch and close data coverage gaps (attachment bytes, missing module sources/policies, and reverse-replay). Production remains NO-GO.
