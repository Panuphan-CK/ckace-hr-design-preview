---
name: verification-before-completion
description: "Completion gate for CKACE_HR. Use before claiming a TASK is PASS or finished. Requires evidence tied to acceptance criteria, appropriate automated/browser checks, diff review, and explicit reporting of anything not verified."
---

# Verification Before Completion

## Principle

Code written is not evidence of completion.

A TASK may be PASS only when its acceptance criteria have evidence.

## Step 1 — Re-read acceptance criteria

List each criterion and the evidence needed to prove it.

Do not replace a user-visible criterion with a code-level assumption.

## Step 2 — Run the narrow checks first

Examples:

- unit/business-rule tests;
- controller/service tests;
- targeted typecheck/lint;
- API integration checks;
- browser interaction checks;
- accessibility/keyboard/responsive checks;
- Prisma validation for schema/config changes.

## Step 3 — Run broader repository gates when appropriate

Use real repository scripts.

Normal completion gates may include:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run prisma:validate
```

Do not claim a gate passed if it was not run.

If a broad gate is blocked by a known unrelated pre-existing failure:

- run the narrow verification that proves the TASK;
- report the unrelated blocker explicitly;
- classify the TASK as PASS only if the acceptance criteria are independently proven and the unrelated failure does not invalidate them.

## Step 4 — UI verification

For UI/UX work, verify the actual rendered experience where possible:

- expected viewport(s);
- interaction;
- loading/empty/error/permission states relevant to scope;
- keyboard/focus;
- responsive behavior;
- reduced motion when relevant;
- no accidental horizontal overflow;
- Thai text readability.

A static code review alone is not enough for a user-visible interaction claim.

## Step 5 — Git review

Before completion:

- inspect `git status`;
- inspect relevant `git diff`;
- confirm no unrelated file was accidentally changed;
- confirm secrets/credentials are absent;
- confirm generated or temporary files are intentional.

## Step 6 — Result classification

Use exactly one:

- **PASS** — acceptance criteria proven.
- **PARTIAL** — useful progress, but at least one criterion not proven/completed.
- **BLOCKED** — cannot progress without missing evidence, access, or Owner decision.

Never call PARTIAL work “done”.

## Evidence format

```text
Acceptance criterion:
Evidence:
Command/check:
Result:
PASS / FAIL / NOT RUN
```

## Completion summary

Feed the verified result back to the controller for the mandatory SESSION SUMMARY.
