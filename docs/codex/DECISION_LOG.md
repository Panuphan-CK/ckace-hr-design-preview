# CKACE HR — Active Decisions

Updated: 2026-10-26 Asia/Bangkok

## Current implementation and TEST authority

- Codex Local is the active executor.
- The verified application baseline is source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7, released as TESTm74.
- The active continuation branch is codex/main-integration; application publication uses the explicitly named source remote.
- Production remains NO-GO until all readiness gates pass and the Owner separately approves a named Production action.

## Owner decision PROD-READINESS-02 — Bounded Leave cutover

Owner selected Option 2 on 2026-10-26:

- LEAVE_READ and LEAVE_WRITE will be the only module routes assigned to NEW.
- All other module routes, including IDENTITY, remain on LEGACY.
- The target outcome is to migrate the Leave-related data from APP_LEAVE_GAS and continue the current Leave workflow in CKACE HR.
- This is a planning/data-authority decision only. It does not authorize Production access, resource creation, data mutation, deployment, traffic changes, LINE configuration changes, or cutover execution.

The production route must remain a paired bounded state: CKACE_PRODUCTION_CUTOVER_MODULE=LEAVE, with LEAVE_READ=NEW and LEAVE_WRITE=NEW and every other module route=LEGACY. The global CKACE_MODULE_ROUTING runtime guard remains LEGACY; the per-module state is configured separately.

## Production safety and data boundaries

- No Project A/APP_LEAVE_GAS repository or live data was inspected for this plan.
- No Production resource, database, credential, Cloud setting, endpoint, or traffic was accessed.
- Current cutover acceptance numbers are proposed rehearsal targets only. The Owner must approve the freeze and recovery limits before any Production action.
- Production actions require separate explicit approval, including Production database/bucket provisioning, credentials, routing, DNS/Firebase, LINE, migration, and rollback.
- Secrets must be configured through the approved secret-management process and never sent in chat.
- Keep one active task in docs/codex/ACTIVE_TASK.md; Git history is the archive.