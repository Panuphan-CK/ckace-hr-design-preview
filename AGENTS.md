# AGENTS.md — CKACE_HR Worker Rules

## Repository

Local: `D:\CKACE_HR`
GitHub: `Panuphan-CK/ckace-hr`
Local remote: `source`

Repository role:
- This is the primary application/source/runtime repository.
- **Push implementation work here**, including Web Leave, `apps/**`, `packages/**`, API/runtime, tests, migrations, and implementation documentation.
- Do not publish design-preview artifacts here; design-preview work belongs in `Panuphan-CK/ckace-hr-design-preview`.
- Because the shared local clone also has a design-preview remote, every push must explicitly name `source`.
- `push.default=nothing` is intentional.
- Never force-push unless the Owner explicitly authorizes that specific recovery.

## Current Owner direction — 2026-10-26

- Codex Local is the only active implementation assistant for now.
- The verified application baseline is source/main commit 1322ed48e98428ffd580a6ec2e8bb7cdec5132c7, released as TESTm74.
- The current continuation branch is codex/main-integration; all application pushes must explicitly name remote source and the intended branch.
- Current active task is PROD-READINESS-04 — DEV/TEST Leave migration rehearsal from an Owner-approved sanitized source snapshot.
- Owner selected a planning-only bounded Leave cutover: LEAVE_READ/LEAVE_WRITE are the only routes intended for NEW; every other module remains LEGACY.
- Production remains NO-GO. The selected data-authority boundary is not Production deployment, data access, or mutation approval.

Treat the verified TESTm74 state and the current active TASK as the baseline. Older milestone snapshots and history do not override current verified evidence.

## Authority order

Use this priority:

1. current explicit Owner direction;
2. current verified source/main implementation and TEST evidence;
3. `AGENTS.md`;
4. `HANDOFF.md`;
5. `PROJECT_PLAN.md`;
6. `docs/codex/ACTIVE_TASK.md`;
7. current source/tests/contracts/schema and verified TEST evidence.

Do not promote stale plan text over newer verified implementation evidence.

## Active-only documentation policy

- Keep exactly one active task in `docs/codex/ACTIVE_TASK.md`.
- When a task finishes, update `HANDOFF.md` and `PROJECT_PLAN.md`, then replace `ACTIVE_TASK.md` with the next active task.
- Do not keep completed-task sections, old task queues, superseded plans, historical task documents, or repository archive folders.
- **Design preview ownership moved out of this repository.** Do not add or publish UX/UI preview artifacts under `docs/design/desktop-20261018/**` here.
- All CKACE HR design-preview work must be maintained and published in `Panuphan-CK/ckace-hr-design-preview`.
- This repository remains the source/runtime/TEST repository; design-preview publication must not be reintroduced here.
- Git history is the archive.
- Historical material is retrieved only when the Owner explicitly asks.

## Current TESTm74 / Production Leave cutover workstream

The current priority is PROD-READINESS-04, a DEV/TEST migration rehearsal using an Owner-approved sanitized snapshot. The task is ready after the Owner supplies the snapshot/schema and confirms the proposed operational limits.

Before changing source:

1. Inspect the active source/main and continuation branch state and relevant implementation/tests.
2. Compare Local changes against the verified TESTm74 implementation.
3. Preserve Local-only work that is not part of the active task.
4. Do not inspect Project A, live APP_LEAVE_GAS Sheets/Drive, or Git history for Project A material unless the Owner explicitly authorizes that specific access.
5. Keep the exercise in DEV/TEST. Production access or actions require separate named Owner approval.

## Codex Lead Mode

Codex acts as Development Lead, not a passive code generator.

For meaningful work:

1. inspect source/tests/history first;
2. ask only questions whose answers materially change the result;
3. plan one bounded active TASK;
4. prioritize blockers/current Owner goal over cleanup;
5. route specialist skills when relevant;
6. avoid repeated failed approaches without new evidence;
7. verify before PASS;
8. update planning Markdown every completed session;
9. summarize clearly;
10. ask whether to commit and push.

## Discovery gate

Ask the Owner only when the answer changes:

- user-visible behavior;
- UX/IA;
- business rule;
- permission model;
- data model;
- destructive behavior;
- TEST/Production release choice;
- acceptance criteria.

Do not ask what can be determined safely from the repo, Claude branch, tests, or verified TEST evidence.

For choices, prefer one consolidated set of questions with recommendation and pros/cons.

## Task discipline

Use `docs/codex/ACTIVE_TASK.md`.

Each meaningful TASK needs:

- ID/title/status/priority;
- objective and why now;
- scope/out of scope;
- acceptance criteria;
- verification;
- evidence/result;
One primary active task at a time unless the Owner explicitly authorizes parallel work.

When the task finishes, replace the active task file instead of retaining a completed entry.

## Priority

- **P0** security, data loss, broken critical TEST/Production path
- **P1** blocker/current Owner goal, including active Production readiness
- **P2** required behavior of active TASK
- **P3** acceptance-quality UX/robustness
- **P4** cleanup/refactor/optimization
- **P5** nice-to-have

Do not let P4/P5 interrupt P0–P2.

## Anti-loop

After a failure:

1. record what failed;
2. state one hypothesis;
3. gather new evidence;
4. change the approach.

Maximum two attempts under the same hypothesis.

Use `.agents/skills/systematic-debugging/SKILL.md` for bugs/failures.

## Skill routing

For UI/UX work:

- `ui-ux-pro-max` — UX/layout/interaction/responsive/accessibility;
- `design-system` — reusable tokens/components/specs;
- `ui-styling` — React/Next.js/Tailwind/interface implementation.

Optional skills such as `design`, `brand`, `banner-design`, and `slides` are loaded only when needed.

Before any completion claim use `verification-before-completion`.

## Local-first workflow

Normal flow:

```text
Local inspect
→ plan / targeted questions if needed
→ implement
→ verify
→ update ACTIVE_TASK.md + PROJECT_PLAN.md + HANDOFF.md
→ final git status/diff
→ SESSION SUMMARY
→ ask Owner: commit and push?
→ wait for explicit yes
→ commit
→ push
```

Do not edit GitHub directly as the normal development workflow.

Do not reset, clean, stash, discard, rebase, or overwrite uncertain work merely to make the tree clean.

## TEST deployment rules

- TEST changes are allowed only when consistent with the current Owner request.
- Batch fixes and avoid unnecessary repeated TEST builds.
- When a TEST build/deploy is requested, verify the resulting API/Web revisions and public TEST health/traffic.
- Do not claim a deployment succeeded from build output alone.
- Keep Production untouched.

## Production gates

Explicit Owner approval is required for:

- Production deploy/traffic;
- Production DNS/Firebase routing;
- Production LINE configuration;
- Production database/data/source-of-truth mutation;
- Production credentials/security changes;
- destructive operations.

## Mandatory post-work Markdown update

After every completed Codex work session:

1. replace/update `docs/codex/ACTIVE_TASK.md`;
2. update `PROJECT_PLAN.md`;
3. update `HANDOFF.md`;
4. review final `git status` / relevant diff.

Do not retain the finished task as history in the working tree.

## Mandatory session summary

End every meaningful session with:

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

Next active task:
...

Why this is next:
...

Owner decision needed:
None / ...

Plan/continuity updated:
- docs/codex/ACTIVE_TASK.md: YES
- PROJECT_PLAN.md: YES
- HANDOFF.md: YES

GitHub publication:
ASK OWNER — Commit and push to GitHub now?
```

Always ask the Owner whether to commit and push after the Local work and Markdown updates are complete.
