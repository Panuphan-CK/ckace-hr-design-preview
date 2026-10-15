# TASK-35 — Responsive + State QA

Date: 2026-10-14 Asia/Bangkok  
Project: `D:\CKACE_HR` / Project B only  
Environment: TEST only  
Verdict: **PASS**

## Goal

Close Web Desktop responsive and UI-state QA across real authenticated TEST rendering without changing Project A, LIFF/GAS/Gateway, Production, shared traffic, database data, R2 data, credentials, or TASK-36 cleanup state.

Required responsive widths:
- 399 px
- 824 px
- 1536 px

Required state coverage:
- Loading
- Empty
- Error
- Disabled

## Source Findings and Fixes

The Desktop source audit found concrete shared layout/state defects and applied bounded UI-only fixes:

- mobile sidebar navigation could exceed the viewport without its own scroll region
- narrow topbar/title/actions could be forced onto one line
- long IDs, labels, filenames and status text could stretch flex/grid children
- attachment names could be clipped rather than wrap safely
- several grid/form children lacked `min-width: 0`
- Onboarding detail grids and other form/grid sections needed safer narrow-width collapse
- Loading/Error semantics were not consistent across all data-backed Desktop pages
- Onboarding validation/API failure messages could be announced with success semantics
- Leave needed an explicit no-entitlement/exhausted-entitlement state that also disables submit

The resulting UI hardening includes:
- internal sidebar `overflow-y: auto` with `min-height: 0`
- responsive topbar wrapping
- `min-width: 0` across vulnerable flex/grid/card/form children
- `overflow-wrap: anywhere` for long values
- internal `.data-table-wrap { overflow-x: auto; }` containment rather than document-level overflow
- Loading states using `role="status"`, `aria-live="polite"`, `aria-busy="true"`
- Error states using `role="alert"`
- explicit Leave unavailable/exhausted entitlement message and disabled submission
- correct Onboarding error semantics
- existing busy/disabled controls retained

No API contract, authorization, business rule, persistence or storage behavior was changed.

## Source Files Changed

Shared:
- `apps/web/src/app/globals.css`
- `apps/web/src/app/desktop/desktop-shell.tsx`

Data-backed Desktop pages audited/hardened as needed:
- `apps/web/src/app/desktop/profile/page.tsx`
- `apps/web/src/app/desktop/leave/page.tsx`
- `apps/web/src/app/desktop/requests/page.tsx`
- `apps/web/src/app/desktop/approvals/page.tsx`
- `apps/web/src/app/desktop/attendance/page.tsx`
- `apps/web/src/app/desktop/overtime/page.tsx`
- `apps/web/src/app/desktop/medical/page.tsx`
- `apps/web/src/app/desktop/benefits/page.tsx`
- `apps/web/src/app/desktop/announcements/page.tsx`
- `apps/web/src/app/desktop/notifications/page.tsx`
- `apps/web/src/app/desktop/onboarding/page.tsx`
- `apps/web/src/app/desktop/admin/page.tsx`

## Isolated TEST Candidate

Cloud Build:
- build ID: `525196e9-ab45-427f-8259-d5adef2345d0`
- image tag: `task35-responsive-20261014a`
- build result: **SUCCESS**

Cloud Run:
- service: `ckace-hr-web-test`
- revision: `ckace-hr-web-test-task35-20261014a`
- tag: `task35-responsive`
- immutable digest:
  `sha256:f0afb619466061bc226571bad42b0badef1a44362b8e1ed2e293d6793ccd8f71`
- Ready = True
- Active = True
- ContainerHealthy = True
- ContainerReady = True
- TASK-35 candidate traffic = **0%**
- canonical Web baseline `ckace-hr-web-test-m9d15a` = **100%**

Final traffic re-read after Browser QA still shows baseline 100% and TASK-35 candidate 0%.

## Browser Test Boundary

Authenticated Browser QA used an owned loopback same-origin proxy:

`http://127.0.0.1:4198`

Verified upstreams:
- Web -> `task35-responsive` TEST candidate
- API -> existing `task30-uat` TEST candidate

Proxy marker:
`WD13_TEST_LOOPBACK_READY ... isolated TEST upstreams; no production routing`

No Production route was used.

The owned proxy process and owned CKACE HR browser tab were closed after QA.

## Authenticated Route × Viewport Matrix

Task evidence:
`2291fc8f-4365-41f7-94e4-c02796651631`

Authenticated matrix covered all 13 Desktop routes at exact browser CSS widths 399 / 824 / 1536:

- `/desktop`
- `/desktop/profile`
- `/desktop/leave`
- `/desktop/requests`
- `/desktop/approvals`
- `/desktop/attendance`
- `/desktop/overtime`
- `/desktop/medical`
- `/desktop/benefits`
- `/desktop/announcements`
- `/desktop/notifications`
- `/desktop/onboarding`
- `/desktop/admin`

Result for all **39 route/width combinations**:
- document-level horizontal overflow = **false**
- `scrollWidth == clientWidth`
- overflow offender list = empty
- candidate stylesheet rendered from the TASK-35 build

Responsive navigation:
- 399 / 824: menu button visible, sidebar fixed/off-canvas when closed
- 1536: menu button hidden, sidebar sticky/in-flow

## UI State Evidence

### Loading

Browser-local request interception paused only:
`GET /api/benefits/me`

At 399 px:
- `.module-state[role="status"][aria-busy="true"]` present
- visible Loading copy rendered
- no horizontal overflow

After releasing the request:
- busy state count returned to 0
- Benefits ready page rendered.

### Error

Browser-local interception synthesized an HTTP 503 for only the Benefits GET. This did not reach or mutate the API.

At 399 px:
- `.module-state[role="alert"]` present
- error badge/message rendered
- Retry button present
- no horizontal overflow

Task evidence:
`859e6436-74dc-40ba-b843-f00a6a595e53`

### Empty

Real synthetic TEST fixture rendered explicit empty states across modules, including:
- Requests
- Approvals
- Attendance
- Overtime
- Medical
- Benefits
- Onboarding
- Leave unavailable/request areas

No fabricated server records were created for Empty-state proof.

### Disabled

Real synthetic state rendered disabled controls:
- Leave: unavailable/exhausted entitlement disables submission
- Medical: unavailable amount/entitlement condition disables submission

The route matrix observed these disabled controls at 399 / 824 / 1536.

### Mobile navigation interaction

At 399 px:
- closed sidebar is fixed/off-canvas
- menu opens sidebar
- backdrop appears
- sidebar navigation has `overflow-y: auto`
- no document-level horizontal overflow
- backdrop closes the sidebar and disappears

No business action was invoked.

## Final Repository Verification

Fresh Development Lead command:
`npm run check`

Task:
`5567d00b-7368-43d1-9d10-262416963dd7`

Result: **PASS, exit 0**
- lint PASS
- typecheck PASS
- **78 / 78 test files PASS**
- **505 / 505 tests PASS**
- NestJS API build PASS
- Next.js production build PASS

## Safety / Non-Mutation

TASK-35 Browser QA:
- performed navigation/read-only GET rendering only
- used browser-local Fetch interception for Loading/Error
- did not submit Leave/Attendance/OT/Medical/Admin writes
- did not mutate Neon DEV
- did not mutate R2
- did not change credentials
- did not change Production
- did not change Project A
- did not change shared Web traffic

TASK-36 cleanup did not start.

## Final Decision

**TASK-35 = PASS.**

Responsive layout, navigation and Loading / Empty / Error / Disabled states are verified on the isolated TEST candidate.

Next gated task:
**TASK-36 — Exact TEST Data / R2 Cleanup**

Do not start TASK-36 without explicit Owner approval.
