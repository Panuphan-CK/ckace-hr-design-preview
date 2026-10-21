# CKACE HR — Codex TASK Board

Updated: 2026-10-21

## Rules

- One primary active TASK at a time.
- Only meaningful outcomes belong here.
- Do not use this board as a dump for every cleanup idea.
- Follow priority P0 → P5.
- Historical project TASK documents remain evidence; this board tracks current Codex execution only.

## Active

### TASK-CX.2 — Recover exact TESTm67 source/deployment lineage

Status: **PLANNED**
Priority: **P1**

Objective:
Prove the exact source commit/build/revision that produced the Owner-confirmed live TESTm67, then define a safe Local integration path without losing TASK-39.9 or other preserved local work.

Scope:
- Cloud Build / Cloud Run / Firebase TEST evidence when available;
- Git commit/build lineage around `origin/claude/project-thread-j4idbg`;
- branch integration plan only.

Out of scope:
- Production;
- destructive Git;
- source cleanup;
- TASK-39.9 implementation changes before lineage is confirmed.

Acceptance Criteria:
- [ ] exact or best-provable TESTm67 source commit identified;
- [ ] TEST API/Web revision/build evidence recorded;
- [ ] branch relationship to `origin/main` and Local prototype work documented;
- [ ] safe integration sequence proposed with rollback/preservation plan.

## Recently completed

### TASK-CX.1 — Local working-tree provenance reconciliation

Status: **PASS**
Priority: **P1**

Result:
- Major dirty/untracked groups classified.
- Local `main` proven not to be the current TESTm67 source baseline.
- `origin/claude/project-thread-j4idbg` identified as the strongest later TEST implementation lineage.
- Local API auth changes classified as a superseded/experimental LIFF-auth precursor and unsafe to merge as-is.
- Local TASK-39.9 prototype preserved as newer/local-only design work.
- LIFF source/assets classified as strong precursor artifacts to the later committed LIFF bridge.
- TEST-admin scripts classified as historical TEST-only mutation tooling.
- Specialist skills classified as Local agent tooling, not product/TEST code.
- Controller/Codex/current-state docs identified as already published to `origin/main` and only appearing untracked because Local HEAD is behind.

Evidence:
`docs/codex/TASK_CX1_PROVENANCE_20261021.md`

Verification:
Read-only product/source/Git inspection; only required planning/continuity Markdown was updated at close.

### TASK-CX.SETUP-2 — Mandatory post-work plan update and GitHub publication gate

Status: **PASS**
Priority: **P1**

Result:
- Every completed Codex work session updates `docs/codex/TASKS.md`, `PROJECT_PLAN.md`, and `HANDOFF.md`.
- Every session ends with the mandatory summary.
- Codex always asks the Owner whether to commit and push after Local verification and Markdown updates.
- Commit/push remains blocked until the Owner answers yes to that final question.

## Queue

- TASK-39.9 — Desktop full redesign implementation (active product track; resume after TASK-CX.2/integration gate)
- TASK-40 — Production Readiness Plan (not authorized)
- TASK-41 — Production Go/No-Go (not authorized)

## Parking lot

Only add non-blocking P4/P5 work here when discovered. Do not interrupt the active TASK.
