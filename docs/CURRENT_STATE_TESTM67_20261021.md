# CKACE_HR — Current State Reconciliation

Date: 2026-10-21 Asia/Bangkok  
Authority: Owner-confirmed operational status + Local/Git inspection

## Current baseline

**TESTm67** is the latest Owner-confirmed TEST baseline.

The repository previously recorded explicit deployment details only through roughly m16. Exact m17–m67 Cloud Run revisions, image tags, builds, Firebase releases, migrations and rollback targets were not present in continuity during this reconciliation and must not be guessed.

## Git baseline at reconciliation start

- Local branch: `main`
- Local HEAD: `65a901b632320bff4dd01fbf9d53d754f49b731b`
- GitHub main: same SHA
- committed ahead/behind divergence: none
- working tree: dirty

Latest committed history observed:

```text
65a901b fix(design): show drag handles on all hero ovals
b8eb600 docs(design): add desktop review prototype
196ac94 Create settings.json
4e20dde feat(desktop): v18 UX across the system, delegation/inbox pages, click-only dates, holiday-aware leave
3341660 feat(notifications): in-app inbox, LINE/email dispatch and overdue approval reminders
19e851b feat(workflow): send-back/resubmit/withdraw for OT, medical, time correction; delegation; policy admin
3730496 feat(requests): running request numbers, approver timeline, OT allowance policy admin
27fa22c feat(leave): send-back/resubmit/withdraw, tenure vacation, OT allowances and Excel report, professional roles, approval policy admin
```

## Dirty-state groups observed

Tracked local changes included root docs, Desktop auth API files, and Desktop review prototype files.

Large untracked groups included repo-local skills, `.claude/test-admin/`, LIFF assets/implementation, and `design-system/ckace-hr-workspace/MASTER.md`.

These groups are **not automatically equivalent to TESTm67**. Classify them as deployed TESTm67 work, newer implementation, TASK-39.9 design/prototype work, dev tooling, TEST/admin tooling, or uncertain provenance before source commits/deploys.

## Platform capability state

Current history/continuity shows mature implementation across Identity/Auth/RBAC/Audit, company/team/manager scope, Leave, OT, Attendance, Time Correction, Medical, approval routing/policy, revisions/withdrawals/delegation, request numbers/timelines, vacation entitlement, professional roles, OT allowances/reporting, private R2, notifications/reminders, holiday/workday-aware dates, and management/admin configuration.

## Desktop status

**TASK-39.9 — Desktop full redesign** is active.

Current review assets:

- `docs/design/desktop-20261018/index.html`
- `docs/design/desktop-20261018/style.css`
- `docs/design/desktop-20261018/prototype.js`
- `docs/design/desktop-20261018/hero-layout-editor.js`
- `design-system/ckace-hr-workspace/MASTER.md`

Current Local direction is a single People Operations system with top tabs, dashboard-first Galaxy design, Thai-first action copy, one-page module workspaces, and a review-only Hero layout editor.

## Historical status

TASK-28 through TASK-39.x evidence remains historical proof. TASK-39.5/39.6/39.7 and TASK-39.8 parity work do not govern current planning. TASK-39.9 supersedes TASK-39.8.

## Project A

Project A / APP_Leave is retired from active planning and must not be used as dependency, visual/compatibility/business-rule/migration/acceptance baseline. Historical references remain evidence only.

## Collaboration

Codex Local is active. Claude is paused. Shared handoff is GitHub + active continuity files.

## Production

Production remains NO-GO. TESTm67 does not authorize Production.

## Safest next sequence

1. finish documentation reconciliation;
2. classify remaining dirty source/untracked groups;
3. recover exact TESTm67 deployment metadata only when needed;
4. continue TASK-39.9 in bounded commits;
5. run whole-system QA;
6. reconcile the next TEST rollout from TESTm67;
7. start TASK-40 only after Owner approval.
