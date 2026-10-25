# CKACE_HR — PROJECT PLAN

Last Updated: 2026-10-25 Asia/Bangkok

## One active TASK

**SOURCE-UNIFY-02 — Build and verify unified source on TEST** is ACTIVE, P1. The Owner approved publication of the verified integration to `source/main`; the next release gate awaits a separate `Build` instruction. The dirty primary checkout and protected design artifact remain preserved. Details and acceptance criteria are in `docs/codex/ACTIVE_TASK.md`.

## Current baseline and sequence

1. **Merge/reconcile Local only — verified:** `source/main` at `04c3d54` plus deployed TESTm73 branch at `095e6bd`. Conflict-free; tested Leave/NAV implementation and main-only TEST/UAT endpoint removal retained. Unused preview assets and a dated handoff snapshot excluded from the application candidate.
2. **Verify exact merged candidate — verified with noted limitation:** lint/typecheck PASS; full Vitest 109 files/796 tests PASS; packages/API build PASS; Web build `--webpack` PASS (31/31 pages); Prisma schema validation PASS with dummy URL. Default Local Turbopack build stalled; sandboxed webpack prerender hit `EPERM`, then completed with local build-output write access. These are Local checks, not a new TEST release.
3. **Publish unified source — Owner approved:** commit/push the verified integration explicitly to `source/main` in the application repository. A new TEST build/deploy requires a separate Owner Build instruction and must be verified by commit, revision, traffic, health, and authenticated regression.
4. **Resume Production-readiness gates:** authenticated Employee/SuperAdmin m73 or successor role/NAV checks, full Leave workflow, data migration/reconciliation and backup/restore rehearsal, monitoring/rollback, and final go/no-go. Production remains NO-GO until all current evidence and separate named Owner approval exist.

## Current evidence and limits

- TESTm73 API/Web reached 100% TEST traffic; public API health identified `ckace-hr-api-test-m73`, `stage=test`, `runtime=NON_PRODUCTION`.
- Manager responsive NAV checks passed at 375px/695px; Employee/SuperAdmin m73 browser checks remain NOT VERIFIED by Owner deferral.
- The integration candidate was staged and locally verified in `D:\CKACE_HR\.worktrees\main-integration`. The primary checkout, protected design material, live TEST and Production are untouched. Publication to `source/main` was explicitly approved on 2026-10-25; live TEST remains m73 until a separate Build.
- Seven clean legacy Local worktrees were removed on 2026-10-25; one stale registration for a missing checkout was pruned. Git branches remain. The current integration and TESTm73 worktrees remain available.
- No new TEST release or Production approval is inferred from this plan.

## Next decision

Await a separate Owner `Build` instruction for TEST on the published unified commit. Production release choice (code-only LEGACY authority versus Leave cutover) remains a distinct Owner decision.
