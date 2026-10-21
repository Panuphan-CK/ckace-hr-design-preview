# CKACE_HR — PROJECT PLAN

Last Updated: 2026-10-21 Asia/Bangkok

## Planning authority

- **Latest Owner-confirmed TEST baseline: TESTm67**
- **Active implementation: TASK-39.9 — Desktop full redesign**
- Project A / APP_Leave is retired from active planning.
- Production remains NO-GO.
- Historical M/WD/TASK documents remain evidence only unless explicitly reactivated.
- **Development mode: Codex Local only, using CKACE HR Codex Lead Mode. Claude is paused.**

## Current state

| Area | Status |
|---|---|
| Core architecture / backend foundation | PASS / mature TEST implementation |
| Identity / Auth / RBAC / Audit | PASS |
| Database / Prisma / Neon / R2 foundation | PASS |
| Leave / OT / Attendance / Time Correction / Medical | Mature TEST-stage implementation |
| Approval / Delegation / Revision / Withdrawal | Implemented |
| Notifications / reminders | Implemented |
| Management / policy administration | Implemented in current platform track |
| TEST environment | **TESTm67 — Owner-confirmed current baseline** |
| Desktop redesign | **TASK-39.9 — IN PROGRESS** |
| Local dirty-tree provenance classification | **TASK-CX.1 PASS** |
| Exact TESTm67 source/deployment lineage | **TASK-CX.2 PLANNED — P1** |
| Production Readiness | TASK-40 — NOT STARTED |
| Production Go / No-Go | TASK-41 — NOT STARTED |

## Superseded Desktop tracks

TASK-39.5, TASK-39.6, TASK-39.7 and TASK-39.8 are historical Desktop/parity tracks. TASK-39.9 is authoritative for current Desktop planning.

## TASK-39.9 — Desktop full redesign

Objective: deliver a coherent CKACE_HR People Operations Desktop experience using the current standalone platform, current contracts/business rules, TESTm67 as the TEST baseline, and current Owner direction.

Current review sources:

- `docs/design/desktop-20261018/`
- `design-system/ckace-hr-workspace/MASTER.md`

Current design:

- one People Operations system;
- persistent top tabs;
- dashboard-first command center;
- Galaxy metric/hero language;
- Thai-first action copy;
- module workspaces that complete common tasks on one page;
- responsive and reduced-motion behavior;
- Overview Hero layout editor for design review.

Remaining:

1. recover the exact TESTm67 source/deployment lineage under TASK-CX.2;
2. integrate the confirmed TEST baseline into Local without losing the current TASK-39.9 prototype/local work;
3. confirm the prototype/design-system baseline on the reconciled codebase;
4. map accepted prototype into real Next.js pages without importing fake data;
5. preserve server-authoritative permissions/business contracts;
6. complete remaining Desktop pages;
7. run responsive/accessibility/keyboard/reduced-motion/Thai-content/state QA;
8. reconcile against TESTm67 before next TEST rollout;
9. obtain Owner visual acceptance.

## TESTm67 reconciliation rule

Repository docs stopped around m16 while the Owner's latest TEST is m67. Treat TESTm67 as operational truth, but do not invent missing m17–m67 deployment metadata. Recover exact details from cloud evidence only as needed.

## Git strategy

TASK-CX.1 established the current Git/provenance shape:

- Local `main` remains at `65a901b` with preserved dirty/untracked work.
- `origin/main` has advanced to the Codex Lead/documentation state (`ee42f38` at TASK-CX.1 inspection time).
- `origin/claude/project-thread-j4idbg` diverges from the common implementation base `4e20dde` and contains the later TEST rounds plus m67 release configuration.
- The exact live TESTm67 source commit is not yet proven from repository evidence alone.
- Local Desktop-auth changes are not safe to promote as-is because they diverge from the later TEST branch authentication behavior.
- Current TASK-39.9 prototype work is local/newer design work and must be preserved separately.

Rules:
- Never clean/reset/stash unknown work as housekeeping.
- Recover exact TESTm67 deployment/source evidence before branch integration.
- Commit documentation separately from source.
- Keep prototype, API, LIFF, test tooling and agent tooling in bounded provenance groups.

## TASK-40 — Production Readiness Plan

NOT STARTED. Explicit Owner approval required. Planning does not authorize Production mutation.

## TASK-41 — Production Go / No-Go

NOT STARTED. Separate explicit Owner approval required.

## Codex execution model

Codex follows `docs/codex/WORKFLOW.md`:

- inspect before asking;
- ask only material Owner questions;
- keep one primary active TASK;
- prioritize P0–P2 over cleanup/nice-to-have work;
- route UI work through `ui-ux-pro-max` / `design-system` / `ui-styling` as applicable;
- use systematic debugging for failures;
- verify before PASS;
- update `docs/codex/TASKS.md`, `PROJECT_PLAN.md`, and `HANDOFF.md` after every completed work session;
- summarize every meaningful session;
- always ask the Owner at the end whether to commit and push the verified Local work to GitHub, and wait for explicit confirmation.

Current Codex execution board: `docs/codex/TASKS.md`.

## Next action

Execute **TASK-CX.2 — Recover exact TESTm67 source/deployment lineage**. Do not merge/reset/clean the Local tree before the exact TESTm67 source baseline and safe integration sequence are proven. TASK-39.9 remains the active product track but implementation changes wait for this P1 reconciliation gate.
