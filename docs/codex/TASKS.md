# CKACE HR — Codex TASK Board

Updated: 2026-10-21

## Rules

- One primary active TASK at a time.
- Only meaningful outcomes belong here.
- Do not use this board as a dump for every cleanup idea.
- Follow priority P0 → P5.
- Historical project TASK documents remain evidence; this board tracks current Codex execution only.

## Recently completed

### TASK-CX.SETUP-2 — Mandatory post-work plan update and GitHub publication gate

Status: **PASS**
Priority: **P1**

Result:
- Codex must update `docs/codex/TASKS.md`, `PROJECT_PLAN.md`, and `HANDOFF.md` after every completed work session.
- Codex must present the mandatory SESSION SUMMARY.
- Codex must always ask the Owner whether to commit and push to GitHub after Local verification and Markdown updates.
- Commit/push is blocked until the Owner answers yes to that end-of-session question.

Verification:
- Operating rules updated in `AGENTS.md`.
- Controller, workflow, session-summary template, active continuity, and decision log updated.
- No commit or push performed as part of this rule change.

## Active

### TASK-CX.1 — Local working-tree provenance reconciliation

Status: **PLANNED**
Priority: **P1**

Objective:
Classify the existing dirty/untracked Local work without deleting, resetting, stashing, committing, or modifying source so Codex can safely continue TASK-39.9.

Scope:
- tracked API changes;
- current Desktop prototype changes;
- LIFF implementation/assets;
- repo-local skills/tooling;
- TEST/admin tooling;
- current design-system files.

Out of scope:
- source cleanup;
- feature implementation;
- deploy;
- commit/push;
- Production changes.

Acceptance Criteria:
- [ ] every major dirty group classified by purpose/provenance;
- [ ] relationship to TESTm67 identified where evidence permits;
- [ ] uncertain provenance explicitly marked;
- [ ] recommended bounded commit/work order proposed;
- [ ] no source work lost or altered.

Verification:
Read-only Git/source inspection.

Next:
After Owner review, continue TASK-39.9 from the confirmed Local baseline.

## Queue

- TASK-39.9 — Desktop full redesign implementation (project roadmap; active product track)
- TASK-40 — Production Readiness Plan (not authorized)
- TASK-41 — Production Go/No-Go (not authorized)

## Parking lot

Only add non-blocking P4/P5 work here when discovered. Do not interrupt the active TASK.
