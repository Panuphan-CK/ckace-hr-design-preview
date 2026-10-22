# CKACE_HR — PROJECT PLAN

Last Updated: 2026-10-22 Asia/Bangkok

## Current plan

Primary implementation baseline: `origin/claude/project-thread-j4idbg`

Current TEST baseline: **TESTm67**

Active executor: **Codex Local**

Production: **NO-GO**

## Current objective

Reconcile and stabilize the current m67 implementation without reopening obsolete work or overwriting preserved Local changes.

Current focus:

1. use the live TEST health response and Claude release lineage to establish the best-provable TESTm67 application baseline;
2. reconcile Local changes against `origin/main` and `origin/claude/project-thread-j4idbg` without destructive Git operations;
3. preserve protected design work and Local-only/uncertain implementation until provenance is clear;
4. verify the post-m67 numeric Excel-hours fix as the first candidate correctness item;
5. batch the next TEST build only after a meaningful Local change set is verified and the Owner requests a build.

## Verified intake — 2026-10-22

- Live TEST API health reports `ckace-hr-api-test-m67`.
- Latest observed remote refs: `origin/main` = `f1ca9d2`; Claude baseline = `5a29241`.
- Local `main` is at `ce7c06d` (design work), ahead 1 / behind 22 versus `origin/main`, with preserved dirty/untracked work. The authenticated TEST verification session made no commit/push.
- Protected design work has advanced separately; preserve its current files and do not reuse stale intake file-match counts.
- The m67 release-support commits from `4bf201b` through `b72f93f` change only the TEST release pipeline; the runtime application tree is unchanged from `2d6fff7` across that range.
- `5a29241` is a later management-report Excel-hours fix and is not assumed to be on TESTm67.
- No direct merge/reset/cleanup is safe until the remaining Local-only source changes have been classified.
- M67-R1 completed the intake/provenance gate without changing application source. A clean isolated worktree now tracks Claude tip `5a29241`.
- M67-R2 passed at Claude tip: focused management-report workbook test 5/5, lint, typecheck, and full tests (110 files / 821 tests). The worktree remained source-clean.
- The first typecheck attempt was invalid because a temporary shared dependency junction resolved `@ckace/*` packages from dirty Local `main`; isolated `npm ci` plus Prisma generation removed that contamination and typecheck passed.
- M67-R3 passed: Prisma schema validation succeeded with a non-secret Local dummy URL, the full monorepo build succeeded, Next.js produced 31 static routes, and the isolated worktree remained source-clean.

## Current TEST verification result

- Authenticated TEST remains m67. OT threshold hints honor saved HR thresholds and the exact boundary. Meal threshold was restored to 20:00 (50 THB); transport remains 21:30.
- Attendance-policy save/persistence and holiday-description save/refresh passed. Every temporary settings change was restored and verified after reload. Radius remains 0.1 km.
- NEWTEST is currently inactive with no selected roles and SELF scope. Approval policies are active for all four modules; no role/approval mutation was performed.
- Attendance Excel decimal hours are numeric already. TEST uses General format and exposes a floating-point total; Claude candidate adds `0.00` formatting while keeping values numeric. Batch this into the next Owner-requested TEST build.
- GPS, actual access/approval-chain changes and scoped announcement publishing remain outside the verified coverage. No urgent blocker was found in the exercised paths.

## Product coverage

| Area | Status |
|---|---|
| Core backend / DB / auth / RBAC / audit | Mature TEST implementation |
| Leave / OT / Attendance / Time Correction / Medical | Mature TEST implementation |
| Approval / workflow revision | Implemented and TEST exercised |
| Notifications | TEST implementation exercised |
| Reports / Excel | Current correctness/verification area |
| HR settings | Current correctness/verification area |
| Web LIFF | Existing CKACE_HR implementation; verify against current API/auth contracts |
| TEST | **TESTm67 — Owner-confirmed** |
| Production | **NO-GO** |

## Active task

The only active task is stored in `docs/codex/ACTIVE_TASK.md`.

Do not keep completed tasks, old task queues, old design tracks, or superseded plans in the working tree.

## Documentation retention rule

- Active docs contain current truth only.
- Completed/superseded task documents are removed from the working tree.
- `docs/design/desktop-20261018/**` is a protected current design artifact and is excluded from cleanup unless the Owner explicitly asks to remove or replace it.
- Current review state: manager 4 cards / employee 3 cards; child cards fill the Today board content height; English-first headings (12px) with smaller Thai labels (10px), and labels APPROVE/งานอนุมัติ, REQUESTS, LEAVE, OVERTIME. Current UXUI PRO-B extends the toned-card language across all four cards, adds 3px accent strips and left-icon halos, uses equal aligned top-right badge icons, and gives APPROVE/REQUESTS four color-coded 2×2 mini metrics with top accents but no mini-card icons. LEAVE/OVERTIME use the same 9px icon-to-title spacing as REQUESTS. The pre-B liked alternate is recoverable from lnwjud checkpoint `607a04c0-8b4a-4470-8e67-c988b3de46d3`.
- Git history is the archive.
- Historical material is recovered only when explicitly needed.

## Git / Local rule

- Local-first.
- Preserve uncertain Local work.
- Compare against the current implementation branch before integration.
- Do not use destructive Git cleanup to force synchronization.
- Commit/push only after the Owner confirms at the end of the task.

## Next action

Execute `M67-R5` in `docs/codex/ACTIVE_TASK.md`: gather TEST API/Web deployment provenance and prepare a concrete next-release/rollback plan. Owner clarified that TEST settings/data changes need not be restored automatically; record changes and retain useful test state. Destructive actions, security-sensitive access expansion and Production remain separately gated. Do not deploy until the Owner explicitly requests a TEST build.
