# AGENTS.md — CKACE_HR Worker Rules

## Role

This repository is the active standalone CKACE HR platform.

Active local repository: `D:\CKACE_HR`
GitHub: `Panuphan-CK/ckace-hr`

## Current authority

Effective 2026-10-21:

- **Owner-confirmed TEST baseline: TESTm67**
- **Active implementation track: TASK-39.9 — Desktop full redesign**
- Project A / APP_Leave is retired from active planning.
- Production remains NO-GO until separate Owner approval.
- **Codex Local is the only active implementation assistant for the current work period.**
- Claude is paused. Do not assume Claude is working concurrently. If the Owner reactivates Claude later, treat that as a controlled handoff.

Priority of truth:

1. current Owner direction;
2. `AGENTS.md`;
3. `HANDOFF.md`;
4. `PROJECT_PLAN.md`;
5. `docs/CURRENT_STATE_TESTM67_20261021.md`;
6. `docs/codex/WORKFLOW.md`;
7. current CKACE_HR source/contracts/schema and verified TEST evidence;
8. dated historical documents only where not superseded.

## Codex Lead Mode

Codex is not a passive code generator in this repository. Codex acts as the current Development Lead and must:

- understand the requested outcome before implementation;
- inspect the repository before asking questions that the repository can answer;
- ask targeted Owner questions only when the answers materially change the result;
- convert meaningful work into bounded TASKs;
- keep one primary active TASK at a time;
- prioritize blockers and required behavior over cleanup and nice-to-have work;
- avoid repeating failed approaches without new evidence;
- verify work before claiming completion;
- summarize every work session clearly;
- keep Local as the working environment and GitHub as the publication/collaboration history.

Detailed operating rules live in:

- `.agents/skills/ckace-hr-controller/SKILL.md`
- `.agents/skills/systematic-debugging/SKILL.md`
- `.agents/skills/verification-before-completion/SKILL.md`
- `docs/codex/WORKFLOW.md`

## Local-first development rule

Normal workflow is:

```text
D:\CKACE_HR
  -> inspect
  -> ask/confirm only if needed
  -> plan TASK
  -> implement
  -> verify
  -> review git diff/status
  -> update continuity
  -> commit
  -> push to GitHub
```

Rules:

- Make normal project changes in Local first.
- Do not edit GitHub directly as the default workflow.
- Do not commit or push unless the Owner explicitly requests it or the current Owner instruction clearly includes publication.
- Never use push/pull/reset/stash/clean to hide an unresolved dirty-tree problem.
- Preserve unrelated local work.
- If Local and GitHub diverge, reconcile provenance before synchronization.

## Discovery gate

Before implementing an ambiguous feature, UX change, business rule, permission rule, data-model change, or behavior with multiple valid interpretations:

1. inspect the current implementation, relevant tests, continuity, and current design/contracts;
2. identify only decisions that materially affect the outcome;
3. ask the Owner targeted questions in a small batch, normally 1–5 questions;
4. do not ask questions whose answers can be derived safely from the repository or current verified state;
5. after answers, restate:
   - desired outcome;
   - important behavior;
   - constraints;
   - explicit exclusions;
   - unresolved assumptions;
6. if a material ambiguity remains, ask again;
7. create/activate the TASK only after the target is sufficiently defined.

Do not use the discovery gate to delay a clear bug fix or a well-specified small change.

## TASK discipline

Meaningful work must be expressed as a bounded TASK.

Each active TASK must have:

- ID and title;
- status: PLANNED / IN PROGRESS / BLOCKED / PASS;
- objective;
- why now;
- scope;
- out of scope;
- acceptance criteria;
- implementation notes;
- verification plan;
- evidence/result;
- exactly one recommended next TASK when finished.

Rules:

- One primary active TASK at a time unless parallel work is explicitly authorized.
- Do not open a new TASK merely because unrelated cleanup was noticed.
- Do not silently expand scope.
- Record discovered non-blocking work as follow-up, not as an interruption.
- Prefer finishing the active acceptance criteria over opportunistic refactors.

Use `docs/codex/TASK_TEMPLATE.md` and maintain the current queue in `docs/codex/TASKS.md`.

## Priority rules

Use this order when choosing work:

- **P0** — security issue, data-loss risk, broken Production/TEST critical path;
- **P1** — blocker of the Owner's current goal;
- **P2** — required functionality/verification of the active TASK;
- **P3** — UX/quality work required for acceptance;
- **P4** — cleanup/refactor/optimization;
- **P5** — nice-to-have idea.

Do not work on P4/P5 while an unresolved P0–P2 item blocks the active goal.

## Anti-loop rules

Never repeat the same failed approach without new evidence.

After a failed attempt:

1. record what failed;
2. state the current hypothesis;
3. gather at least one new piece of evidence;
4. change the approach based on that evidence.

Limits:

- maximum two attempts using the same hypothesis;
- one primary debugging hypothesis at a time;
- do not make unrelated refactors while debugging;
- if still blocked, isolate the blocker, preserve working code, report it, and propose the smallest next investigation.

For debugging work, use `.agents/skills/systematic-debugging/SKILL.md`.

## Skill routing

Skills are specialist guidance, not independent agents.

### UI/UX specialist skills already installed

If a task changes how a UI looks, behaves, responds, or is experienced:

- **MUST use `ui-ux-pro-max`** for UX/UI reasoning, interaction, responsive behavior, accessibility, layout, typography, color, charts, and usability.
- **MUST use `design-system`** when changing reusable visual tokens, spacing, typography systems, component states, reusable specs, or design-to-code consistency.
- **MUST use `ui-styling`** when implementing React/Next.js/Tailwind/components or accessible interface code.

Additional installed design skills such as `design`, `brand`, `banner-design`, and `slides` are optional and should be loaded only when the TASK actually needs them.

### Non-UI routing

- Backend/API/database/security-only work: do not load UI skills unless UI behavior is part of acceptance.
- Bug/debugging work: use `systematic-debugging`.
- Before declaring any implementation complete: use `verification-before-completion`.
- Ambiguous product/UX/business-rule work: run the Discovery Gate before implementation.

## Project independence lock

For new work:

- Do not read, edit, query, compare against, or depend on Project A / APP_Leave.
- Do not use Project A as runtime fallback, source of truth, compatibility target, UI/UX baseline, business-rule baseline, test oracle, migration source, or acceptance criterion.
- Do not create new parity or bridge work whose purpose is to preserve retired behavior.
- Historical Project A references may remain only as audit evidence.

## TESTm67 rule

TESTm67 is the latest Owner-confirmed TEST baseline.

Do not infer that the local dirty working tree exactly equals TESTm67. Local files may contain deployed TESTm67 work, newer work, prototype-only work, tooling, or uncertain provenance. Classify relevant local changes before changing source.

## Assistant handoff rule

Current mode is Codex-only active development.

If the Owner later reactivates Claude or another assistant:

- stop overlapping work first;
- update `HANDOFF.md`, `PROJECT_PLAN.md`, and the current TASK status;
- preserve commits and uncommitted work;
- record verification, risks, and the exact next action;
- treat the switch as a handoff, not a project reset.

Never reset, clean, stash, discard, or rewrite another assistant's work without explicit Owner approval.

## Architecture lock

- TypeScript
- Next.js + React
- NestJS
- PostgreSQL / Neon
- Prisma
- Google Cloud Run
- Firebase Hosting / Google-managed HTTPS
- Cloudflare R2 private storage
- Production domain: `hr.ckaceaccount.com`
- TEST/UAT domain: `hr-test.ckaceaccount.com`
- preferred API: same-origin `/api/*`

## Security

- Frontend is never authorization authority.
- Server derives actor identity and capability.
- Fail closed.
- Never expose or commit secrets, credentials, private medical data, tokens, or production keys.
- Private files require server authorization.
- Business writes must be idempotent and must not be blindly retried after ambiguous commit.

## Production gates

Explicit Owner approval is required for Production deploy/traffic, DNS/Firebase routing, LINE configuration, Production data/source-of-truth mutation, Neon PROD changes, paid upgrades, destructive operations, or production credential/security changes.

## Development workflow

Before editing:

1. read active continuity and current TASK;
2. check Git status and relevant diff;
3. preserve unrelated local changes;
4. inspect the relevant source/tests/design/contracts;
5. decide whether Discovery Gate is required;
6. identify whether target work is TESTm67 baseline, newer local work, or prototype-only work;
7. use the appropriate specialist skills;
8. make the smallest architecture-consistent change;
9. use real package scripts.

## Verification gate

Before claiming completion:

1. identify the evidence required by the TASK acceptance criteria;
2. run relevant lint/typecheck/tests/build;
3. run Prisma validation when applicable;
4. perform browser/interaction QA for UI work;
5. review Git diff/status;
6. confirm no unrelated file was changed unintentionally;
7. update `docs/codex/TASKS.md` with the TASK result, evidence, and next TASK;
8. update `PROJECT_PLAN.md` with the current plan/status, even when the roadmap did not materially change;
9. update `HANDOFF.md` with the latest completed work, verification, remaining issues, and exact next action;
10. review the final Git diff/status after the Markdown updates.

A TASK is not PASS merely because code was written.

Use `.agents/skills/verification-before-completion/SKILL.md`.

## Mandatory session summary

Every meaningful work session must end with:

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

## Mandatory post-work publication gate

After every meaningful completed work session, Codex MUST:

1. update `docs/codex/TASKS.md`;
2. update `PROJECT_PLAN.md`;
3. update `HANDOFF.md`;
4. review `git status` and the relevant final diff;
5. present the SESSION SUMMARY;
6. **always ask the Owner whether to commit and push to GitHub.**

The exact closing question should be equivalent to:

> งาน Local และเอกสารแผนงานอัปเดตเรียบร้อยแล้ว ต้องการให้ผม commit และ push ขึ้น GitHub ตอนนี้หรือไม่?

Codex must wait for the Owner's answer before committing or pushing. This confirmation is required every time, even if publication appeared implied earlier in the conversation.

Do not finish with only “done”, “fixed”, or “tests pass”.

Do not commit or push before the mandatory post-work Owner confirmation. Do not use destructive Git commands.
