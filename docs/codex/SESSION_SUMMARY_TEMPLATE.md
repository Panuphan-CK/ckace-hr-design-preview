# CKACE HR — Session Summary Template

Every meaningful Codex work session ends with this structure.

```text
SESSION SUMMARY

Active TASK:
TASK-...

Completed:
- ...

Verified:
- ...

Changed:
- ...

Not changed:
- ...

Known issues:
- None / ...

Current status:
PASS / PARTIAL / BLOCKED

Next recommended TASK:
TASK-...

Why this is next:
...

Owner decision needed:
None
or
1. ...
2. ...

Plan/continuity updated:
- docs/codex/TASKS.md: YES
- PROJECT_PLAN.md: YES
- HANDOFF.md: YES

GitHub publication:
ASK OWNER — Commit and push to GitHub now?
```

## Rules

- Do not hide failed or unrun verification.
- Do not list multiple competing “next” tasks unless the Owner requested options.
- If blocked, state the missing evidence/access/decision precisely.
- If no Owner decision is needed, write `None`.
- `docs/codex/TASKS.md`, `PROJECT_PLAN.md`, and `HANDOFF.md` must be updated before presenting the final session summary.
- After the summary, always ask whether to commit and push to GitHub.
- Never commit or push before the Owner answers that final publication question affirmatively.
