# CKACE HR — Codex Lead Workflow

Updated: 2026-10-21
Mode: **Codex Local only active development**
Repository: `D:\CKACE_HR`

## Core flow

```text
Owner request
→ inspect current baseline
→ ask only material questions
→ define one active task
→ route specialist skills
→ implement Local-first
→ verify acceptance criteria
→ update ACTIVE_TASK.md + PROJECT_PLAN.md + HANDOFF.md
→ replace the finished task with the next active task
→ final git status/diff
→ session summary
→ ask Owner: commit + push?
```

## Active-only task rule

- `ACTIVE_TASK.md` contains exactly one active task.
- Never add a Completed or Recently Completed section.
- When the task finishes, summarize current state in `HANDOFF.md` / `PROJECT_PLAN.md`, then overwrite `ACTIVE_TASK.md` with the next task.
- Do not create archive task files.
- Never delete or replace `docs/design/desktop-20261018/**` as part of cleanup; it is the Owner-protected current Local review artifact.
- Git history preserves finished task content.

## Intake

Determine desired outcome, whether the request is clear enough, priority, and evidence required for completion.

Inspect source/tests/history before asking the Owner questions.

## Discovery

Ask only questions whose answers materially change UX/IA, business rules, permissions, data model, destructive behavior, release decisions, or acceptance criteria.

Normally ask 1–5 targeted questions at a time.

## Skill routing

### UI/UX

- `ui-ux-pro-max`
- `design-system`
- `ui-styling`

### Quality

- `systematic-debugging`
- `verification-before-completion`

Load optional design skills only when the active task requires them.

## Priority

```text
P0  Security / data loss / broken critical environment
P1  Blocks the Owner's current goal
P2  Required behavior of active task
P3  Acceptance-quality UX / robustness
P4  Cleanup / refactor / optimization
P5  Nice-to-have
```

## Anti-loop

After failure record what failed, current hypothesis, new evidence, and what changes in the next attempt.

Maximum two attempts per hypothesis.

## Local-first Git workflow

```text
Local edit
→ Local verification
→ git status / diff
→ update ACTIVE_TASK.md + PROJECT_PLAN.md + HANDOFF.md
→ final git status / diff
→ SESSION SUMMARY
→ ask Owner: commit + push?
→ wait for explicit yes
→ commit
→ push
```

Never commit/push before the final Owner confirmation.

## Verification

A task cannot be PASS until its acceptance criteria have evidence.

Use `verification-before-completion`.

## Session close

Always state what finished, what was verified, what changed, what was intentionally not changed, known issues, PASS/PARTIAL/BLOCKED, exactly one next active task, any Owner decision needed, plan/continuity updated, and the commit/push question.
