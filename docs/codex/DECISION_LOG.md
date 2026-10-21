# CKACE HR — Codex Decision Log

Use this file only for decisions that materially affect implementation, UX, business rules, permissions, data, architecture, release gates, or workflow.

Do not record ordinary coding choices that can be derived from existing architecture.

## 2026-10-21 — Codex-only active development

Decision:
Codex Local is the only active implementation assistant for the current work period.

Effect:
Claude is paused. No concurrent overlapping work is expected. If Claude returns, use an explicit handoff.

## 2026-10-21 — Local-first workflow

Decision:
Normal changes are made and verified in `D:\CKACE_HR` first, then committed/pushed to GitHub when requested.

Effect:
Direct GitHub edits are not the default development workflow.

## 2026-10-21 — Codex Lead Mode

Decision:
Codex must inspect first, ask only material questions, plan meaningful work as TASKs, avoid loops/scope drift, use specialist skills, verify before completion, and provide a session summary every time.

Effect:
`AGENTS.md`, `docs/codex/WORKFLOW.md`, and the repo-local controller/quality skills define the operating model.

## 2026-10-21 — UI specialist routing

Decision:
For UI/UX work, use the previously installed specialist skills rather than replacing them.

Routing:
- `ui-ux-pro-max` — UX/UI reasoning
- `design-system` — shared design/tokens/component specs
- `ui-styling` — implementation

Effect:
The new controller orchestrates these skills; it does not replace them.

## 2026-10-21 — Mandatory post-work plan update and GitHub confirmation

Decision:
Every completed Codex work session must update the active Markdown planning/continuity files before closing:
- `docs/codex/TASKS.md`
- `PROJECT_PLAN.md`
- `HANDOFF.md`

After verification and those Markdown updates, Codex must always ask the Owner whether to commit and push the completed Local work to GitHub.

Effect:
No automatic commit or push. Codex waits for an explicit end-of-session Owner confirmation every time, even if publication appeared implied earlier.
