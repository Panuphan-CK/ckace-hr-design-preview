# UI-SMARTHR-03 — SmartHR Light Blue Desktop Rollout

Updated: 2026-10-27 Asia/Bangkok

Status: PARTIAL — implementation and scoped checks pass; preview deployment was stopped because it requires API routing outside this task scope.

## Scope and boundaries

- Worktree: `D:\CKACE_HR.worktrees\ux-ui`
- Branch: `codex/ui-smarthr-lightblue`
- Base: `bd96ac0c910a8cab2e9ab013aeb8bc7819b1df5b`
- Changed paths stay within `apps/web/**` and this design folder.
- No API, schema, migration, data, role, validation, permission, route, calculation, fetch, or workflow changes. LIFF pages and `public/react-read` are untouched.
- No TEST service, Production service, Firebase Hosting, LINE/LIFF, database, Secret Manager, IAM, Scheduler, or Artifact Registry cleanup policy changes.

## Page groups

1. **Shared foundation, overview, and Employee Leave** — light-blue tokens and shell, selected nav styling, cards, tables, status indicators and responsive layout; existing `/desktop` overview and `/desktop/leave` balances/history/context/form retain their existing data and actions.
2. **Approval and leave request list** — assigned approval queue/history and `/desktop/requests` use the same visual system; existing filters and actions are preserved.
3. **Remaining Desktop pages** — shared visual system covers HR settings and organization/employee pages, OT, medical, attendance, time correction, reports, profile, inbox, announcements, notifications, calendar, benefits, delegation, onboarding, login, registration, and password reset. Report chart colors now use the light-blue tokens; login/register/reset use a dedicated visual stylesheet.

No new navigation actions or metrics were added. Existing loading, empty, error, role-filtered and API-backed behavior stays in place.

## Visual review evidence

- Captured browser previews at desktop and 390px for the existing overview, Leave, request list, approval queue, and login. Current-turn captures include the approval queue and login screens.
- Approval queue screenshot at 390px: `window.innerWidth = 390`, `document.documentElement.scrollWidth = 385` (no horizontal overflow).
- Login at 390px shows the centered light-blue background, white card, stacked controls, and full-width primary action.
- Preview uses local test/mocked services. Some management/OT endpoints are not represented by the local mock; their existing error/empty states are preserved and no behavior was invented.
- Screenshot images were shown during the review; no screenshot binary was added to Git.

## Changed areas

- Shared Desktop styles and existing overview/Leave visual layout.
- Request/approval selected filter styling.
- Report chart visual tokens.
- Login, registration and password-reset visual styles.
- This visual specification and progress record.

No logic files changed. The temporary local API rewrite, mock server, logs, and lint tooling were removed before staging.

## Verification and preview

- Scoped apps/web lint: PASS (ESLint, zero warnings).
- Scoped apps/web typecheck: PASS (`tsc --noEmit`).
- Scoped apps/web Vitest: PASS (22 files / 103 tests). The repository-wide Vitest suite was not run.
- Read-only inspection of `ckace-hr-web-test` in project `ckrr-leave-system-2026`, region `asia-southeast1`, showed a direct Cloud Run URL and only `CKACE_RUNTIME_STAGE` / `CKACE_MODULE_ROUTING` environment variable names; there is no API base URL in the service config.
- Desktop browser code calls same-origin `/api/...`; `apps/web/next.config.ts` has no rewrites and `apps/web/src/app/api` does not exist. A new Cloud Run `run.app` URL would not route those requests to `ckace-hr-api-test`. Firebase Hosting supplies the existing shared route but is forbidden by this task.
- Stopped before deploy per the explicit API-change gate. No preview service was created and no existing TEST service was changed; the only cloud operation was a read-only description of `ckace-hr-web-test`.
- Preview URL: none. Page-group commits pushed: `82e5b0f`, `78500fe`, `248c5be`.

## Needs decision

No design or product decision is needed. The remaining preview step requires API routing, which is outside the approved UI-only scope; the PM must build the pushed branch to TEST or the Owner must authorize a separate routing task.
