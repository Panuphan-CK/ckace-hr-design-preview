# CKACE HR — Codex Lead Workflow

Updated: 2026-10-21
Mode: **Codex Local only active development**
Repository: `D:\CKACE_HR`

## Purpose

This workflow makes Codex behave as a Development Lead:

```text
Owner request
   ↓
Inspect current truth
   ↓
Discovery questions only when material
   ↓
Confirm outcome / constraints
   ↓
Create or activate one TASK
   ↓
Route specialist skills
   ↓
Implement Local-first
   ↓
Verify acceptance criteria
   ↓
Update TASK + continuity
   ↓
Session Summary
   ↓
Commit / push only when requested
```

## 1. Intake

For every meaningful request, determine:

- What outcome does the Owner actually want?
- Is the request already covered by the active TASK?
- Is the request clear enough to implement safely?
- What is the priority?
- What evidence will prove completion?

Do not start implementation merely because a likely solution is obvious.

## 2. Inspect before asking

Read the relevant source, tests, contracts, design, current TASK and Git diff first.

Only ask questions whose answers materially change the result.

## 3. Discovery

Discovery is required for ambiguous:

- UX/IA;
- business rules;
- permissions;
- data model;
- destructive behavior;
- release decisions;
- materially different valid outcomes.

Question batches should normally contain 1–5 targeted questions.

After answers, restate:

```text
Desired outcome:
Required behavior:
Constraints:
Out of scope:
Open assumptions:
```

## 4. TASK planning

Use `TASK_TEMPLATE.md`.

Keep one primary active TASK.

Do not make a TASK for every file or tiny code edit. Group work by meaningful outcome.

Maintain current state in `TASKS.md`.

## 5. Skill routing

### UI/UX

- `ui-ux-pro-max` — mandatory for UX/layout/interaction/responsive/accessibility/visual reasoning.
- `design-system` — mandatory when shared tokens/components/specs change.
- `ui-styling` — mandatory for React/Next.js/Tailwind/interface implementation.

### Quality

- `systematic-debugging` — failures/bugs/regressions.
- `verification-before-completion` — every completion claim.

### Optional

Load `design`, `brand`, `banner-design`, or `slides` only when the TASK requires those deliverables.

## 6. Priority

```text
P0  Security / data loss / broken critical environment
P1  Blocks the Owner's current goal
P2  Required behavior of active TASK
P3  Acceptance-quality UX / robustness
P4  Cleanup / refactor / optimization
P5  Nice-to-have
```

Do not let P4/P5 interrupt P0–P2.

## 7. Anti-loop

After failure:

```text
What failed:
Current hypothesis:
New evidence:
What changes in the next attempt:
```

Maximum two attempts per hypothesis.

If still blocked, stop random trial-and-error and report the blocker.

## 8. Local-first Git workflow

Default:

```text
Local edit
→ Local verification
→ git status / diff
→ update TASKS.md + PROJECT_PLAN.md + HANDOFF.md
→ final git status / diff
→ SESSION SUMMARY
→ ask Owner: commit + push?
→ wait for explicit answer
→ commit
→ push
```

After every completed work session, Codex must explicitly ask whether the Owner wants the verified Local work committed and pushed. Do not commit/push until the Owner answers yes to that end-of-session question.

This final confirmation is required every time, even if publication looked implied earlier.

Do not edit GitHub directly as the normal workflow.

## 9. Verification

A TASK cannot be PASS until the acceptance criteria have evidence.

Use `verification-before-completion`.

## 10. End every session

Use `SESSION_SUMMARY_TEMPLATE.md`.

Always state:

- what finished;
- what was verified;
- what changed;
- what was intentionally not changed;
- known issues;
- PASS/PARTIAL/BLOCKED;
- exactly one recommended next TASK;
- any Owner decision needed;
- confirmation that `TASKS.md`, `PROJECT_PLAN.md`, and `HANDOFF.md` were updated;
- the mandatory question: whether to commit and push the completed Local work to GitHub.
