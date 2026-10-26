# CKACE_HR — PROJECT PLAN

Last Updated: 2026-10-26 Asia/Bangkok

## One active TASK

**PROD-READINESS-02 — Confirm initial Production data authority and cutover boundary** is ACTIVE, P1, awaiting the Owner decision. The Local-only readiness gap assessment is complete; the next plan depends on whether all modules remain LEGACY or Leave is the sole NEW authority. Production remains NO-GO.

## Current baseline and sequence

1. **Merge/reconcile Local only — verified:** `source/main` at `04c3d54` plus deployed TESTm73 branch at `095e6bd`. Conflict-free; tested Leave/NAV implementation and main-only TEST/UAT endpoint removal retained. Unused preview assets and a dated handoff snapshot excluded from the application candidate.
2. **Verify exact merged candidate — verified with noted limitation:** lint/typecheck PASS; full Vitest 109 files/796 tests PASS; packages/API build PASS; Web build `--webpack` PASS (31/31 pages); Prisma schema validation PASS with dummy URL. Default Local Turbopack build stalled; sandboxed webpack prerender hit `EPERM`, then completed with local build-output write access. These are Local checks, not a new TEST release.
3. **Publish and build unified source — verified:** merge commit `1322ed4` was pushed to application `source/main`. The Owner separately instructed `Build`; Cloud Build `3830ed94-07c4-49b5-a7e3-adaa073abd48` released TESTm74 from that exact SHA. All pipeline steps passed; API/Web traffic and health, plus Firebase Hosting live release, were independently checked.
4. **Complete hosted functional gate — PASS for navigation/render scope:** TESTm74 Leave `LEV-0024` passed Employee submission, Manager step 1, SuperAdmin step 2, and Employee final-state/notification verification. Employee direct role denials, Manager permission boundaries, SuperAdmin allowed routes, all checked role NAV destinations, five report routes, and responsive checks at 390 px rendered with no checked horizontal overflow. Non-Leave forms were navigated/rendered but their business transactions were not submitted.
5. **Read-only Production readiness assessment — PASS (Local evidence only):** code-level runtime isolation and bounded-cutover guards exist; migration/reconciliation framework and a DEV-only database rehearsal implementation exist. Actual Production provisioning, data import/reconciliation, attachment copy, backup/restore, monitoring, and rollback evidence are NOT VERIFIED. No Production systems were accessed.
6. **Confirm initial authority boundary — ACTIVE, Owner decision pending:** choose all modules on LEGACY for an initial code-only release or a bounded Leave-only NEW cutover. The choice changes data migration, recovery, and acceptance criteria. This is not deploy approval.
7. **Production readiness gates — NOT VERIFIED:** after the authority choice, prove the selected path's data reconciliation, backup/restore, monitoring, rollback, and operational acceptance; Production remains NO-GO until evidence and separate named approval exist.

## Current evidence and limits

- TESTm74 API/Web each reached 100% traffic. Public API health identified `ckace-hr-api-test-m74`, `stage=test`, `runtime=NON_PRODUCTION`; Firebase Hosting live release message is `CKACE HR TEST m74`; `/desktop` returned 200.
- Production code requires the dedicated `ckace_hr_prod` database, `ckace-hr-prod-private` bucket, and runtime environment dependencies; these are code guards only. `firebase.prod.json` describes Production site/service routing, while `infra/cloudbuild/` contains TEST release automation but no Production release/rollback proof. External trigger state was not inspected.
- Cutover evidence code requires write freeze, matching delta import reports, module reconciliation, and runtime verification, and labels generated evidence `DEV_TEST_EVIDENCE_ONLY` with `productionMutationAuthorized: false`. The M8 snapshot/recovery implementation is restricted to `ckace_hr_dev`; current code/tests do not prove a completed Production backup/restore rehearsal.
- `/health` exposes runtime metadata and `/ready` probes PostgreSQL; local deployment sources do not evidence alerting/SLOs. No test or cloud command was run for this read-only assessment.
- Guidance files `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, and `docs/codex/DECISION_LOG.md` still state TESTm67/m67, conflicting with current Owner-confirmed m74 continuity. They were left unchanged.
- Local typecheck and Vitest (109 files / 796 tests) passed. Cloud Build verify, image build/push, TEST migration job, and deployment verification all succeeded for commit `1322ed4`.
- Authenticated m74 Leave workflow passed for `LEV-0024`, with both approvers and comments visible in Employee detail. Employee and Manager NAV/role checks, plus SuperAdmin NAV destinations including five reports and all 12 HR Settings links, have hosted evidence. Direct role boundaries were confirmed. At 390 px, checked employee/manager/SuperAdmin navigation and surfaces showed no document-level horizontal overflow; Platform Settings measured `innerWidth=390`, `scrollWidth=386`. The gate covers navigation/render and core Leave, not transactions in every non-Leave module. The earlier Browser timeout was a tooling interruption, not an observed application failure.
- The primary checkout, protected design material, and Production were untouched. The integration worktree remains available at `D:\CKACE_HR\.worktrees\main-integration`.
- Seven clean legacy Local worktrees were removed on 2026-10-25; one stale registration for a missing checkout was pruned. Git branches remain. The current integration and TESTm73 worktrees remain available.
- No new TEST release or Production approval is inferred from this plan.

## Next decision

Owner decision required: choose (1) code-only initial Production operation with all modules READ/WRITE on LEGACY, or (2) bounded Leave-only cutover with LEAVE_READ/LEAVE_WRITE on NEW and other modules LEGACY. Recommendation: option 1 temporarily if the goal is code enablement without moving data; option 2 if new Leave data must be authoritative from the first release, after its import/reconciliation and recovery evidence passes. Neither choice authorizes a Production deploy.
