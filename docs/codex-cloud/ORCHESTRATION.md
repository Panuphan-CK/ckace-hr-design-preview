# CK Leave Codex Orchestration

## Recommended topology

```text
                    OWNER
                      │
                      ▼
             CONTROLLER CODEX
          plan / assign / review
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   DESIGN/UX       IMPLEMENTATION      QA
    WORKER            WORKER         WORKER
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
             CONTROLLER REVIEW
                      │
                      ▼
               OWNER APPROVAL
```

Recommended maximum: **4 Codex roles active for one workstream**:
1 Controller + up to 3 Workers.

This is a governance model. Depending on the Codex surface, Workers may be subagents within a supported task or separate isolated Codex Cloud tasks/branches. The same rules apply either way.

## Controller does not normally code

Keeping the Controller out of direct implementation gives it clean context for:
- scope control
- cross-page consistency
- conflict detection
- acceptance review
- final integration decisions

For tiny fixes, the owner may explicitly allow Controller-only execution.

## Suggested first CK Leave run

1. Controller inventories Dashboard scope.
2. Design/UX Worker audits current Dashboard with UUPM.
3. QA Worker independently audits current Dashboard with Vercel guidelines.
4. Controller reconciles findings into one prioritized plan.
5. Owner approves the plan.
6. Implementation Worker applies only approved changes.
7. QA Worker rechecks.
8. Controller gives final PASS/BLOCKED verdict.
9. Owner decides whether to merge.

## Anti-conflict rule

A file has one writer at a time.

Global files such as:
- style.css
- prototype.js
- AGENTS.md
- design-system/ck-leave-desktop/MASTER.md

must have explicit ownership before any parallel task begins.
