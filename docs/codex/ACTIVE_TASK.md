# CKACE HR — ACTIVE TASK

Updated: 2026-10-26 Asia/Bangkok

## PROD-READINESS-08 — Implement full-system authority and rollback gates

Status: READY — DEV/TEST implementation and verification only.
Priority: P1 — the current routing context is not a universal module dispatcher, and reverse replay is not implemented or proven. These are blockers to a safe full-system cutover.

Objective / why now:
Implement and prove a fail-closed whole-system `LEGACY` / `FROZEN` / `NEW` authority mechanism and a recoverable rollback ledger for every module and side-effect worker, using synthetic or disposable DEV/TEST data. Production remains NO-GO.

Scope:
- Inspect all API controllers/services, scheduled jobs, notification senders, LIFF entry paths, and module route guards before changing architecture.
- Define one system-level authority state; require writes to fail closed during `FROZEN`; keep current DEV/TEST defaults unchanged.
- Cover all reads/writes and background workers with route/permission/write-freeze tests. Migration-job exception remains restricted to the existing guarded local DEV target.
- Build a testable post-cutover change ledger/export and rollback/replay contract with idempotency, ordering, and audit evidence for each in-scope module.
- Exercise synthetic rollback and verify zero lost/duplicated mutations and bounded restore/reconciliation time.

Out of scope:
- Root checkout `D:\CKACE_HR`, Project A source/config, live GAS or Sheets/Drive, cloud commands, Production, deploy, Production resources/secrets/IAM, traffic/DNS/Firebase, LINE Production config, employee notifications, or real user data.
- Claiming a real GAS reverse writer or Production rollback is proven without a separately approved and independently rehearsed integration.

Acceptance criteria:
1. Every API route, controller/service write path, job, notification side effect, and LIFF mutation path has an explicit authority decision; uncovered paths = **0**.
2. `FROZEN` rejects **100%** of user/business writes and side effects; only the authorized local migration job retains its narrow guarded write path.
3. `LEGACY` and `NEW` route every in-scope module consistently; mixed authority and unknown states fail closed.
4. Synthetic rollback ledger records every post-cutover mutation with stable idempotency keys and produces a deterministic replay/export plan for all modules.
5. Rehearsal replays **100%** of synthetic changes with **0** lost, duplicated, reordered, or unowned writes; recovery completes within **60 minutes** and RPO is **0**.
6. Existing TEST behavior is unchanged when the switch is unset/default; all mode transitions and failure cases have automated tests.
7. No Production or Project A operation occurs.

Verification:
- Full lint, typecheck, Vitest suite, API build, route/worker coverage report, and synthetic freeze/replay evidence.
- Use only local/in-memory or disposable DEV/TEST stores; keep credentials and real employee data outside Git.

Owner decision needed before implementation: None for local discovery and a synthetic DEV/TEST contract. Any behavior that changes user permissions or actual legacy integration must be presented for Owner decision before enabling it.

Production remains NO-GO and requires separate named Owner approval for each Production action.
