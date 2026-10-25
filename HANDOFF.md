# CKACE_HR — HANDOFF

Last Updated: 2026-10-25 Asia/Bangkok

## Current state

- Active executor: Codex Local. Application remote: `source` (`Panuphan-CK/ckace-hr`). Design-preview remote: `origin` (`Panuphan-CK/ckace-hr-design-preview`). Do not mix publication lanes.
- Owner-confirmed live TEST baseline: **TESTm73** from `codex/web-leave-06-nav-a11y` commit `095e6bd`. Cloud Build `1bd14bc2-86f0-4f3a-8561-5da2d8dd7775` built/deployed it; API/Web TEST traffic was verified at 100%, public health reported `stage=test`, `runtime=NON_PRODUCTION`, and `serviceRevision=ckace-hr-api-test-m73`.
- Prior candidate gates: lint and workspace typecheck PASS; full Vitest PASS (112 files / 833 tests via `vmThreads`). Local package/API build PASS, but local Next.js optimized build stalled; Cloud Build Web image succeeded on the exact deployed SHA. Do not call Local full build PASS.
- Manager responsive NAV checks passed on TESTm73 at 375px/695px. Employee/SuperAdmin m73 checks were deferred by Owner and are NOT VERIFIED. Earlier TESTm72 role/direct-URL matrix remains recorded evidence, not a substitute for m73 checks.
- Production remains **NO-GO**. No current proof yet for dedicated Production provisioning, data import/reconciliation, backup/recovery, monitoring, rollback drill, or source-of-truth switch. A named Owner approval is required for any Production action.

## Unified application source and next TEST gate

- The Owner approved publication of the verified integration to `source/main` on 2026-10-25. The next active TASK is `SOURCE-UNIFY-02` in `docs/codex/ACTIVE_TASK.md`: build that exact commit on TEST only after a separate Owner `Build` instruction.
- `source/main` at `04c3d54` and TESTm73 branch at `095e6bd` diverged. Main-only app/package/infra history is cleanup commit `bdb13a0`; it removes obsolete TEST/UAT controllers and legacy artifacts. TESTm73 carries newer Leave/NAV/functionality.
- An isolated worktree `D:\CKACE_HR\.worktrees\main-integration` was created from `source/main`. A no-commit merge of the TESTm73 branch is now conflict-free and locally verified. Five Web and three continuity-file conflicts were resolved; TESTm73 page implementations and main-only removal of obsolete TEST/UAT controllers were retained. Continuity uses the current active-only format.
- Unused `apps/web/public/react-read/**` preview assets and dated `docs/HANDOFF_20261021.md` were excluded from the application candidate; originals remain recoverable in the TESTm73 branch/Git history. The protected current design artifact is unchanged.
- The merged permission-catalog test no longer reads the removed historical Production manifest. Its 48-key catalog is a test-only contract, not a runtime role grant. Targeted test passed. Full merged checks passed: lint, workspace typecheck, Vitest 109 files/796 tests, packages/API build, Web production build with `--webpack` (31/31 pages), and Prisma validation with a dummy Local URL. Default Turbopack build stalled locally; sandboxed webpack prerender first hit `EPERM`, then passed with local build-output write access.
- The primary `D:\CKACE_HR` checkout has extensive dirty/untracked Local work of uncertain provenance; it is untouched. The protected design artifact `D:\CKACE_HR\docs\design\desktop-20261018\**` remains untouched.
- Publication of the locally verified integration to `source/main` was explicitly authorized by the Owner. Live TEST remains m73 until a separate Build instruction and release verification. No Production action is authorized.
- Owner-requested Local housekeeping on 2026-10-25 removed seven clean legacy worktrees with `git worktree remove` and pruned one already missing checkout registration. Branch refs remain. The dirty primary checkout, `main-integration`, `m72-nav-a11y`, and protected design files remain intact.

## Immediate next action

Await the Owner's separate `Build` instruction. Then build the published unified commit on TEST and verify API/Web revision, 100% traffic, public health, and authenticated Leave/NAV regression. Continue Production readiness only after that evidence; Production remains NO-GO.

## Safety rules

Preserve uncertain Local work. Do not reset, clean, stash, discard or force-push it. Do not inspect Project A without explicit Owner direction. Do not touch Production, Secret Manager, IAM, gateways, project settings or protected design material without the required approval. Git history is the archive; keep only one active task in the working tree.
