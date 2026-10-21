# CKACE_HR — PROJECT PLAN

Last Updated: 2026-10-21 Asia/Bangkok

## Current plan

Primary implementation baseline: `origin/claude/project-thread-j4idbg`

Current TEST baseline: **TESTm67**

Active executor: **Codex Local**

Production: **NO-GO**

## Current objective

Complete the current Owner-directed Local Overview visual review safely, then continue and stabilize the current m67 implementation without reopening obsolete work.

Current focus:

1. establish the exact or best-provable source/revision behind TESTm67;
2. reconcile Local changes against the current implementation branch;
3. preserve useful Local-only work without overwriting tested m67 behavior;
4. select and complete the next concrete m67 correctness/verification item;
5. batch the next TEST build only when there is a meaningful verified change set.

## Current product areas

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
- Current review state: manager 4 cards / employee 3 cards; child cards fill the Today board content height; enlarged card typography verified with no horizontal overflow.
- Git history is the archive.
- Historical material is recovered only when explicitly needed.

## Git / Local rule

- Local-first.
- Preserve uncertain Local work.
- Compare against the current implementation branch before integration.
- Do not use destructive Git cleanup to force synchronization.
- Commit/push only after the Owner confirms at the end of the task.

## Next action

Execute the current Owner Overview review task in `docs/codex/ACTIVE_TASK.md`. Resume m67 reconciliation after Owner acceptance unless a newer Owner direction supersedes it.
