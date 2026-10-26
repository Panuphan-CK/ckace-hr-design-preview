# CKACE_HR — PROJECT PLAN

Last Updated: 2026-10-26 Asia/Bangkok

## One active TASK

**PROD-READINESS-01 — Read-only Production readiness gap assessment** is ACTIVE, P1. The TESTm74 authenticated Leave and role/NAV/direct-URL/responsive gate passed for its navigation/render scope. Production is still NO-GO; the next step is to assemble readiness evidence and Owner decisions from Local sources only. Details and acceptance criteria are in `docs/codex/ACTIVE_TASK.md`.

## Current baseline and sequence

1. **Merge/reconcile Local only — verified:** `source/main` at `04c3d54` plus deployed TESTm73 branch at `095e6bd`. Conflict-free; tested Leave/NAV implementation and main-only TEST/UAT endpoint removal retained. Unused preview assets and a dated handoff snapshot excluded from the application candidate.
2. **Verify exact merged candidate — verified with noted limitation:** lint/typecheck PASS; full Vitest 109 files/796 tests PASS; packages/API build PASS; Web build `--webpack` PASS (31/31 pages); Prisma schema validation PASS with dummy URL. Default Local Turbopack build stalled; sandboxed webpack prerender hit `EPERM`, then completed with local build-output write access. These are Local checks, not a new TEST release.
3. **Publish and build unified source — verified:** merge commit `1322ed4` was pushed to application `source/main`. The Owner separately instructed `Build`; Cloud Build `3830ed94-07c4-49b5-a7e3-adaa073abd48` released TESTm74 from that exact SHA. All pipeline steps passed; API/Web traffic and health, plus Firebase Hosting live release, were independently checked.
4. **Complete hosted functional gate — PASS for navigation/render scope:** TESTm74 Leave `LEV-0024` passed Employee submission, Manager step 1, SuperAdmin step 2, and Employee final-state/notification verification. Employee direct role denials, Manager permission boundaries, SuperAdmin allowed routes, all checked role NAV destinations, five report routes, and responsive checks at 390 px rendered with no checked horizontal overflow. Non-Leave forms were navigated/rendered but their business transactions were not submitted.
5. **Read-only Production readiness assessment — ACTIVE:** map data authority, migration/reconciliation, backup/restore, monitoring, rollback, and operational acceptance evidence using Local sources only; identify material Owner decisions. No Production access or changes.
6. **Production readiness gates — NOT VERIFIED:** data migration/reconciliation and backup/restore rehearsal, monitoring/rollback, and final go/no-go. Production remains NO-GO until current evidence is complete and separate named Owner approval exists.

## Current evidence and limits

- TESTm74 API/Web each reached 100% traffic. Public API health identified `ckace-hr-api-test-m74`, `stage=test`, `runtime=NON_PRODUCTION`; Firebase Hosting live release message is `CKACE HR TEST m74`; `/desktop` returned 200.
- Local typecheck and Vitest (109 files / 796 tests) passed. Cloud Build verify, image build/push, TEST migration job, and deployment verification all succeeded for commit `1322ed4`.
- Authenticated m74 Leave workflow passed for `LEV-0024`, with both approvers and comments visible in Employee detail. Employee and Manager NAV/role checks, plus SuperAdmin NAV destinations including five reports and all 12 HR Settings links, have hosted evidence. Direct role boundaries were confirmed. At 390 px, checked employee/manager/SuperAdmin navigation and surfaces showed no document-level horizontal overflow; Platform Settings measured `innerWidth=390`, `scrollWidth=386`. The gate covers navigation/render and core Leave, not transactions in every non-Leave module. The earlier Browser timeout was a tooling interruption, not an observed application failure.
- The primary checkout, protected design material, and Production were untouched. The integration worktree remains available at `D:\CKACE_HR\.worktrees\main-integration`.
- Seven clean legacy Local worktrees were removed on 2026-10-25; one stale registration for a missing checkout was pruned. Git branches remain. The current integration and TESTm73 worktrees remain available.
- No new TEST release or Production approval is inferred from this plan.

## Next decision

Start the read-only Production readiness assessment using Local repository evidence. Present material decisions such as code-only LEGACY authority versus Leave cutover only after the data paths and constraints are evidenced. Production remains NO-GO until readiness evidence and separate Owner approval are complete.