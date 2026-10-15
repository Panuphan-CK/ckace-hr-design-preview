# TASK-39.5 — Desktop Production Parity + UX/UI & Usability Final Review

Date: 2026-10-14 Asia/Bangkok  
Project B: `D:\CKACE_HR`  
Production legacy baseline: Project A `D:\APP_Leave` / immutable Apps Script Desktop v38  
Scope: **Desktop Web only**  
LINE LIFF: **EXPLICITLY OUT OF SCOPE**  
Status: **PASS**

## Final Verdict

**TASK-39.5 = PASS.**

Project B Desktop now satisfies the approved Production-parity scope through a secure replacement architecture. Production v38 remains the UX/business-capability baseline, but Project B keeps server-authoritative authentication, permissions, scoped reads/writes, audit boundaries and private-storage controls instead of copying legacy client authority.

This PASS is a **source + local browser + full-repository verification verdict**. It is not a Production deployment/cutover approval. No Production data, routing, DNS/Firebase, Neon PROD, Project A source, LINE LIFF, GAS or Gateway was mutated by TASK-39.5.

## Completed Scope

### TASK-39.5A — Employee-facing safe parity — PASS

Completed and retained:
- Production-style Login with Prompt, C.K.ACE branding, password reveal, remember-username-only, registration and dark mode.
- Truthful Login identity field: **อีเมล / ชื่อผู้ใช้**; no assumption that every login name is an email.
- Public registration over the canonical onboarding contract.
- Secure employee Dashboard using real Leave / Attendance / OT / Medical contract data.
- Authenticated Check-in / Check-out with a fresh geolocation request for each write.
- Leave, Requests/Approvals, Attendance, OT, Medical, Benefits, Profile, Notifications, Onboarding and Announcements daily flows retained.
- No automatic retry of ambiguous business writes.

### TASK-39.5B — Calendar / Reports / Admin parity — PASS

Implemented and verified:
- Leave Calendar monthly view with previous/today/next navigation, status presentation and list view.
- Management Reports for Leave / Attendance / OT / Medical with date filtering and CSV export; spreadsheet formula-injection mitigation retained.
- User Management with account-state, Agency, Department and Role administration.
- Purpose-specific user-role replacement endpoint protected by `rbac.admin.write` and audited.
- Agency and Department administration.
- Leave Entitlement administration.
- Holiday and Weekly Workday administration.
- Server-authoritative Role / Permission matrix.
- Announcement Administration: admin list/search, GLOBAL/AGENCY/DEPARTMENT scope, create/edit, publish/unpublish and bounded delete.
- Announcement updates cannot relink attachments; editing an already-published announcement preserves its original `publishedAt`.
- Attachment-bearing announcements cannot be casually deleted; unpublishing is the safe replacement.
- Password Recovery secure replacement: admin-issued signed reset link, 15-minute expiry, credential-version invalidation, one-time replay resistance and hashed password replacement.
- System Settings Production-style surface implemented as a safe read-only runtime/settings view rather than exposing infrastructure secrets or legacy Sheet/GAS controls.
- Production-style Desktop shell/sidebar/navbar, cards, forms, tables, status badges, dark mode and responsive behavior.

## Server-authoritative security decisions

New/explicit navigation/write capabilities remain server-derived:
- `calendar.leave.read`
- `reports.management.read`
- `users.admin.read` / `users.admin.write`
- `organization.admin.read` / `organization.admin.write`
- `leave.entitlements.admin.read` / `leave.entitlements.admin.write`
- `work_calendar.admin.read` / `work_calendar.admin.write`
- `rbac.admin.read` / `rbac.admin.write`
- `credentials.reset.issue`
- `announcements.admin.write`
- `announcements.admin.delete`

The Web UI also consumes narrow server-derived write capabilities so read-only administrators do not receive apparently active mutation controls. This is UX gating only; API authorization remains the final authority.

## Intentional secure differences from Production v38

These are accepted secure replacements/retirements, not parity defects:
- No unauthenticated credential modal for time logging; attendance writes require an authenticated server-derived actor.
- No client/localStorage role authority.
- No editable secrets, Sheet IDs, folder IDs, runtime routing or infrastructure configuration in ordinary admin UI.
- No casual destructive archive-year delete UI.
- No chatbot backend/UI invented where Project B has no canonical chatbot contract.
- No unsupported data/chart is fabricated merely to match a legacy visual.
- Reports export CSV instead of recreating legacy client-side Excel behavior; exported cells retain formula-injection mitigation.
- Project A is reference-only and remains unchanged.

## Final automated verification

Canonical final regression:
- `npm run check` task `9ab2df38-2458-44fe-b651-ab870a2b44f6` = **exit 0**
- lint = PASS
- all workspace typechecks = PASS
- **83 / 83 test files PASS**
- **571 / 571 tests PASS**
- package builds = PASS
- NestJS API build = PASS
- Next.js production build = PASS
- Next generated **22 / 22 static pages** including Login, Reset Password, Desktop, Calendar, Reports, Admin and Management.

Focused TASK-39.5B security/API regression also passed:
- **7 / 7 files**
- **112 / 112 tests**
- Management permission metadata/validation PASS
- Password Recovery issue/reset/expiry/replay/tamper boundaries PASS
- Announcement permission/update/delete boundaries PASS
- Module-route coverage PASS.

## Final Browser QA

Local Browser QA used the freshly built Web application plus an **in-memory QA API proxy only**. No shared TEST/Production DB or R2 mutation occurred.

Desktop validation passed for:
- Login
- Reset Password
- Dashboard
- Calendar
- Reports
- System Settings
- Announcement Admin
- User Management
- Role / Permission Administration
- Agency
- Department
- Leave Entitlements
- Holidays
- Weekly Workdays.

Verified Production-style characteristics include Prompt typography, `#f3f4f8` light background, floating sidebar/navbar, C.K.ACE branding, correct active sidebar item, white rounded cards, bounded internal table scrolling and no page-level horizontal overflow.

Announcement Admin browser checks confirmed:
- GLOBAL / AGENCY / DEPARTMENT scope options
- list/search surface
- edit form population
- delete button available only under the explicit delete capability
- attachment-bearing row delete disabled.

User Management browser checks confirmed:
- user/account/org controls render enabled only under the matching write capabilities in the all-permission QA fixture
- role assignment controls and password-recovery action render correctly
- no page-level horizontal overflow.

## Responsive verification

Fresh iframe-isolated CSS viewport QA was run against the final Production build at **399 / 824 / 1536 px**.

Core affected routes:
- Login
- Reset Password
- Dashboard
- Calendar
- Reports
- System Settings
- Announcement Admin
- Users
- Roles

Results:
- **27 / 27 core route-width combinations rendered and had no page-level horizontal overflow.**
- Dashboard leave cards: 1 / 2 / 3 columns at 399 / 824 / 1536.
- Calendar: 1 / 3 / 7 columns at 399 / 824 / 1536.
- Reports: 1 / 2 / 2 columns.
- Mobile menu is visible at 399/824 and hidden at 1536.
- Mobile sidebar is off-canvas when closed, opens to `translateX(0)`, supplies a backdrop, keeps navigation vertically scrollable and closes through the backdrop without page overflow.
- Management Agency / Department / Entitlement / Holiday / Workday sections were additionally checked at 399 and 1536: all rendered, active-menu mapping was correct, no page-level overflow; wide tables scroll only inside their bounded table container on mobile.

## Files materially changed by TASK-39.5

Major areas include:
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/reset-password/page.tsx`
- `apps/web/src/app/desktop/desktop-shell.tsx`
- `apps/web/src/app/desktop/page.tsx`
- `apps/web/src/app/desktop/calendar/page.tsx`
- `apps/web/src/app/desktop/reports/page.tsx`
- `apps/web/src/app/desktop/admin/page.tsx`
- `apps/web/src/app/desktop/admin/management/page.tsx`
- `packages/contracts/src/management.ts`
- `packages/contracts/src/password-recovery.ts`
- `packages/contracts/src/announcements.ts`
- `packages/database/src/management-repository.ts`
- `packages/database/src/password-recovery-repository.ts`
- `packages/database/src/announcement-repository.ts`
- `apps/api/src/management/*`
- `apps/api/src/security/password-recovery*`
- `apps/api/src/security/desktop-navigation.ts`
- `apps/api/src/announcements/*`
- focused security/management/announcement tests.

## Residual risks carried to TASK-40 / TASK-41

These do **not** reopen TASK-39.5:
1. Latest TASK-39.5 source and new permission keys are not automatically seeded/promoted to shared TEST or Production by this task.
2. Runtime Password Recovery signing configuration must be provisioned through approved secret/config deployment before hosted use; no secret value is stored in source/docs.
3. Prompt/Boxicons/Font Awesome currently retain external asset/CDN dependencies; local bundling can be evaluated as deployment hardening.
4. Authenticated Production v38 runtime was not re-authorized merely for comparison; parity evidence uses immutable v38 source/existing evidence plus safe accessible runtime evidence.
5. Shared-TEST deployment, migration/rollback/monitoring, permission seeding and Production cutover belong to later readiness/go-live gates.

## Final boundary

TASK-39.5 is closed on the basis that the approved Desktop launch capability set is implemented or intentionally replaced by a safer equivalent, actual source was reviewed, automated regression passed, final responsive/browser QA passed, and no unresolved blocker remains inside TASK-39.5.

**TASK-39.5 = PASS.**

Next project gate: **TASK-40 — Production Readiness Plan**. Do not deploy Production or alter source-of-truth/routing without a separate explicit approval.
