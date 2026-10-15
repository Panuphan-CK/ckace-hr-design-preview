# TASK-39.8 — Wave 2 Production UI Parity: Approval Work

Date: 2026-10-15 Asia/Bangkok  
Project: `D:\CKACE_HR` / Project B only  
Wave: **2 / 4**  
Verdict: **PASS**

## Goal

Bring Project B Approval Work materially closer to the existing Production approval experience while preserving Project B server-authoritative authorization, approval APIs, decision semantics and Leave-first information architecture.

Project A `D:\APP_Leave` was used strictly as a **read-only visual/interaction reference**.

## Production Reference

Primary reference:
- `D:\APP_Leave\page\02_Approval.html`

Confirmed Production patterns:
- Search + Reload header
- approval queues rendered as cards
- Desktop queue = 3 cards per row
- medium layout = 2 cards per row
- mobile = 1 card per row
- clear status/action hierarchy
- approve/reject actions at the card footer
- simple white-card surfaces on Production background.

Project A legacy localStorage role filtering and GAS behavior were not copied.

## Implemented

### Approval Workspace
`apps/web/src/app/desktop/approvals/page.tsx`

- kept separate **รอฉันอนุมัติ / ประวัติการอนุมัติ** views
- kept server-backed `/api/requests/assigned` and `/api/requests/assigned/history`
- retained module filters for Leave / Time Correction / OT / Medical / All
- module-filter heading now follows selected approval function
- added module icon/tone presentation matching Production card language
- pending queue redesigned as Production-style cards
- each pending card now has:
  - module icon/type
  - approval step
  - pending status
  - employee name
  - request summary
  - submitted timestamp
  - comment/reason field
  - approve/reject footer actions with icons
- no unsupported “view details” action was invented because current Project B unified request contract does not expose a generic detail endpoint
- approval history changed from stacked cards to a Production-style table with:
  - type
  - employee
  - summary
  - decision
  - approval step
  - comment
  - decision timestamp.

### Visual Layer
`apps/web/src/app/globals.css`

- Production-style Approval heading/search/reload layout
- filter cards with module icons/counts
- pending approval card color rails/tone
- 3 / 2 / 1 responsive queue grid
- white card/header/body/footer separation
- Production-like textarea and action hierarchy
- table-based history with horizontal table scrolling contained inside the table wrapper
- no page-level horizontal overflow in tested queue routes.

## Security / Behavior Preserved

- frontend remains presentation only
- assigned approvals remain server-filtered
- `canDecide` + `approvalStepId` remain required before rendering actionable rows
- decision API endpoints remain unchanged
- rejection still requires a reason
- 403 / 409 / 503 handling remains unchanged
- no automatic retry after ambiguous writes was added
- no localStorage role authority was introduced.

## Verification

### Web TypeScript
Task `730a35c2-2f8f-4311-a1f0-dc8c34f480aa`

Result: **PASS, exit 0**

### Web ESLint
Task `e8a7fd57-2fa4-41e6-97ac-eb4e9255b87c`

Result: **PASS, exit 0**

### Focused Approval / Navigation Regression
Task `8eff923d-8ff1-4bdc-861a-7ac16a562cfc`

Result: **PASS**
- 2 / 2 test files
- 12 / 12 tests
- request-status controller permission path
- Desktop capability/navigation regression.

### Web Production Build
Task `d98c3b6d-9f82-428b-9e1a-1a1fe6735f3e`

Result: **PASS, exit 0**
- Next compile PASS
- TypeScript PASS
- **22 / 22 static pages generated**.

## Browser QA

Local read-only QA fixture:
`http://127.0.0.1:4181/desktop/approvals`

Pending queue matrix:
- hashes: `#all`, `#leave`, `#overtime`, `#time-correction`, `#medical`
- widths: 399 / 824 / 1536
- result: **15 / 15 PASS**

Verified:
- no page-level horizontal overflow
- no fixture alert/error
- queue columns = **1 / 2 / 3** at 399 / 824 / 1536
- module-specific heading follows hash/filter
- fixture rows filter correctly by module.

Interaction QA:
- pending → history view switch works
- history uses table layout
- fixture history contains expected 2 rows in All view
- module filter `#leave` reduces history to the matching row
- pending view restores correctly
- search for `Audit` reduces All pending queue to the matching OT card
- approve/reject buttons were **not clicked** because Wave 2 browser QA is read-only and must not perform business writes.

## Files Changed

- `apps/web/src/app/desktop/approvals/page.tsx`
- `apps/web/src/app/globals.css`
- `docs/TASK39_8_WAVE2_APPROVALS_PRODUCTION_PARITY_20261015.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

## Not Performed

- Project A write
- Production deployment
- shared TEST traffic mutation
- LINE LIFF change
- GAS/Gateway change
- Neon PROD mutation
- DNS/Firebase routing change
- credential/security change.

## Decision

**TASK-39.8 Wave 2 = PASS.**

TASK-39.8 remains active with:
- Wave 3 — Reports
- Wave 4 — Employee/Admin/Leave Settings/Platform Settings
- final whole-task responsive/functional regression and Owner visual review.
