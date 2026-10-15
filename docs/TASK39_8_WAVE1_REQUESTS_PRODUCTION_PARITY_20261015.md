# TASK-39.8 — Wave 1 Production UI Parity: My Requests

Date: 2026-10-15 Asia/Bangkok  
Project: `D:\CKACE_HR` / Project B only  
Wave: **1 / 4**  
Verdict: **PASS**

## Goal

Bring the employee-facing My Requests experience materially closer to the existing Production visual language while preserving Project B server-authoritative authorization, APIs, business rules, Leave-first information architecture and responsive behavior.

Project A `D:\APP_Leave` was used strictly as a **read-only visual/interaction reference**.

## Scope

Wave 1 covers:
- shared Production-style request workspace primitives
- Leave
- OT
- Time Correction
- Medical Claim

Wave 1 does **not** cover Approval Work, Reports, Employee/Admin/Leave Settings or Platform Settings. Those remain TASK-39.8 Waves 2–4.

## Production Reference

Primary read-only references:
- `D:\APP_Leave\page\01_Leave.html`
- `D:\APP_Leave\page\02_Approval.html`
- `D:\APP_Leave\css.html`

Production patterns retained as visual guidance:
- clean page heading + supporting description
- white cards on `#f3f4f8`
- Prompt typography
- rounded `1rem` surfaces and soft Production shadow
- search input with icon
- month filter
- gray clear action
- green create action
- simple table/card content hierarchy
- Production-like forms and field focus states.

## Implemented

### Shared Request Workspace

`apps/web/src/app/desktop/request-workspace-tabs.tsx`
- standardized New / In Progress / History navigation
- Production-style blue active state
- count badges
- shared `RequestListToolbar` with:
  - search
  - month filter
  - clear
  - create action
- Thai month labels
- responsive toolbar behavior.

### Leave

`apps/web/src/app/desktop/leave/page.tsx`
- Production-style request page wrapper
- existing New / In Progress / History architecture retained
- In Progress and History now receive Production-like search/month/clear/create toolbar
- search covers Leave type, description, status and decision reason
- month filtering uses request start date
- existing entitlement, approval-option, cancellation and submission behavior unchanged.

### Overtime

`apps/web/src/app/desktop/overtime/page.tsx`
- Production-style request page wrapper
- toolbar added to In Progress / History
- search covers reason, status and segment date/time
- month filtering uses first OT work date
- Attendance linkage remains server-derived and read-only on the client.

### Time Correction

`apps/web/src/app/desktop/attendance/page.tsx`
- Production-style request page wrapper
- correction New / In Progress / History navigation retained
- toolbar added to correction In Progress / History
- search covers correction type, status, date, reason and decision comment
- month filtering uses attendance date
- Check-in / Check-out GPS and server-authoritative attendance behavior unchanged.

### Medical Claim

`apps/web/src/app/desktop/medical/page.tsx`
- Production-style request page wrapper
- toolbar added to In Progress / History
- search covers description, status, amount and sickness date
- month filtering uses sickness date
- private receipt upload/download behavior and server authorization unchanged.

### Shared Visual Layer

`apps/web/src/app/globals.css`
- Production-style request headings
- white request panels with Production radius/shadow
- Production-like tab navigation
- clean metric and entitlement cards
- standardized forms, inputs, focus state and helper text
- standardized tables and hover state
- simplified request/history cards
- responsive search/filter/create toolbar
- responsive layout at mobile/tablet/desktop breakpoints.

## Verification

### TypeScript

Task `abc4a52f-6523-4e91-b68d-7ee6862a1483`  
Web typecheck = **PASS, exit 0**

Earlier Wave 1 typecheck task `8cf03921-ab6f-416d-8601-1eb2a71dc7a3` also passed.

### ESLint

Task `caa89e29-a8d2-489d-8405-d824e10cdd40`  
`npm run lint -w @ckace/hr-web` = **PASS, exit 0**

### Focused functional regression

Task `93c88207-2d0b-4095-8b96-e40888a57dd9` = **PASS**

- 6 / 6 test files
- 32 / 32 tests

Covered:
- Attendance action behavior
- Attendance view helpers
- OT view helpers
- Medical view helpers
- Medical private receipt upload behavior
- submission-intent / ambiguous-write client behavior.

### Build

Task `807c23ad-73f8-4e67-a69b-3ecfed7129d2` = **PASS, exit 0**

- package builds PASS
- API build PASS
- Web build PASS
- Next.js **22 / 22 static pages generated**

Additional Web-only production build `93cfb07d-7fdf-4e6d-b5ae-309ab42c768d` = PASS.

### Browser responsive QA

Local read-only fixture:
`http://127.0.0.1:4181`

Routes:
- `/desktop/leave`
- `/desktop/overtime`
- `/desktop/attendance#correction-request`
- `/desktop/medical`

Widths:
- 399 px
- 824 px
- 1536 px

Result: **12 / 12 route-width checks PASS**

Verified on every combination:
- no page-level horizontal overflow
- 3 workspace tabs present
- New view selected initially
- In Progress view exposes request toolbar
- responsive tab layout is stable
- no fixture alert/error.

Responsive toolbar:
- 399: 1-column toolbar
- 824: 2-column toolbar
- 1536: search + month + clear + create in one row.

### Browser interaction QA

All four modules verified:
- switch New → In Progress
- search field reacts to no-match value
- empty state appears correctly
- Clear resets search and month
- switch to History
- History toolbar is available
- Create action returns to New
- no page-level horizontal overflow
- no alert/error under fixture.

Route-specific labels confirmed:
- Leave → `ขออนุญาตลา`
- OT → `ขอ OT`
- Time Correction → `ขอแก้ไขเวลา`
- Medical → `เบิกค่ารักษา`.

## Files Changed

- `apps/web/src/app/desktop/request-workspace-tabs.tsx`
- `apps/web/src/app/desktop/leave/page.tsx`
- `apps/web/src/app/desktop/overtime/page.tsx`
- `apps/web/src/app/desktop/attendance/page.tsx`
- `apps/web/src/app/desktop/medical/page.tsx`
- `apps/web/src/app/globals.css`
- `docs/TASK39_8_WAVE1_REQUESTS_PRODUCTION_PARITY_20261015.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

## Security / Scope

Preserved:
- frontend is not authorization authority
- server-derived identity/capabilities remain authoritative
- API authorization remains final authority
- no automatic ambiguous-write retry
- Medical private files remain server-authorized
- Attendance location/write rules remain unchanged.

Not performed:
- Project A write
- Production deployment
- shared TEST traffic switch
- LINE LIFF change
- GAS/Gateway change
- Neon PROD mutation
- DNS/Firebase routing change
- credential/security escalation.

## Decision

**TASK-39.8 Wave 1 = PASS.**

Wave 1 is closed. TASK-39.8 remains active with:
- Wave 2 — Approval Work
- Wave 3 — Reports
- Wave 4 — Employee/Admin/Leave Settings/Platform Settings
- final whole-task responsive/functional regression and Owner visual review still pending.
