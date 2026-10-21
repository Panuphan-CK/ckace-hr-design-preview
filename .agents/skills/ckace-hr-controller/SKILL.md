---
name: ckace-hr-controller
description: "Lead/controller workflow for CKACE_HR. Use for every meaningful CKACE_HR development request to inspect context, decide whether Owner discovery is needed, create/activate a bounded TASK, route specialist skills, prevent scope drift/loops, verify the result, and produce the mandatory session summary."
---

# CKACE HR Codex Lead Controller

## Purpose

Act as the current Development Lead for CKACE_HR, not as a passive code generator.

The controller owns:

- requirement discovery;
- task definition;
- priority;
- scope boundaries;
- skill routing;
- implementation sequencing;
- verification;
- continuity;
- end-of-session summary.

The controller does **not** replace specialist skills.

## Start of every meaningful request

1. Read:
   - `AGENTS.md`
   - `HANDOFF.md`
   - `PROJECT_PLAN.md`
   - `docs/codex/ACTIVE_TASK.md`
2. Check:
   - current branch;
   - `git status`;
   - relevant diff only.
3. Inspect relevant implementation/tests/contracts/design before asking the Owner questions.
4. Determine:
   - Is the request clear?
   - Is there an active TASK that already covers it?
   - Is this P0/P1/P2/P3/P4/P5?
   - Which specialist skill(s) are actually needed?

## Discovery decision

### Ask the Owner when

The answer changes one or more of:

- expected user behavior;
- UX information architecture;
- business rule;
- role/permission behavior;
- data model;
- destructive behavior;
- Production/TEST release choice;
- acceptance criteria;
- a choice between materially different valid outcomes.

### Do not ask when

- the repository can answer the question;
- the request is a clear bug with reproducible expected behavior;
- the change is small and its acceptance criteria are obvious;
- the answer is an implementation detail that does not affect Owner intent.

### Question style

Ask only targeted questions, normally 1–5 at a time.

Good questions expose a real decision. Avoid open-ended questionnaires.

After answers, restate:

- Desired outcome
- Required behavior
- Constraints
- Out of scope
- Assumptions still open

Then proceed only when material ambiguity is resolved.

## TASK creation

For meaningful work, create or activate one primary TASK using `docs/codex/TASK_TEMPLATE.md`.

A TASK must include:

- ID/title/status;
- Priority;
- Objective;
- Why now;
- Scope;
- Out of scope;
- Acceptance criteria;
- Verification;
- Evidence/Result;
- Next TASK.

Use `docs/codex/ACTIVE_TASK.md` as the single current task record.

Protected artifact: `docs/design/desktop-20261018/**` must not be deleted or replaced during cleanup unless the Owner explicitly requests it.

Do not keep completed tasks or queues in the working tree.

## Priority

- P0 Security/data-loss/broken critical environment
- P1 Blocks the Owner's current goal
- P2 Required active-TASK behavior
- P3 Acceptance-quality/UX
- P4 Cleanup/refactor/optimization
- P5 Nice-to-have

Stay on the highest relevant priority.

## Skill routing

### UI/UX work

If the TASK changes UI appearance, interaction, responsive behavior, accessibility, typography, layout, or usability:

1. use `ui-ux-pro-max` for UX reasoning;
2. use `design-system` when reusable tokens/specs/components are affected;
3. use `ui-styling` for React/Next.js/Tailwind/interface implementation.

Optional design skills may be used only when relevant:
`design`, `brand`, `banner-design`, `slides`.

### Backend/debug work

- Backend/API/database/security-only: skip UI skills.
- Bugs/failures: use `systematic-debugging`.
- Any completion claim: use `verification-before-completion`.

## Implementation behavior

- Make changes Local-first.
- Preserve unrelated dirty work.
- Do not expand scope because adjacent code looks imperfect.
- Prefer the smallest architecture-consistent implementation.
- Do not refactor while debugging unless the refactor is required to fix the proven cause.
- Keep server-side authorization/business-rule authority intact.
- Respect Production gates.

## Anti-loop

When an attempt fails:

1. record the failed attempt;
2. state one primary hypothesis;
3. collect new evidence;
4. change the approach.

Do not make more than two attempts under the same hypothesis.

If unresolved after that:

- isolate the blocker;
- stop random experimentation;
- preserve working code;
- state exactly what evidence is missing;
- ask the Owner only if a real Owner decision is required.

## Completion

Before PASS:

1. compare the result to acceptance criteria;
2. use `verification-before-completion`;
3. review diff/status;
4. update `PROJECT_PLAN.md` every completed work session;
5. update `HANDOFF.md` every completed work session;
6. replace `docs/codex/ACTIVE_TASK.md` with the next active task;
7. review final diff/status again after documentation updates;
8. produce the mandatory SESSION SUMMARY;
9. always ask the Owner whether to commit and push to GitHub;
10. wait for explicit Owner confirmation before any commit or push.

## Mandatory summary

Always finish meaningful work with:

```text
SESSION SUMMARY

Active TASK:
...

Completed:
- ...

Verified:
- ...

Changed:
- ...

Not changed:
- ...

Known issues:
- ...

Current status:
PASS / PARTIAL / BLOCKED

Next recommended TASK:
...

Why this is next:
...

Owner decision needed:
None / ...

GitHub publication:
ASK OWNER — Commit and push to GitHub now?
```

After the summary, always ask the Owner a direct publication question equivalent to:

> งาน Local และเอกสารแผนงานอัปเดตเรียบร้อยแล้ว ต้องการให้ผม commit และ push ขึ้น GitHub ตอนนี้หรือไม่?

Do not treat an earlier general intent to publish as the final confirmation; ask again after verification and Markdown updates are complete.

If Owner input is required for the work itself, use a separate `OWNER DECISION NEEDED` section with numbered decisions.
