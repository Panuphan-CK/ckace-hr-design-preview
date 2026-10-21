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
| Local/Git provenance reconciliation | **IN PROGRESS** |
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

1. confirm prototype/design-system baseline;
2. classify local dirty work and provenance vs TESTm67;
3. map accepted prototype into real Next.js pages without importing fake data;
4. preserve server-authoritative permissions/business contracts;
5. complete remaining Desktop pages;
6. run responsive/accessibility/keyboard/reduced-motion/Thai-content/state QA;
7. reconcile against TESTm67 before next TEST rollout;
8. obtain Owner visual acceptance.

## TESTm67 reconciliation rule

Repository docs stopped around m16 while the Owner's latest TEST is m67. Treat TESTm67 as operational truth, but do not invent missing m17–m67 deployment metadata. Recover exact details from cloud evidence only as needed.

## Git strategy

At reconciliation start Local and origin/main shared HEAD `65a901b`, but Local had substantial dirty work.

- Never clean/reset/stash unknown work as housekeeping.
- Commit documentation separately from source.
- Classify source provenance before committing.
- Keep prototype, API, LIFF, test tooling and agent tooling in bounded commits.

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

Execute **TASK-CX.1 — Local working-tree provenance reconciliation** as a read-only TASK. After Owner review, continue TASK-39.9 from the confirmed Local baseline.
