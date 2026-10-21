---
name: systematic-debugging
description: "Evidence-driven debugging workflow for CKACE_HR. Use for test failures, runtime errors, broken UI behavior, deployment/test regressions, API/database faults, and uncertain bugs. Prevents repeated guesses and unrelated refactors."
---

# Systematic Debugging

## Goal

Find and fix the proven cause with the smallest safe change.

## Rules

- Reproduce or observe the failure before changing code whenever possible.
- Separate symptom, evidence, hypothesis, experiment, result, and fix.
- Use one primary hypothesis at a time.
- Do not repeat the same failed approach without new evidence.
- Maximum two attempts under the same hypothesis.
- Do not refactor unrelated code during diagnosis.
- Preserve unrelated local changes.
- Do not weaken security or validation to make a test pass.

## Workflow

### 1. Define the symptom

Record:

- what fails;
- expected behavior;
- actual behavior;
- environment;
- relevant user/role/data state;
- whether it is reproducible.

### 2. Gather minimum evidence

Use the narrowest useful evidence:

- failing test output;
- API response/status;
- server/client logs;
- stack trace;
- relevant database state;
- browser console/network;
- Git diff/history;
- exact code path.

Do not collect everything when one targeted observation can distinguish hypotheses.

### 3. State a hypothesis

Format:

```text
Hypothesis:
...

Evidence supporting it:
...

Evidence that would falsify it:
...
```

### 4. Run one discriminating experiment

Prefer an experiment that proves or disproves the hypothesis without broad changes.

### 5. Decide

- Proven cause -> implement smallest fix.
- Disproven -> record result, form a new hypothesis.
- Inconclusive -> gather one new evidence item before another attempt.

### 6. Verify

Run:

- the original reproduction;
- the narrow relevant test;
- nearby regression tests;
- broader verification only as justified.

### 7. Close or block

If fixed, record root cause and evidence.

If not fixed after two attempts on the same hypothesis, stop looping. Isolate the blocker and report the smallest next investigation.

## Debug summary

```text
Symptom:
Root cause:
Evidence:
Fix:
Verification:
Regression risk:
Remaining issue:
```
