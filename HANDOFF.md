# CKACE_HR — HANDOFF

Last Updated: 2026-10-26 Asia/Bangkok

## Current state

- Active executor: Codex Local. Application remote: `source` (`Panuphan-CK/ckace-hr`). Design-preview remote: `origin` (`Panuphan-CK/ckace-hr-design-preview`). Do not mix publication lanes.
- Live TEST baseline: **TESTm74** from unified `source/main` commit `1322ed48e98428ffd580a6ec2e8bb7cdec5132c7`. Cloud Build `3830ed94-07c4-49b5-a7e3-adaa073abd48` succeeded with `_VERSION=m74`, `_ROLLBACK_VERSION=m73`; all verify, image build/push, migrate, and deploy/verify steps passed.
- Local typecheck PASS and Vitest PASS (109 files / 796 tests via `vmThreads`) on the exact commit. Cloud Build ran lint, typecheck, and tests successfully before image build.
- Public health reported `stage=test`, `runtime=NON_PRODUCTION`, `serviceRevision=ckace-hr-api-test-m74`; Cloud Run API and Web each showed 100% traffic on their m74 revisions. Firebase Hosting live release message is `CKACE HR TEST m74`; public `/desktop` responded 200.
- Authenticated TESTm74 Leave workflow **PASS** for TEST request `LEV-0024`: Employee submitted a full-day personal leave for 12/11/2569; Manager `ckace.hr+manager@gmail.com` approved step 1; SuperAdmin `ckace.hr+super2@gmail.com` approved step 2; Employee detail and notification showed final `อนุมัติ` with both approvers and comments. TEST data is retained.
- Employee NAV destinations (Dashboard, Calendar, five Request pages, Inbox, Profile, Announcements) rendered; direct URLs for Approvals, Reports, and RBAC were denied as expected. Manager's five Reports, five Request destinations, four approval categories, Delegation, Onboarding, Calendar, and ten visible HR Settings destinations rendered; RBAC and approval-policy direct URLs were denied as expected. SuperAdmin's five report routes, Leave/OT/Time Correction/Medical/Attendance requests, four approval categories, Delegation, Onboarding, Calendar, all 12 visible HR Settings destinations, announcement management, and Platform Settings rendered. Its direct URLs for approval policies and RBAC rendered as allowed. The SuperAdmin HR settings routes specifically rechecked on 2026-10-26 included entitlements, work calendar/workdays, attendance policy, announcements, and Platform Settings.
- At emulated 390 px width, Employee Leave/request menu, Manager dashboard/approval/HR flyouts and checked HR pages, plus SuperAdmin dashboard/full HR flyout/RBAC and Platform Settings were checked. No checked document overflowed horizontally; Platform Settings measured `innerWidth=390`, `scrollWidth=386`. The temporary viewport override was reset and the in-app Browser was returned to authenticated SuperAdmin Dashboard.
- The authenticated Leave and role/NAV/direct-URL/responsive gate is **PASS** for its navigation/render scope. Adjacent non-Leave forms were not submitted; this does not claim full business-transaction coverage for those modules. No app regression was observed.
- Production remains **NO-GO**. No current proof yet for dedicated Production provisioning, data import/reconciliation, backup/recovery, monitoring, rollback drill, or source-of-truth switch. A named Owner approval is required for any Production action.

## Unified application source and authenticated TEST gate

- The Owner approved publication of the verified integration to `source/main` and then separately instructed `Build`. TESTm74 authenticated functional gate `TESTM74-REGRESSION-01` is now verified; the next active TASK is `PROD-READINESS-01` in `docs/codex/ACTIVE_TASK.md`.
- `source/main` at `04c3d54` and TESTm73 branch at `095e6bd` diverged. Main-only app/package/infra history is cleanup commit `bdb13a0`; it removes obsolete TEST/UAT controllers and legacy artifacts. TESTm73 carries newer Leave/NAV/functionality.
- The isolated worktree `D:\CKACE_HR\.worktrees\main-integration` produced merge commit `1322ed4`, which is published on `source/main`. Five Web and three continuity-file conflicts were resolved; TESTm73 page implementations and main-only removal of obsolete TEST/UAT controllers were retained. Continuity uses the current active-only format.
- Unused `apps/web/public/react-read/**` preview assets and dated `docs/HANDOFF_20261021.md` were excluded from the application candidate; originals remain recoverable in the TESTm73 branch/Git history. The protected current design artifact is unchanged.
- The merged permission-catalog test no longer reads the removed historical Production manifest. Its 48-key catalog is a test-only contract, not a runtime role grant. Targeted test passed. Full merged checks passed: lint, workspace typecheck, Vitest 109 files/796 tests, packages/API build, Web production build with `--webpack` (31/31 pages), and Prisma validation with a dummy Local URL. Default Turbopack build stalled locally; sandboxed webpack prerender first hit `EPERM`, then passed with local build-output write access.
- The primary `D:\CKACE_HR` checkout has extensive dirty/untracked Local work of uncertain provenance; it is untouched. The protected design artifact `D:\CKACE_HR\docs\design\desktop-20261018\**` remains untouched.
- The unified commit is published and live on TESTm74. No Production action was performed or authorized.
- Owner-requested Local housekeeping on 2026-10-25 removed seven clean legacy worktrees with `git worktree remove` and pruned one already missing checkout registration. Branch refs remain. The dirty primary checkout, `main-integration`, `m72-nav-a11y`, and protected design files remain intact.

## Immediate next action

Perform a read-only Production readiness gap assessment from Local source, migrations, deployment configuration, and current documentation. Identify missing evidence and material Owner decisions before proposing any Production action. Production remains NO-GO; do not access or modify Production.

## Safety rules

Preserve uncertain Local work. Do not reset, clean, stash, discard or force-push it. Do not inspect Project A without explicit Owner direction. Do not touch Production, Secret Manager, IAM, gateways, project settings or protected design material without the required approval. Git history is the archive; keep only one active task in the working tree.
