# WD-01 — Web Desktop Full Functional Audit

Date: 2026-10-08, Asia/Bangkok
Workspace: `D:\CKACE_HR` (Project B), ID `1cdcf094-fccf-4de1-8512-8db104979d49`
Scope: **Web Desktop UI and Desktop-only API/contracts/read-only QA**. No Project A `D:\APP_Leave`, GAS, LINE Gateway, Rich Menu, Flex, Web LIFF/mobile or Production mutation.

## Decision / evidence limits

- **WD-01 source/API audit: COMPLETE WITH FOLLOW-UPS**. The code for Desktop routes and corresponding canonical NestJS controllers exists. Prior M9D milestone PASS statuses are supported by code and tests, not evidence of every browser workflow succeeding with a real current employee.
- This review was a local read-only code/API inspection with a fresh local repository QA run. It did **not** call authenticated live hosted workflows, upload/download real R2 objects, perform Production UAT, stage/deploy, mutate a database, or change route authority.
- Security boundary: actor/permissions are generated server side by `/api/security/session`; Desktop menu capability only controls presentation. Controller permission + canonical repository rules remain authoritative. `apps/api/src/security/desktop-navigation.ts` and each controller were inspected.
- Current authority: `LEGACY`. Production Cutover remains **NO-GO**, not part of WD-01.
- Historical Git state has no approved baseline commit (hundreds of existing untracked/staged entries). No commit/push or unrelated rewrite.

## Desktop route-to-API audit matrix

| Desktop route | UI → canonical API contract actually referenced | Source audit |
| --- | --- | --- |
| `/login` | GET `/api/security/session`, POST `/api/desktop-auth/login`; shell POST `/api/desktop-auth/logout` | Present; actual session/API guards implemented; logout network-error UX follow-up |
| `/desktop` | No HR data API; static milestone/foundation cards | Present, intentional static placeholder; dynamic HR dashboard not implemented |
| `/desktop/leave` | GET `/api/leave/me`, GET `/api/leave/approval-options`, POST `/api/leave/requests`, POST `/api/leave/requests/:id/cancel` | Present; idempotency/error UX follow-up |
| `/desktop/requests` | GET `/api/requests/me` | Present; unified LEAVE/TIME_CORRECTION/OVERTIME/MEDICAL filters |
| `/desktop/approvals` | GET `/api/requests/assigned`, POST four canonical decision routes for LEAVE/TIME_CORRECTION/OT/MEDICAL | Present; server filters allowed kinds based on four `*.approve` permissions; response approvalStepId/canDecide confirmed from repository |
| `/desktop/attendance` | GET `/api/attendance/me`, GET `/api/attendance/time-corrections/me`, POST `/api/attendance/time-corrections`, POST `/api/attendance/time-corrections/:id/cancel` | Present; Check-in/Check-out Desktop UI intentionally not implemented |
| `/desktop/overtime` | GET `/api/overtime/me`, POST `/api/overtime/requests`, POST `/api/overtime/requests/:id/cancel` | Present; server-owned attendance linking |
| `/desktop/medical` | GET `/api/medical/me`, optional GET `/api/leave/me`, POST `/api/attachments/upload-intent`, PUT signed upload, POST `/api/attachments/:id/finalize`, POST `/api/medical/claims`, POST `/api/medical/claims/:id/cancel`, POST `/api/attachments/:id/download` | Present; private R2 upload browser flow must be tested hosted |
| `/desktop/benefits` | GET `/api/benefits/me` | Present; existing contract only Medical annual entitlement + OT/Medical activity |
| `/desktop/announcements` | GET `/api/announcements`, POST `/api/announcements/:id/attachments/:attachmentId/download` | Present; company Activities has no independent contract |
| `/desktop/notifications` | GET `/api/admin/notifications`, POST `/api/admin/notifications/:id/retry` | Present for **admin delivery outbox**, not an employee inbox |
| `/desktop/profile` | GET `/api/profile/me`, GET `/api/security/session`, POST `/api/attachments/:id/download` | Present, intentionally read-only |
| `/desktop/onboarding` | GET `/api/onboarding/pending`, GET `/api/onboarding/approval-options`, POST `/api/onboarding/employees/:id/approve` | Present; does not duplicate underlying approval write |
| `/desktop/admin` | GET `/api/security/session`, conditional GET `/api/admin/settings` only with `adminSettings` capability, POST `/api/announcements` with `announcementAdmin` | Present; security-aware conditional admin reads, generic admin editors not implemented |

All referenced controllers were found in `apps/api/src/**`. Tests and source confirm `@ModuleRoute` and permission guards. Existence of routes is **not** proof of current hosted write-authority availability.

## Findings requiring separate corrective tasks

| ID | Priority | Classification | Evidence | Required fix or verification |
| --- | --- | --- | --- | --- |
| WD01-F01 | P1 | **Source-confirmed resilience gap / duplicate-write risk** | `desktop/leave/page.tsx` POST at ~140, `overtime/page.tsx` ~149, `medical/page.tsx` ~306, `attendance/page.tsx` ~269 generate a **new** `clientKey` for every fresh submission. An uncertain network result followed by a manual retry uses a different key, so endpoint idempotency cannot by itself dedupe the same user intention. This is NOT proof of duplicate database rows. | Keep an intent-scoped retry identifier and reconcile/request history after ambiguous commits; write fault-injection tests before claiming duplicate prevention. Prioritize Medical attachment/claim state. |
| WD01-F02 | P1 | **Source-confirmed logout UX gap** | `desktop/desktop-shell.tsx`: `logout()` redirects to `/login` unconditionally in `finally`, even if POST logout rejects or never receives the cookie-clearing response. | Treat failed logout as an explicit error or safe retry; verify actual cookie invalidation/session expiry. Do not claim logout completed on network failure. |
| WD01-F03 | P1 | **Browser behavior to verify** | `medical/page.tsx` `downloadReceipt()` calls `window.open` after awaiting a download-grant API. `announcements/page.tsx` does the same for announcement attachments; popup blockers can reject async-created tabs. The Medical flow does not consume grant `requiredHeaders` whereas other Desktop download flows account for them; current R2 GET signer reports empty headers. | Real desktop browser click-to-open/private R2 tests with popup blocking, HEADERS, permissions, expired links and 401/403; use a reliable explicit link/download pattern. |
| WD01-F04 | P2 | **Time-zone display discrepancy risk** | `requests/page.tsx` and `approvals/page.tsx` use `new Date(...).toLocaleString('th-TH')` without `timeZone: 'Asia/Bangkok'`; other Desktop pages explicitly use Bangkok. | Unify timestamp formatting, test with browser timezone outside Thailand; does not change stored canonical timestamps. |
| WD01-F05 | P1 | **Medical ambiguous-commit lifecycle risk** | `medical/page.tsx` `submitClaim()` attempts `cleanupAttachments(attachmentIds)` for any thrown error, including post-POST failure/uncertain response. Depending on whether claim committed, cleanup may be rejected or the user may retry and create another claim with a fresh key. No live data mutation or loss was established. | Add explicit uncertain-result handling + readback, ensure linked-file deletion is impossible, test interrupted response after successful claim transaction and private attachment consistency. |
| WD01-F06 | P2 | **Broader failure-state/UX follow-up** | Frontends have loading/error/retry and disabled controls, but source-only review does not establish real browser coverage for all role/403/404/409/503, abandoned requests and concurrent clicks. | WD-10/11 executable UI tests at relevant desktop widths with injected API failure and role-scoped fixtures. |

## Deliberately unsupported capabilities, not current bug fixes

| ID | Current evidence | Decision for Desktop backlog |
| --- | --- | --- |
| WD01-G01 | `/desktop/announcements` has an explicit Activity source-not-connected state. No Project B Activities controller/repository/contract. | New Activities API+Desktop scope requires separate bounded requirement. |
| WD01-G02 | NotificationOutbox is admin ops only; no employee recipient/read/unread contract. | New employee Inbox requires separate data/contract design. |
| WD01-G03 | `/desktop/profile` currently reads; no self-edit/password-reset/media replacement contract. | Defer to explicit Profile-write milestone. |
| WD01-G04 | `/desktop/admin` intentionally combines canonical Onboarding, Notifications, Admin settings, Announcement create; generic employee/role/policy editor unavailable. | Do not fake unsupported writes. |
| WD01-G05 | Attendance Controller has check-in/out backend routes but this Desktop page intentionally does not expose them. | Owner feature decision, not WD-01 defect. |
| WD01-G06 | `/desktop` static milestone cards; Benefits uses only currently supported canonical projection. | Dashboard/data and new benefit categories are optional feature requirements. |

## Verification / coverage

- Read-only initial audit: workspace root `D:\CKACE_HR`, `AGENTS.md`, `HANDOFF.md`, `PROJECT_PLAN.md`, git status, active Goals/Tasks/Processes; initial Project B Goals/Tasks/Processes running = 0.
- Inspected 14 Web entry screens (13 `/desktop` routes plus `/login`), shared Desktop shell, Desktop navigation/permissions, and 14 matching API controller/security files, plus canonical Request Status persistence and relevant storage grant implementations.
- Source audit: all primary referenced REST endpoints were located; relevant forms contain loading/empty/error/disabled states. **No full real-browser execution in this WD-01 audit.**
- `npm run check`: lint PASS; typecheck PASS; Vitest **67 files / 402 tests PASS**. Build result: **PASS** (API TypeScript build, Next.js 16.3.8 production build, 18 static pages including 13 Desktop routes plus Login). Final `npm run check` exit code **0**.
- Do not conflate the historical hosted M9D.15 authenticated synthetic TEST UAT with a fresh WD-01 browser test. WD-11/WD-13 remain open.
- No Project A, Web LIFF, GAS/LINE/Rich Menu, Production, DNS, credentials, module-routing, Neon or R2 business object mutation.

## Recommended next bounded task

**WD-02 first — Desktop Session/Logout failure-state QA** (P1 source-confirmed gap), then grouped WD-10 ambiguous-write retry/Medical-private-attachment lifecycle, then WD-11 Desktop browser and role-specific E2E. Complete production-readiness gates only by a separate Owner decision; never resume M10D.4B Legacy code.

## Status

**WD01_AUDIT_PASS_WITH_FOLLOWUPS**. The source-to-contract audit and local verification are complete; final `npm run check` exited 0. Current Desktop code is **not certified Production-ready** by this audit; WD-02/WD-10/WD-11/WD-13 remain distinct QA and implementation tasks.
