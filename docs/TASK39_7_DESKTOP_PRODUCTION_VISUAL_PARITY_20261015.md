# TASK-39.7 — Desktop Production Visual Parity Polish

Date: 2026-10-15 Asia/Bangkok  
Project: `D:\CKACE_HR` / Project B only  
Scope: Web Desktop visual/usability polish after TASK-39.6  
Verdict: **PASS**

## Goal

Apply the Owner's post-TASK-39.6 visual feedback while preserving the new Leave-first information architecture, server-authoritative authorization, responsive behavior and existing business rules.

Project A `D:\APP_Leave` was used only as a **read-only Production visual reference**. No Project A, Production, LINE LIFF, GAS or Gateway mutation was performed.

## Owner Feedback Addressed

1. Move **ประชาสัมพันธ์** to the bottom of Dashboard and render 3 cards per row on Desktop.
2. Make the year/period filter match Production more closely.
3. Improve **สิทธิวันลาและการใช้งาน** and **สัดส่วนวันลาที่อนุมัติแล้ว** to Production-quality visuals.
4. Move **รายการการลาทั้งหมด** below the Calendar and redesign it for readability.
5. Polish all affected Desktop functions because the Production visual language was stronger than the first TASK-39.6 pass.

## Production Visual Reference Audit

Read-only references:
- `D:\APP_Leave\page\00_Dashboard.html`
- `D:\APP_Leave\page\03_Calendar.html`
- `D:\APP_Leave\css.html`

Confirmed Production visual language:
- page background `#f3f4f8`
- white primary surfaces
- dark primary text / muted secondary text
- soft `0 8px 25px rgba(0,0,0,.07)` shadow
- rounded floating sidebar/topbar/cards
- blue active navigation
- Dashboard period flyout with shortcuts/month picker
- colored Leave entitlement cards
- chart-style Leave usage and doughnut approved-leave proportion.

## Implemented

### Dashboard announcements
- moved to the final Dashboard section
- Desktop: **3 cards/row**
- Tablet: **2 cards/row**
- Mobile: **1 card/row**
- existing announcement read/admin/delete capability boundaries preserved.

### Production-style period filter
- year/period button opens a Production-like flyout
- shortcuts: **ปีนี้ / เดือนนี้ / เดือนที่แล้ว**
- month picker with Buddhist year navigation and 12 Thai month abbreviations
- clear-filter action
- selected period drives Leave / OT / Medical / Attendance Dashboard metrics
- no unsupported organization-wide employee scope was invented.

### Leave entitlement and approved-use visuals
- colored entitlement cards restored to Production hierarchy
- used days shown prominently
- total quota, progress bar and used percentage shown per Leave type
- **สิทธิวันลาและการใช้งาน** uses vertical chart-style bars from approved Leave usage in the selected period
- **สัดส่วนวันลาที่อนุมัติแล้ว** uses a doughnut visualization
- zero-use Leave categories are omitted from the proportion legend
- explicit empty state when the selected period has no approved Leave.

### Calendar
- Leave list moved permanently **below** the calendar
- month summary counts added
- status legend added
- calendar cells show up to three items plus overflow count
- below-calendar list redesigned as status-rail cards
- list layout: 2 columns on Desktop/Tablet, 1 on Mobile
- Buddhist date display retained.

### Global Desktop visual polish
TASK-39.6 information architecture remains intact, while the visual layer now follows Production more closely:
- `#f3f4f8` background
- white cards/surfaces
- Production-like shadow/radius
- blue active navigation
- reduced translucent/glass treatment
- Prompt remains the primary font
- capability-aware hierarchical Sidebar remains
- mobile drawer behavior remains.

Representative functions inspected:
- Dashboard
- Calendar
- Leave
- OT
- Attendance / Time Correction
- Medical
- Approval Work
- Reports
- Employee Master
- Platform Settings.

## Files Changed

- `apps/web/src/app/desktop/page.tsx`
- `apps/web/src/app/desktop/calendar/page.tsx`
- `apps/web/src/app/globals.css`
- `docs/TASK39_7_DESKTOP_PRODUCTION_VISUAL_PARITY_20261015.md`
- `HANDOFF.md`
- `PROJECT_PLAN.md`

## Verification

### Canonical repository verification

Command:

`npm run check`

Task:
`9808736d-7b36-4ea9-9050-2f5ac2304cd8`

Result: **PASS, exit 0**
- lint PASS
- all workspace typechecks PASS
- **83 / 83 test files PASS**
- **574 / 574 tests PASS**
- package builds PASS
- NestJS API build PASS
- Next.js production build PASS
- **22 / 22 static pages generated**

Additional evidence:
- Web typecheck `f34cfc47-2fd1-41e7-9f98-2785d285ab33` = PASS
- Web production build `8f2d52a4-f9cf-4f58-8a6b-8263ac56ebd7` = PASS, 22/22 pages.

### Browser QA — local read-only fixture

Preview used:
`http://127.0.0.1:4181/desktop`

Dashboard:
- 399 / 824 / 1536 px: no page-level horizontal overflow
- mobile toggle visible at 399/824 and hidden at 1536
- announcements confirmed 1 / 2 / 3 columns respectively
- announcements confirmed as final Dashboard section
- period flyout and month picker work
- Thai month abbreviations confirmed
- approved proportion legend excludes zero-use categories.

Calendar:
- 399 / 824 / 1536 px: no page-level horizontal overflow
- Leave list confirmed physically below calendar
- list columns: 1 / 2 / 2
- no fixture alert/error.

Representative core routes at 399 and 1536:
- Leave
- OT
- Attendance
- Medical
- Approvals
- Reports
- Employee Master
- Platform Settings

Result: **16 / 16 route-width checks PASS**
- no horizontal overflow
- no fixture alert/error
- correct mobile/desktop navigation breakpoint.

## Security / Scope

Preserved:
- frontend remains presentation only
- server-derived capabilities control visible navigation/actions
- API authorization remains final authority
- no business-rule weakening
- no change to ambiguous-write retry policy.

Not performed:
- Project A write
- LINE LIFF change
- GAS/Gateway change
- Production deployment
- Production data mutation
- Neon PROD mutation
- DNS/Firebase routing change
- credential/security change.

## Known Follow-up

- TASK-39.7 source/local QA is not a Production release.
- shared TEST/Production promotion remains a later gated release activity.
- future Employee Master accounting/audit professional fields remain intentionally deferred.
- Password Recovery hosted signing configuration and external font/icon dependency hardening remain later readiness inputs.

## Decision

**TASK-39.7 = PASS.**

The Owner-requested visual corrections are implemented and verified. The Leave-first TASK-39.6 information architecture remains intact while the Desktop visual language is materially closer to the existing Production baseline.
