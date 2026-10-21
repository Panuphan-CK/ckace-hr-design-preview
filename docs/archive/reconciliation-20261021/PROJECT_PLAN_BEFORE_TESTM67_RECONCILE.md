# CKACE_HR — Project B PROJECT PLAN

Last Updated: 2026-10-21 Asia/Bangkok

> Canonical plan for **Project B only**: `D:\CKACE_HR`.
> CKACE_HR is standalone. Retired-system material is historical evidence only and must not drive current planning.

## Active Planning Authority — 2026-10-21

- **TASK-39.9 Desktop full redesign is the active implementation track.**
- TASK-39.8 Project A/Production parity work is superseded and historical.
- Project A / APP_Leave is retired from active planning and must not be used as a compatibility, visual, business-rule, data, migration, fallback, or acceptance baseline.
- Current CKACE_HR source, contracts, schema, Owner decisions, TEST evidence, `HANDOFF.md`, and this plan are authoritative.
- Historical task sections below are retained as evidence only; their old parity references do not govern new work.

## Current Phase

**Phase A — Project B Web Desktop Functional + Security QA — PASS**

Phase A review is complete on TEST. Production remains **NO-GO** until later explicit gates.

## Milestones

| Task | Scope | Status |
|---|---|---|
| TASK-28 | TEST Database Attestation | PASS |
| TASK-29 | Four Disposable TEST Identities | PASS |
| TASK-30 | Four-Role Authenticated UAT | PASS |
| TASK-31 | Core Desktop Functional UAT | PASS |
| TASK-32 | Medical + Private R2 E2E | PASS |
| TASK-33 | Failure & Ambiguous-Write QA | PASS |
| TASK-34 | R2 Orphan Reconciliation | PASS |
| TASK-35 | Responsive + State QA | PASS |
| TASK-36 | Exact TEST Data / R2 Cleanup | **PASS** |
| TASK-37 | Final Regression | **PASS** |
| TASK-38 | Phase A Final Review | **PASS** |
| TASK-39 | TEST Traffic Decision + Web Traffic Switch | **PASS** |
| TASK-39.5 | Desktop Production Parity + UX/UI & Usability Final Review | **PASS — 39.5A PASS / 39.5B PASS** |
| TASK-39.6 | Desktop UX/UI Redesign + Leave-first Platform Structure | **PASS** |
| TASK-39.7 | Desktop Production Visual Parity Polish | **PASS** |
| TASK-39.8 | Full Desktop Production UI Parity | **SUPERSEDED by TASK-39.9 — Waves 1–2 rejected by Owner** |
| TASK-39.9 | Desktop full redesign (HR workspace, apps, top tabs, per-type pages) | **IN PROGRESS — v18 reference + editorial neo-brutalist top-tab/card-grid interactive review prototype under Owner review** |
| TASK-40 | Production Readiness Plan | NOT STARTED |
| TASK-41 | Production Go / No-Go | NOT STARTED |

## Completed Milestones

### TASK-28 — PASS
TEST API -> Neon DEV target attested without exposing credentials.

### TASK-29 — PASS
Four isolated synthetic TEST identities/RBAC fixtures created and tracked.

### TASK-30 — PASS
Four-role authenticated Desktop session/navigation/RBAC UAT passed.

### TASK-31 — PASS
Core Desktop functional UAT passed.

### TASK-32 — PASS
Private Medical/R2 lifecycle passed, including ambiguous finalize recovery, idempotency, approval and authorization.

### TASK-33 — PASS
Definite-vs-ambiguous write handling and recovery semantics passed.

### TASK-34 — PASS
Two retained stale attachment candidates were proven DB-only with no R2 object.

### TASK-35 — PASS
Responsive/state QA passed across 13 routes × 3 widths, Loading/Empty/Error/Disabled states and mobile navigation. Final TASK-35 repository gate: 78 files / 505 tests PASS.

### TASK-36 — PASS

Owner-approved exact TEST cleanup is complete.

Verified:
- exact pre-delete fixture attestation
- exact R2 finalized object metadata/checksum before delete
- both stale R2 keys absent
- post-delete all 3 exact R2 keys absent
- dependency-safe Neon DEV cleanup transaction
- independent post-cleanup Neon DEV counts all zero for tracked fixture/business/identity/RBAC/config/attachment tables
- targeted typecheck/lint/build PASS
- API/Web baseline traffic unchanged.

Runtime/build evidence:
- Cloud Build `9d021006-bfe8-4ba0-89fc-70a5e20b70a9` SUCCESS
- digest `sha256:63667016c6674674516b82eed8516c74615271b858c8f167e9442a97b05a2f66`
- R2 execution `ckace-hr-task36-r2-cleanup-274f7` PASS
- DB execution `ckace-hr-task36-db-cleanup-679kb` PASS
- full evidence: `docs/TASK36_EXACT_TEST_CLEANUP_20261014.md`.

## Planned Work

### TASK-37 — Final Regression — PASS

Fresh whole-repository regression after TASK-36 cleanup completed successfully:
- Prisma schema validation PASS
- lint PASS
- all workspace typechecks PASS
- **78 / 78 test files PASS**
- **505 / 505 tests PASS**
- package/API/Next production builds PASS
- post-cleanup Neon DEV spot checks remained zero
- API/Web TEST baseline traffic remained 100%.

Evidence: `docs/TASK37_FINAL_REGRESSION_20261014.md`.

### TASK-38 — Phase A Final Review — PASS

Final evidence review accepted TASK-28 through TASK-37 and concluded:

**PHASE A — WEB DESKTOP FUNCTIONAL + SECURITY QA = PASS**

Fresh TASK-38 checks:
- Neon DEV tracked synthetic/business rows remain zero
- API `/api/health` = 200
- API `/api/ready` = 200
- API baseline `m9d15d` = 100%
- Web baseline `m9d15a` = 100%
- no unresolved blocker remains inside Phase A TEST scope.

Residual risks are carried forward to later gates, especially TEST-only harness isolation, public onboarding registration proof if included in Production scope, R2 CORS administration limitations, and Production readiness.

Evidence: `docs/TASK38_PHASE_A_FINAL_REVIEW_20261014.md`.

### TASK-39 — TEST Traffic Decision + Web Traffic Switch — PASS

Decision and execution:
- API: `ckace-hr-api-test-m9d15d = 100%`
- Web: `ckace-hr-web-test-task35-20261014a = 100%`
- old Web baseline `ckace-hr-web-test-m9d15a = 0%` retained as rollback target
- Firebase TEST rewrites unchanged
- task/UAT API revisions remain isolated and were not promoted.

Post-switch verification:
- canonical TEST Login = 200
- API health = 200
- API ready = 200
- signed-out session = 401
- browser `/desktop` redirected client-side to `/login`
- login controls present
- no horizontal overflow
- no rollback condition triggered.

Evidence: `docs/TASK39_TEST_TRAFFIC_DECISION_20261014.md`.

### TASK-39.5 — Desktop Production Parity + UX/UI & Usability Final Review — PASS

**Desktop Web only. LINE LIFF is explicitly out of scope.**

Production Desktop Apps Script v38 is the mandatory parity baseline.

#### TASK-39.5A — Employee-facing safe parity — PASS

Implemented and independently verified:
- richer secure Login UX: remember username only, password reveal, honest password-recovery guidance
- public registration UI over the existing onboarding contract
- operational employee Home dashboard using existing Leave / Attendance / OT / Medical / Announcement reads
- authenticated GPS Check-in/Check-out using existing attendance write contracts
- fresh GPS request for every time write
- existing idempotency ambiguity behavior preserved; no blind automatic retry
- Thai/user-facing copy improvements.

Verification:
- Manager `npm run check` exit 0
- **80 / 80 test files PASS**
- **512 / 512 tests PASS**
- package/API/Next builds PASS
- local Browser QA for Login / Registration form / Dashboard / Attendance PASS
- Check-in GPS call #1, Check-out fresh GPS call #2, final `09:00 → 17:00` PASS
- no TEST DB, Production, Project A, LINE, R2 or shared traffic mutation.

Evidence: `docs/TASK39_5_DESKTOP_PRODUCTION_PARITY_UXUI_20261014.md`.

#### TASK-39.5B — Calendar / Reports / Admin parity — PASS

Owner-approved purpose-specific server-authoritative permissions and Password Recovery are implemented without overloading unrelated legacy permissions.

Completed:
- Leave Calendar monthly read surface
- management Reports / safe CSV export
- generic user lifecycle administration
- Agency and Department administration
- Leave Entitlement administration
- Holidays and Weekly Workdays administration
- Role / Permission administration
- Announcement admin list/search/create/edit/scope/publish/delete boundaries
- signed 15-minute Password Recovery with credential-version invalidation and replay resistance
- Production-style Login/Shell/Dashboard/Admin/Settings/Reset Password visual parity
- server-derived write-capability UI gating while API authorization remains final authority.

Final verification:
- focused TASK-39.5B regression **112 / 112 PASS**
- final `npm run check` task `9ab2df38-2458-44fe-b651-ab870a2b44f6` = **exit 0**
- **83 / 83 test files PASS**
- **571 / 571 tests PASS**
- lint and all workspace typechecks PASS
- package/API/Next production builds PASS
- fresh Browser QA PASS
- responsive QA: **27 / 27 core route-width combinations PASS** at 399 / 824 / 1536 with no page-level horizontal overflow
- additional management section checks and mobile drawer behavior PASS.

No Production data/source-of-truth cutover, Neon PROD mutation, DNS/Firebase routing change, Project A write, destructive operation or LINE LIFF/GAS/Gateway work was performed.

### TASK-39.6 — Desktop UX/UI Redesign + Leave-first Platform Structure — PASS

Owner-confirmed Leave-first Desktop architecture is implemented:
- hierarchical capability-aware Sidebar
- My Requests with module-local New / In Progress / History
- separate Approval Work with pending queue and real server-backed approval history
- dedicated Reports workspace using approved/completed operational data
- Dashboard announcements with capability-gated inline administration
- Employee administration grouped into Employee Master / Organization / Access
- Leave-specific settings separated from CKACE Platform Settings
- Prompt retained with a new clean layered business UI and responsive/mobile behavior
- narrow server-derived navigation capabilities for each approval module and admin-read domain

Future platform direction is recorded but not overbuilt:
- Employee / Organization / Role & Permission are shared-core concepts
- accounting/audit affiliation, registered bookkeeper and auditor/CPA credential fields are deferred
- Office / Customer / Audit modules are not implemented in TASK-39.6

Verification:
- final `npm run check` task `dc7c1248-f1b7-4dc4-be5b-51e281a96508` = exit 0
- lint PASS
- all workspace typechecks PASS
- **83 / 83 test files PASS**
- **574 / 574 tests PASS**
- packages/API/Next build PASS
- Next **22 / 22 static pages**
- Browser QA **42 / 42 route-width combinations PASS** across 14 affected routes × 399 / 824 / 1536, no page-level horizontal overflow
- mobile drawer and key request/approval/report/announcement interactions PASS
- no Production, shared traffic, Project A, LINE LIFF, GAS or Gateway mutation.

Evidence: `docs/TASK39_6_DESKTOP_UXUI_REDESIGN_20261014.md`.

### TASK-39.7 — Desktop Production Visual Parity Polish — PASS

Owner-requested visual corrections after TASK-39.6 are implemented while preserving the Leave-first IA and server-authoritative security:
- Dashboard announcements moved to the bottom
- announcement layout = 3 / 2 / 1 columns at Desktop / Tablet / Mobile
- Production-like year/month period filter
- Leave entitlement cards, usage bars and approved-use doughnut restored to a stronger Production visual pattern
- Calendar Leave list moved below the calendar and redesigned
- shared Desktop surfaces restored toward Production's #f3f4f8 + white-card + blue-active-navigation language.

Verification:
- canonical `npm run check` task `9808736d-7b36-4ea9-9050-2f5ac2304cd8` = exit 0
- lint PASS
- all workspace typechecks PASS
- **83 / 83 test files PASS**
- **574 / 574 tests PASS**
- package/API/Next production builds PASS
- Next **22 / 22 static pages**
- Dashboard 399 / 824 / 1536 responsive checks PASS, announcements 1 / 2 / 3 columns
- Calendar 399 / 824 / 1536 checks PASS, Leave list below calendar
- representative 8-route matrix at 399 / 1536 = **16 / 16 PASS**
- no Production, Project A, LINE LIFF, GAS, Gateway, Neon PROD or routing mutation.

Evidence: `docs/TASK39_7_DESKTOP_PRODUCTION_VISUAL_PARITY_20261015.md`.

### TASK-39.8 — Full Desktop Production UI Parity — IN PROGRESS

Owner-confirmed four-wave plan:
- Wave 1 — Production UI Foundation + My Requests
- Wave 2 — Approval Work
- Wave 3 — Reports
- Wave 4 — Employee/Admin/Leave Settings/Platform Settings
- final whole-task responsive/functional regression and Owner visual review.

#### Wave 1 — Production UI Foundation + My Requests — PASS

Implemented for Leave / OT / Time Correction / Medical:
- shared Production-style request tabs and responsive request toolbar
- search, month filter, clear and create actions on In Progress / History views
- Production-like page headings, white panels, forms, tables/cards, status presentation and responsive layout
- server-authoritative APIs/business rules preserved; no local authorization authority introduced.

Verification:
- Web typecheck `abc4a52f-6523-4e91-b68d-7ee6862a1483` = exit 0
- Web ESLint `caa89e29-a8d2-489d-8405-d824e10cdd40` = exit 0
- focused functional regression `93c88207-2d0b-4095-8b96-e40888a57dd9` = **6 / 6 files, 32 / 32 tests PASS**
- full package/API/Web build `807c23ad-73f8-4e67-a69b-3ecfed7129d2` = exit 0; Next **22 / 22 pages**
- Browser responsive matrix = **12 / 12 PASS** across 4 request modules × 399 / 824 / 1536 with no page-level horizontal overflow
- interaction QA PASS for New → In Progress → History, search no-match, Clear reset and Create return-to-New in all four modules
- no Production, Project A, LINE LIFF, GAS, Gateway, Neon PROD or routing mutation.

Evidence: `docs/TASK39_8_WAVE1_REQUESTS_PRODUCTION_PARITY_20261015.md`.

#### Wave 2 — Approval Work Production UI Parity — PASS

Implemented:
- Production-style Search + Reload Approval heading
- module filters for Leave / Time Correction / OT / Medical / All with Production-style icons/counts
- server-backed pending queue redesigned as Production-style approval cards
- responsive pending queue = 1 / 2 / 3 columns on 399 / 824 / 1536
- card header/body/footer hierarchy with pending status, employee, summary, submitted time, comment/reason and Approve/Reject actions
- Approval History redesigned as a Production-style table
- current server-derived authorization and approval decision endpoints preserved.

Verification:
- Web typecheck `730a35c2-2f8f-4311-a1f0-dc8c34f480aa` = exit 0
- Web ESLint `e8a7fd57-2fa4-41e6-97ac-eb4e9255b87c` = exit 0
- focused Approval/Navigation regression `8eff923d-8ff1-4bdc-861a-7ac16a562cfc` = **2 / 2 files, 12 / 12 tests PASS**
- Web production build `d98c3b6d-9f82-428b-9e1a-1a1fe6735f3e` = exit 0; Next **22 / 22 static pages**
- pending Browser matrix = **15 / 15 PASS** across All / Leave / OT / Time Correction / Medical × 399 / 824 / 1536
- no page-level horizontal overflow; queue columns 1 / 2 / 3
- pending/history, module filter and search interactions PASS
- no business approval write executed during read-only browser QA
- no Production, Project A, LINE LIFF, GAS, Gateway, Neon PROD or routing mutation.

Evidence: `docs/TASK39_8_WAVE2_APPROVALS_PRODUCTION_PARITY_20261015.md`.

### TASK-40 — Production Readiness Plan

**Do not start until explicit Owner approval.**

Prepare migration / rollback / monitoring / cutover plan only. No Production deploy.

### TASK-41 — Production Go / No-Go
Separate explicit approval required for Production deploy/data/routing/source-of-truth changes.

## Technical Decisions

1. **Development ownership:** CKACE_HR uses a collaborative Codex + Claude workflow. Codex Local is active for the current work period; Claude may resume later through the canonical GitHub/HANDOFF/PROJECT_PLAN state.
2. This file tracks Project B `D:\CKACE_HR` only.
2. Backend authorization remains server-authoritative.
3. Business writes are never automatically retried after ambiguous commit.
4. Private Medical objects are reconciled independently from DB metadata.
5. No blanket R2 deletion.
6. TASK-36 cleanup used exact allowlists plus preflight/post-verification.
7. TASK-36 cleanup runners are not API routes and fail closed outside the exact TEST boundary.
8. TASK-39 completed a Web-only TEST promotion; API task/UAT revisions remain isolated because they contain revision-activated test harnesses.
9. Previous Web baseline remains 0% as rollback target.
10. TASK-39.6 uses a Leave-first Desktop IA: module-local request/history, separate Approval Work, approved/completed Reports, grouped Employee administration and separate Leave Settings vs Platform Settings.
11. TASK-39.6 navigation presentation uses narrow server-derived capabilities; API authorization remains the final authority.
12. Employee / Organization / Role & Permission are future CKACE shared-platform core concepts, but professional credential fields and Office / Customer / Audit modules are deliberately deferred.
13. Production remains unchanged until later explicit gates.
14. Effective 2026-10-21, Project A / APP_Leave is retired from active planning and must not be used as an implementation or acceptance reference.
15. TASK-39.9 is the authoritative Desktop redesign track; prior parity tasks remain historical evidence only.

## Known Risks

- TASK-36 one-off TEST Job definitions remain manual-only and unscheduled; their current preflight state causes fail-closed behavior if re-run.
- TASK-36 source runners remain as controlled TEST cleanup evidence.
- R2 bucket-level CORS administration remains unavailable to the least-privilege runtime token.
- Public registration UI is implemented and locally/browser verified, but real shared-TEST registration success remains unexecuted because no new TEST fixture was created after TASK-36 cleanup.
- TASK-39.8 Waves 1–2 source/local/browser verification is PASS, but the latest TASK-39.6/TASK-39.7/TASK-39.8 source remains local/unpromoted; shared TEST/Production promotion is deferred until TASK-39.8 is fully complete and separately gated.
- Future Employee Master professional fields for the accounting/audit office are not implemented yet; this is intentional Leave-first scope, not a TASK-39.6 defect.
- Password Recovery runtime signing configuration still requires hosted provisioning before the relevant release gate.
- External Prompt/Boxicons/Font Awesome dependencies remain a deployment-hardening consideration.

No known risk blocks TASK-39.8 Waves 1–2 PASS. TASK-39.8 remains active for Waves 3–4 and final whole-task QA before any later release-readiness gate.

## Future Work

Phase A review is complete PASS.

Remaining:
- continue TASK-39.9 Desktop full redesign implementation from the current CKACE_HR state;
- complete remaining inner-layout redesign for calendar, reports, settings, profile/photo/signature and other not-yet-finalized Desktop pages;
- run whole-task responsive, accessibility, functional and visual QA against current CKACE_HR requirements;
- reconcile and promote TEST only through explicitly approved release gates;
- future shared Employee Master expansion for accounting/audit affiliation and professional registrations;
- future Office / Customer / Audit modules as separate later phases;
- prepare Production readiness plan under TASK-40 only after explicit Owner approval;
- separate Production go/no-go approval under TASK-41.

## Next Action

**Continue TASK-39.9 — CKACE_HR Desktop full redesign implementation.**

Use only current CKACE_HR source/contracts/schema, accepted Owner decisions and current TEST evidence. Do not reopen Project A parity/compatibility work. TASK-40 remains deferred until TASK-39.9 is complete, whole-task QA is accepted, and the Owner explicitly approves release readiness.

## 2026-10-18 Flow reference and UX reset

- Read-only CUA review completed across FlowAccount business, Payroll, and MyCompany reference surfaces. Inventory is documented in `docs/design/desktop-20261018/flow-function-inventory.md`.
- Rebuilt the design prototype around a lighter FlowAccount-inspired app shell: app launcher, one top app bar, horizontal module tabs, white content panels, card grids, scoped settings, and a separate login view.
- Prototype files: `docs/design/desktop-20261018/index.html`, `style.css`, `prototype.js`, and `README.md`. No production API, authorization, or data flow was changed.
- Design-system source updated at `design-system/ckace-hr-workspace/MASTER.md` to use the new Flow-style direction.

## 2026-10-19 App launcher and Leave-first correction

- UX entry point is now an app launcher, matching the FlowAccount mental model: choose an app card, then navigate into that app's own workspace.
- People Operations detail now includes Leave, OT, attendance, time correction, medical reimbursement, approvals, and module-local settings; each workflow has overview, list, form, and settings routes.
- Other areas are intentionally represented as separate app placeholders and will receive their own workspace design later.
- This is a static design artifact update. No production app, API, database, authorization, routing, or source-of-truth behavior was changed.

## 2026-10-19 Top-tab visual reset

- The previous rail plus contextual-sidebar visual was rejected. The review prototype now uses a single top app bar, current-app switcher, horizontal module tabs, and card-first content.
- Keep the app launcher and People Operations routes; only the navigation presentation changes in this pass.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed.

## 2026-10-19 Framed canvas and centralized People Operations settings

- Updated the static UX/UI artifact with a gray workspace canvas and a framed white page-heading card to establish a grounded content surface.
- Consolidated Leave, OT, attendance, time correction, medical reimbursement, approval routing, and notifications into the single `#leave/settings` hub. Module setting links resolve to that hub.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed.
- Static verification: `node --check docs/design/desktop-20261018/prototype.js`, CSS brace balance, and `git diff --check` pass.
- Repository-wide `npm run check` remains blocked by existing LIFF lint/type errors, sandbox `ENOENT` test imports, and a Turbopack process panic; these are outside the static UX artifact.

## 2026-10-19 Single-system People Operations Command Center reset

- Replaced the app-launcher/multi-app prototype direction with one People Operations system focused on Leave, OT, attendance, time correction, medical reimbursement, approvals, reports, and system settings.
- The new entry flow is a dashboard-first Command Center with a premium midnight/indigo hero, Team Pulse status, metric cards, and a card grid. Users move through the system with top tabs and the settings hub is the single place for module policies, approval routing, notifications, and payroll cycle settings.
- Updated the static review files under `docs/design/desktop-20261018/` plus `design-system/ckace-hr-workspace/MASTER.md` and `flow-function-inventory.md`. No production app, API, database, authorization, routing, or source-of-truth behavior was changed.
- Validation for this reset: `node --check docs/design/desktop-20261018/prototype.js`, CSS brace balance, and `git diff --check` pass. Full repository checks remain blocked by the existing LIFF/sandbox/Turbopack issues above.

## 2026-10-19 Dashboard and single-page workflow polish

- Expanded the dashboard into a live command center with Team Pulse insight cards, animated visuals, activity feed, and a full team calendar at the bottom. Removed the “เลือกงานที่ต้องทำ” module grid and dashboard quick actions.
- Leave, OT, and Medical are now self-contained workspaces with inline request forms and recent activity. Attendance and time correction share one page and one top tab, including the clock, timeline, summary, and correction form.
- Updated the static prototype, README, inventory, and design-system guidance. No production app, API, database, authorization, routing, or source-of-truth behavior was changed.
- Validation: `node --check docs/design/desktop-20261018/prototype.js`, CSS brace balance, whitespace, and `git diff --check` pass. Full repository checks remain blocked by the existing LIFF/sandbox/Turbopack issues above.

## 2026-10-19 Dashboard visual correction

- Reworked the dashboard first screen after visual review: light-blue workspace canvas, larger typography, gradient/inset card treatment, tighter copy, and more pronounced motion around the Team Pulse visuals.
- Removed the `LIVE DASHBOARD` explanatory heading block and kept the dashboard focused on metrics, live cards, activity, team rhythm, and the bottom calendar.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. Static syntax, route harness, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Dashboard v2 redesign

- Rebuilt the Overview page as a single command deck with an oversized hero, animated Team Pulse orb, dark stat rail, live feed, team rhythm board, and bottom team calendar with a daily summary panel.
- Removed the previous “LIVE DASHBOARD” explanatory copy and route-style controls from the Overview page. The visual system now favors short labels, large numbers, integrated surfaces, and a stronger light-blue canvas.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. Static syntax, dashboard route harness, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Content and copy redesign

- Retained the approved visual tone and redesigned the prototype’s information copy across the full People Operations shell. The content now follows a simple order: what is happening today, what needs attention, and what the user can submit or decide.
- Rewrote Overview, Leave, OT, attendance/time correction, medical reimbursement, approvals, reports, and settings labels to be shorter, more conversational, and easier to scan. Updated the prototype brand subtitle to `TEAM WORKSPACE`.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. JavaScript syntax, route content harness, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Universal dashboard card redesign

- Replaced the Overview’s custom card composition with a standard dashboard information architecture: welcome hero, consistent KPI row, Team Status card, Activity card, Workload chart card, and one integrated calendar card.
- The approved visual tone remains midnight/light-blue with motion in the hero visual; the cards now share a predictable layout and hierarchy for faster scanning.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. JavaScript syntax, dashboard content harness, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Expressive dashboard restored

- Reverted the Overview from the overly plain universal card experiment to the richer Team Pulse command deck that the Owner preferred: hero, animated orb, dark stat rail, activity board, rhythm visual, and calendar.
- Kept the new concise copy and single-page module content. No production app, API, database, authorization, routing, or source-of-truth behavior was changed. JavaScript syntax, dashboard content harness, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Rich dashboard cards added

- Added the requested six-part Overview content structure to the expressive visual direction: Welcome Hero, four KPI cards, Team Status, Activity, Workload/OT chart, and Calendar with daily summary.
- Kept the stronger hero/orb/stat-rail treatment so the dashboard remains visually distinctive while the information architecture is easier to scan.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. JavaScript syntax, dashboard card harness, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Orb satellite treatment

- Updated the Team Pulse hero so its three summary values are circular orbiting nodes instead of rectangular mini-cards. Nodes use staggered motion, distinct accents, and remain legible at mobile sizes.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. JavaScript syntax, orbit markup harness, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Galaxy drift motion

- Softened Team Pulse animation from precise orbiting to slow galaxy-like drift. Nodes now move through loose, staggered paths while the rings breathe gradually instead of completing obvious rotations.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. JavaScript syntax, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Ring rotation and core float

- Added slow rotation to the three large galaxy rings and subtle movement to the central Team Pulse orb while preserving the irregular satellite drift.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. JavaScript syntax, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Galaxy theme content and readability pass

- Moved employee count and attendance completion from the hero metadata row into two additional orbiting nodes, removed the duplicate row, and changed the fourth KPI from alerts to attendance completion.
- Increased Thai typography for easier reading, added a galaxy texture to the hero, and changed the calendar side panel to list who is on leave and when.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. JavaScript syntax, dashboard content harness, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Attendance and medical benefit overview layer

- Extended Overview from four to five KPI cards by adding the current leave count. Added compact cards for the four attendance states and the medical benefit balance/policy.
- Documented and reflected the medical policy in the prototype: ฿10,000 per year and a maximum of ฿1,000 per claim. Sample amounts in the static module now follow the policy.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. Validation: JavaScript syntax, dashboard operations harness, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Galaxy frame and KPI readability pass

- Expanded the Team Pulse visual to six small orbiting circles aligned to the five KPI signals plus OT, and added slow twinkling stars inside the main frame.
- Increased Thai KPI typography and weight, changed the Hero date to a full Thai month name, and render the current clock instead of a fixed update time.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. Validation: JavaScript syntax, dashboard galaxy/KPI harness, CSS balance, whitespace, and diff checks pass.

## 2026-10-19 Live clock, lighter surfaces, and company announcements

- Added a live `HH:MM:SS` clock to the Overview Hero and shared clock labels, with full Thai month names.
- Softened the Overview color treatment and increased board typography so the dashboard reads clearly without losing the galaxy visual language.
- Added a company announcements frame below the calendar for holiday, benefit, and team-event notices.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. Validation: JavaScript syntax, CSS balance, dashboard live-clock harness, whitespace, and diff checks pass.

## 2026-10-19 Compact galaxy hero and unified frame treatment

- Tightened the Overview Hero so its height follows the content more closely and moved the live Thai date/time line up against the top padding.
- Added low-frequency twinkling stars to every Overview frame, including KPI, boards, insight cards, calendar, and company announcements, while honoring reduced-motion preferences.
- Recolored the calendar and company announcements to use the same navy/teal galaxy surfaces and readable light text as the command deck.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. Validation: JavaScript syntax, CSS balance, dashboard content checks, whitespace, and diff checks pass.

## 2026-10-19 Softer calendar surfaces and flash sparkle

- Lightened the calendar and company-announcement panels into a softer blue/teal galaxy gradient with translucent inner cards while keeping the text hierarchy readable.
- Changed the Overview star layers from slow opacity breathing to short staggered flash pulses across Hero, KPI, boards, insight cards, calendar, and announcements. Reduced-motion mode still disables them.
- No production app, API, database, authorization, routing, or source-of-truth behavior was changed. Validation: JavaScript syntax, CSS balance, dashboard sparkle harness, whitespace, and diff checks pass.

## 2026-10-19 Dashboard readability and star-density pass

- Increased the galaxy star field density across Hero, KPI, boards, insight cards, calendar, and announcements.
- Enlarged Thai labels, values, calendar dates/events, announcement copy, and supporting status text, then strengthened the blue/teal contrast with light calendar cells and dark event text for easier scanning. The calendar hierarchy now makes `ปฏิทินทีม` the large heading, `เดือนนี้` the subheading, and centers a larger `ตุลาคม 2569`; `COMPANY UPDATE` was removed, `ประกาศบริษัท` keeps the large accent treatment, and the Attendance/Medical English labels sit below their Thai headings.
- Added mobile-specific type sizing so the larger copy remains readable without breaking the compact dashboard grid. No production app, API, database, authorization, routing, or source-of-truth behavior was changed.
- Validation: JavaScript syntax, CSS balance, dashboard readability harness, whitespace, and diff checks pass.

## 2026-10-19 Leave workspace galaxy redesign

- Replaced the generic Leave overview with a focused single-page workspace: galaxy hero, orbiting leave balance, four leave KPIs, inline request form, balance panel, upcoming team leave, and recent requests.
- Kept the leave request flow in one page with `leave-inline-form`; no production app, API, database, authorization, routing, or source-of-truth behavior was changed. Added responsive layouts for tablet and mobile widths.
- Validation: JavaScript syntax, CSS balance, leave-page content harness, whitespace, and diff checks pass.

## 2026-10-19 Shared galaxy treatment across modules

- Applied the galaxy workspace shell to every non-Overview route: OT, attendance/time correction, medical benefits, approvals, reports, settings, calendars, histories, request forms, and list views now share star layers, dark glass cards, larger Thai type, and readable input/table states.
- The shell automatically adds the shared `galaxy-page` variant while preserving the dedicated Overview and Leave layouts. No production app, API, database, authorization, routing, or source-of-truth behavior changed.
- Validation: JavaScript syntax, CSS balance, all-module galaxy harness, whitespace, and diff checks pass.

## 2026-10-19 Module structures aligned to Leave workspace

- Replaced the top-level OT, attendance/time correction, medical, approvals, reports, and settings routes with the same single-page galaxy composition as Leave: Thai-first hero with English subtitle, orbit visual, KPI rail, one-page action area, side summary, and recent activity.
- Kept the existing prototype route names and inline form IDs so the demo interactions continue to work. No production app, API, database, authorization, routing, or source-of-truth behavior changed.
- Validation: JavaScript syntax, CSS balance, route/content harness, and prototype asset whitespace scan pass.

## 2026-10-19 Overview Hero height follow-up

- Set the desktop Overview Hero to 356px and the orbit area to 320px. Added one shared galaxy motion contract for Overview and the Leave-first module pages: rings use an 18-second linear orbit, cores use the same 4.7-second pulse, and the metric circles use the same 18-second phase rhythm. Leave satellites now travel the same elliptical language as the Overview satellites; reduced-motion preference freezes both Heroes together. Tablet/mobile layouts keep compact orbit geometry.
- No production app, API, database, authorization, routing, or source-of-truth behavior changed.
- Prototype validation: CSS parse, `node --check docs/design/desktop-20261018/prototype.js`, and `git diff --check` pass. Repository-wide lint/typecheck still report unrelated errors in `apps/web/src/app/liff/_ckace`; 41 tests pass while 64 suites fail to resolve sandbox temporary modules; package/API builds pass, but the Next.js web build hits a Turbopack process-spawn failure. The local browser preview was not re-captured after this CSS-only adjustment.

## 2026-10-19 Verified Hero orbit alignment

- Re-checked the rendered Overview, Leave, and OT pages through a local HTTP preview. Overview and Leave were moving, but their ring progress was not visibly legible as one system and module Heroes still retained the older orbit selectors.
- Added a shared moving ring trace and applied the same ring, core-pulse, satellite-phase, and reduced-motion contract to Leave and all Leave-based module Heroes. The visual check now shows the ring arc and metric circles progressing together on Overview and Leave.
- No production app, API, database, authorization, routing, or source-of-truth behavior changed. Validation: CSS parse, JavaScript syntax, whitespace, and `git diff --check` pass; browser preview re-captured after the CSS fix.

## 2026-10-19 Overview orbit geometry verification

- Browser inspection at desktop and narrow viewport showed the metric circles following one ellipse while the ring outlines were rotating independently, so the paths visibly separated.
- Centered all Overview rings on the core, matched their ellipse dimensions to the metric orbit at desktop/mobile sizes, and changed the shared ring motion to a restrained breathing scale while the bright arc carries the rotation. The circles now remain on the ring path throughout the motion.
- No production app, API, database, authorization, routing, or source-of-truth behavior changed. Static checks and a two-frame browser re-check pass.

## 2026-10-19 Overview cloud visual redesign

- Reworked the Overview Hero visual language from orbiting circles/ellipses/rings to a randomized pastel cloud field. The primary readiness value and supporting metrics now render as distinct cloud blobs with different tones and organic shapes.
- Added per-render randomization for cloud anchor jitter, dimensions, scale, drift timing, and gentle float direction so the small/large arrangement is not fixed. The overview preserves the existing Thai-first content and KPI rail; Leave and module Hero visuals remain unchanged.
- No production app, API, database, authorization, routing, or source-of-truth behavior changed. Validation: JavaScript syntax, CSS parse, whitespace/diff checks, and a browser reload comparison pass.

## 2026-10-19 Overview cloud silhouette and safe-layout pass

- Updated the Overview Hero cloud shape to the supplied reference direction: a flat lower cloud body with three distinct puffs, pastel tones, and high-contrast metric copy.
- The field now spans the complete Hero frame, but randomized desktop/mobile anchor sets keep cloud values out of the headline and prevent KPI text from being hidden. Mobile sizes and positions are constrained independently so the layout remains readable.
- No production app, API, database, authorization, routing, or source-of-truth behavior changed. Validation: browser reload checks at desktop and narrow viewport, JavaScript syntax, CSS parse, whitespace/diff checks. Full repository lint/typecheck/build/test checks still show the pre-existing `_ckace` lint/type errors, Turbopack process-spawn failure, and sandbox ENOENT test-resolution failures (279 tests passed; 59 suites failed).

## 2026-10-19 Overview Aurora Glass Garden redesign

- Replaced the rejected cloud and hard prism treatment with Aurora Glass Garden: asymmetric translucent data panes, pastel-dark KPI gradients, diagonal aurora beams, and restrained diamond sparks across the Hero.
- The desktop composition keeps the Thai-first Hero copy clear while distributing the six KPI values across the frame. Pane position, size, scale, drift, rotation, timing, and z-order are randomized per render; motion uses translate/opacity and honors reduced-motion preferences.
- No production app/API behavior changed. Desktop browser preview, JavaScript syntax, CSS parse, and `git diff --check` validation pass.

## 2026-10-19 Final Overview Galaxy Orbit direction

- Restored Galaxy Orbit as the active Overview Hero visual: a central pastel readiness circle, six pastel KPI satellites, and three shared elliptical rings with coordinated timing. The Aurora Glass Garden remains inactive as a rejected alternative.
- Desktop preview was reloaded and inspected at the real viewport; a second frame confirms the satellites move around the central metric without covering the Thai Hero copy. No production app/API behavior changed.

## 2026-10-19 Overview Galaxy Orbit centre alignment

- Aligned the Overview Hero geometry around one centre in the right visual lane: the 92% core, all three horizontal ellipse rings, and six KPI satellites now share the same centre and the satellites follow one slow elliptical orbit.
- Restored a visible rotating ring trace and coordinated ring breathing while keeping the orbit away from the Thai Hero copy. Desktop bounding-box and two-frame browser checks pass; no production app/API behavior changed.

## 2026-10-19 Overview Galaxy Orbit centering pass

- Moved the unified orbit group toward the Hero midpoint while retaining a safe left-copy buffer. The ring trace, ring breathing, and six-satellite ellipse now share a 22-second motion rhythm.
- Desktop preview and bounding-box inspection pass; no production app/API behavior changed.

## 2026-10-19 Overview Galaxy Orbit slow-circle pass

- Expanded the Desktop Hero ring widths and changed the shared orbit timing to 80 seconds for a slower, calmer motion. Satellite phase offsets were updated to preserve equal spacing around the ellipse.
- Desktop KPI satellites are now equal 96px circles rather than oval cards; all six remain legible, co-centered with the core, and clear of the left Hero copy. No production app/API behavior changed.

## 2026-10-19 Overview Hero compact-height pass

- Reduced the Desktop Overview Hero height to 340px with tighter vertical padding so the card follows the headline and supporting message more closely.
- Preserved the unified Galaxy Orbit geometry and left-copy clearance; the 320px visual field remains visible without changing production app/API behavior.

## 2026-10-19 Overview Hero copy pass

- Replaced the previous Thai slogan with the requested `TEAM OVERVIEW` heading and `สถานะทีมและจัดการงานสำคัญ` subtitle.
- Applied a polished Prompt heading and readable Thai typography; Galaxy Orbit geometry and production app/API behavior remain unchanged.

## 2026-10-19 Overview Hero special typography pass

- Added a two-tone Prompt treatment for `TEAM OVERVIEW`: navy `TEAM` plus a teal/violet gradient `OVERVIEW` accent.
- Strengthened the Thai subtitle weight and color for a special but readable Galaxy Hero style; production app/API behavior remains unchanged.

## 2026-10-19 Overview Hero softer type pass

- Replaced the rigid heavy heading treatment with Noto Sans Thai at weight 700 and reduced the Thai subtitle to weight 500 for a softer visual tone.
- Kept the two-tone heading color treatment, Galaxy orbit, and all dashboard behavior unchanged.

## 2026-10-19 Overview Hero special font pass

- Added the Mitr webfont and applied it to the Hero title/subtitle so the lettering has a rounded, special visual character while remaining readable in Thai.
- Preserved the Galaxy color treatment and all dashboard behavior.

## 2026-10-19 Overview Hero date format pass

- Updated the live date line to `วันจันทร์ที่ 19 ตุลาคม 2569 เวลา HH:MM:SS นาฬิกา` and retained its one-second live clock refresh.
- Styled and positioned the date line with Mitr and tabular numerals for a clean top-of-Hero readout.

## 2026-10-19 Overview Hero static metrics and top-date pass

- The Overview Hero now presents a still constellation of six readable metric circles with full Thai labels and values; the OT satellite remains available alongside the five requested team metrics.
- `TEAM OVERVIEW` is the upper-left Hero identity, the live Thai date/time sits at the upper-right without the `นาฬิกา` suffix, and the Desktop Hero height is reduced to 328px.
- Galaxy stars are larger and visibly blink through a dedicated animation with reduced-motion fallback. Prototype-only scope; no production source-of-truth or API behavior changed. JavaScript syntax, CSS parse, diff checks, and Desktop browser verification pass.

## 2026-10-19 Overview Hero centered orbit pass

- The Desktop Overview ring/core/satellite constellation is now centered on the Hero card itself, with the Hero copy remaining readable above the visual layer.
- Browser geometry check confirms the core center and Hero center align within sub-pixel rounding. Prototype-only scope; no production app/API behavior changed.

## 2026-10-19 Overview Hero orbit balance pass

- Evenly distributed the six static KPI circles around a shared ellipse and adjusted the three ring tracks into a balanced concentric set.
- Preserved the centered Hero geometry, readable copy, Galaxy stars, and prototype-only scope. Desktop geometry and visual checks pass.

## 2026-10-19 Overview Hero oval orbit trial

- Added a flatter horizontal oval treatment to the three Hero tracks and stretched the six satellite metrics into compact horizontal ovals for a clearer orbit silhouette.
- Kept the centre metric circular and preserved the Hero's centered geometry, readability, and prototype-only scope. Desktop visual and syntax checks pass.

## 2026-10-19 Overview Hero Leave-style ring pass

- Reused the Leave workspace's three-track visual language for Overview: tilted teal and amber tracks around a reverse lavender centre track, with the same slow shared orbit and moving glow arc.
- Preserved the Overview-specific metrics and centred composition. Desktop comparison and prototype validation pass.

## 2026-10-19 Overview Hero Leave-style stars and pulse pass

- Added the Leave Hero's small glowing sparkle treatment to the Overview orbit.
- Added staggered breathing pulses to the central readiness core and satellite metrics without changing their positions or readable labels. Prototype-only scope; Desktop screenshot and syntax checks pass.

## 2026-10-19 Overview Hero metric copy pass

- Renamed the attendance metric to `ลงเวลา` and the readiness metric to `พร้อมทำงาน`, removed the duplicated centre subtitle, and applied one shared oval type scale.
- Increased the side-satellite gap while preserving the shared orbit centre and left-copy clearance. Desktop visual and syntax checks pass.

## 2026-10-19 Overview Hero oval typography pass

- Enlarged and bolded all oval labels while keeping one shared value size and weight across the six metrics. Desktop visual and syntax checks pass.

## 2026-10-19 Overview Hero equal oval pass

- Standardized every satellite frame to the same 110×76px oval dimensions and removed the attendance oval's size exception.
- Kept one shared bold type scale across all six metrics. Desktop visual and syntax checks pass.

## 2026-10-19 Overview Hero fixed type scale pass

- Locked the six satellite labels and values to shared font sizes, weights, line-height, and tabular numerals so the metric text reads consistently.
- Kept the Galaxy breathing effect by animating each oval's inner halo instead of scaling its readable content. Prototype-only scope; no production app/API behavior changed.

## 2026-10-19 Overview Hero uniform orbit copy pass

- Made both lines inside each Hero satellite exactly 14px and 800 weight so every label/value pair has the same visible text scale.
- Preserved the halo-only pulse and fixed satellite positions. Prototype-only scope; no production app/API behavior changed.
- Widened all six shared satellite frames to 132×80px and removed text clipping to keep the full Thai metric labels readable.

## 2026-10-19 Overview Hero core type alignment pass

- Matched the centre `ความพร้อมทีม` label to the satellite Prompt type scale and unified the dark-navy color across core and satellite text.
- Preserved the Galaxy rings, halo pulse, and metric positions. Prototype-only scope; no production app/API behavior changed.

## 2026-10-19 Overview dashboard card hierarchy pass

- Put English labels above Thai titles across the board, insight, calendar, announcement, and KPI cards, using a card-specific pastel gradient for each English label.
- Removed the duplicate OT change-rate badge while keeping the single header badge, set the accumulated OT label dark, and applied a weekday-specific pastel bar palette with Saturday in purple.
- Made Recent Activity body text dark while leaving status pills in their original semantic colors.
- Ordered the calendar and company announcement supporting copy beneath the English eyebrow and Thai heading for a consistent card hierarchy.

## 2026-10-19 Overview English-first heading scale pass

- Made English card labels larger and Thai titles smaller across the full Overview card set while preserving each card's pastel gradient accent.

## 2026-10-19 Overview OT badge correction

- Restored one `+12%` change-rate badge in the OT summary card header while keeping the duplicate inline badge hidden.

## 2026-10-19 Overview bilingual header alignment pass

- Standardized desktop card headers so each icon aligns with the full English-over-Thai title block across Attendance, Medical, Team Calendar, and Company Update.

## 2026-10-19 Overview calendar galaxy content pass

- Replaced the dashboard card labels with `วันลาและกิจกรรมของทีม` and `ข่าวสำคัญที่ทีมควรรู้`.
- Added a concise calendar pulse summary and galaxy-styled grid treatment while keeping the existing leave, holiday, and month navigation content.

## 2026-10-19 Overview calendar cleanup pass

- Removed all WFH references because the product does not support WFH, including the dashboard calendar event, hidden legend, leave-calendar event, and pulse summary item.
- Removed redundant calendar and announcement supporting copy and the top activity-count note.
- Muted previous/next month controls and styled Saturday/Sunday headers and cells as gray holidays on desktop.
## 2026-10-19 Overview activity and OT framing pass

- Replaced Recent Activity text statuses with framed status icons (spark, clock, and check), removed the visible ใหม่ label, and shortened เบิกค่ารักษา to ค่ารักษา.
- Added a shared score-style frame to the OT summary with วันนี้ 10.5 ชั่วโมง before 42.5 ชั่วโมง OT สะสม, keeping the existing +12% header badge and pastel chart.
## 2026-10-19 Overview activity and calendar density pass

- Matched Recent Activity status icons to the 24px type icon size, kept each status distinct, and changed the pending state to an alert icon.
- Kept every activity field on a single compact line with ellipsis only when the card width requires it.
- Reflowed the OT totals into one smaller inline row, using the same pastel yellow/green surface and border family as the OT card.
- Removed the dashboard calendar today/leave pulse frame so the calendar opens directly into its month grid.
## 2026-10-19 Overview activity spacing and OT chart pass

- Added a protected right gutter to each activity card so copy cannot run into the status icon.
- Removed the OT totals frame, equalized the inline label/value typography, and returned the freed vertical space to the chart.
## 2026-10-19 Overview activity detail gutter correction

- Limited the status-icon gutter to each activity card's title line; person, date, duration, and reason rows now reclaim the full card width while staying single-line.
## 2026-10-19 Overview activity full-width copy pass

- Removed the remaining copy truncation and right padding from Recent Activity so each card can use its full width; the status icon remains layered separately in the upper-right corner.
- Preserved single-line fields with compact tracking so dates, durations, and reasons stay inside the card.
## 2026-10-19 Overview activity typography pass

- Increased Recent Activity type labels to 12px and detail rows to 10px with stronger weight and compact tracking so the three-card grid remains one-line and readable.
## 2026-10-19 Overview activity 16px readability pass

- Set the Recent Activity grid type and detail copy to the requested 16px scale with compact tracking so the enlarged text remains inside each desktop card.
## 2026-10-19 Overview activity detail type scale pass

- Set Recent Activity person, date, duration, and reason lines to 14px regular weight; the activity type remains the larger bold heading.
## 2026-10-19 Overview activity WIP text lock

- Locked Recent Activity rows to each card boundary: copy is clamped to one line with ellipsis and cannot bleed under the status icon or outside the card.
## 2026-10-19 Overview activity wrapping pass

- Revised the WIP text lock so long activity copy wraps to the next line inside the card instead of truncating with an ellipsis or spilling outside the boundary.
## 2026-10-19 Overview natural activity wrapping pass

- Removed arbitrary character-level breaks from activity copy; text now consumes the available line naturally before moving to the next line within the card.## 2026-10-19 Overview activity edge-wrap correction

- Restored the original three-column desktop card proportions after the attempted widening pass.
- Removed the reserved right gutter from activity rows; detail copy now uses the full card width and wraps naturally to the next line while remaining inside each card.## 2026-10-19 Overview activity type scale correction

- Reduced Recent Activity type labels by one step to 15px so labels such as ลาพักร้อน sit more comfortably beside their icons; the detail rows remain 14px regular.## 2026-10-19 Overview activity heading wrap correction

- Kept activity names such as ลาพักร้อน on one complete line by removing the title-only right gutter; supporting detail rows still use the full card width and wrap naturally.## 2026-10-19 Overview statistics row redesign

- Added a Leave Statistics board before the OT section, with today’s six leave count, three leave-type breakdowns, and the eight-item approval queue.
- Moved OT Summary into the same three-card row as Attendance / Today and Medical / Benefit.
- Reworked Attendance and Medical into scannable statistic cards with summary scores, progress, and compact metric tiles while preserving the pastel galaxy card system.
## 2026-10-19 Overview OT and attendance statistic refinement

- Put OT Summary before Attendance / Today in the shared statistics row.
- Enlarged the inline OT totals to 15px, removed duplicate medical claim/pending tiles, and strengthened the four attendance metrics with distinct pastel surfaces.
- Kept the six overview cards on distinct pastel color families.

## 2026-10-19 Overview card consistency pass

- Removed the duplicate medical progress label from the dashboard card.
- Changed the Attendance header badge to the date label `19 OCT 26` and matched the `86 / 103 คน` progress text to the `83.5%` scale.
- Standardized the Leave Statistics approval badge geometry and white surface, while giving Attendance a distinct rose score accent.

## 2026-10-19 Leave Statistics color alignment

- Shifted Leave Statistics heading, icon, score, and approval badge from purple to the dashboard card's sky-blue family.
- Matched each leave progress bar to its corresponding purple, amber, or teal status dot.

## 2026-10-19 Attendance and medical progress alignment

- Applied a pink accent to Attendance / Today, its icon, completion score, and `86 / 103 คน` progress label.
- Moved Medical / Benefit progress directly below its score, with green endpoint labels `38.4%` and `61.6%` before the allowance breakdown.

## 2026-10-19 OT total alignment

- Centred the inline `วันนี้ 10.5 ชั่วโมง · ชั่วโมง OT สะสม 42.5 ชั่วโมง` summary within the OT card without moving the chart.

## 2026-10-19 Recent Activity typography alignment

- Matched the Recent Activity detail rows for employee, date, duration, and reason to the status-row typography used by `พร้อมทำงาน 86 คน`.
- Kept the four detail rows readable with natural wrapping inside each activity card.

## 2026-10-19 Leave and medical metric alignment

- Changed Leave Statistics progress endpoints from raw counts to `50%`, `33%`, and `17%` so they read like the Team Status percentages.
- Matched the Team Status `103 คน` badge to the card's teal accent.
- Put each Medical / Benefit usage label and amount on one line: `ใช้ไป ฿3,840` and `คงเหลือ ฿6,160`.

## 2026-10-19 Medical endpoint accent

- Changed the Medical / Benefit right progress endpoint `61.6%` to the dashboard purple accent while keeping `38.4%` green.

## 2026-10-19 Medical allowance copy hierarchy

- Changed the Medical / Benefit badge to `วงเงิน ฿10,000 / ปี`.
- Stacked `ใช้ไป` over `฿3,840` and `คงเหลือ` over `฿6,160`, removing the explanatory sub-lines.

## 2026-10-19 Dashboard metric hierarchy

- Centred the Medical / Benefit amounts inside their tiles.
- Reordered Attendance / Today tiles so each status label is on the first line and its number is on the second line.

## 2026-10-19 Attendance progress accent

- Changed the Attendance / Today progress track and fill to the same rose-pink accent used by its icon, heading, score, and labels.

## 2026-10-19 Recent Activity readability

- Increased spacing and contrast in the activity details so employee, date, duration, and reason read as distinct rows.
- Gave the employee name a stronger hierarchy while keeping all copy inside each activity card.

## 2026-10-19 Hero date day-color coding

- Added Thai weekday color coding to the live Hero date and clock (Monday uses a readable gold accent; other days switch automatically).

## 2026-10-20 Live Hero date rollover fix

- Added a live date node to the Hero kicker so the weekday, Buddhist date, and day-color class refresh with the existing one-second clock timer; crossing midnight no longer requires F5.

## 2026-10-20 Personal leave statistics card

- Added a dashboard card for personal leave rights with total allowance, used days, remaining days, and separate vacation, personal business, and sick leave breakdowns.
- Flattened the card to a single Leave Statistics-style frame, using divider rows and progress bars instead of nested cards.
- Reworked the card to match the Leave Statistics pattern directly: one full-width blue frame, one total-rights score panel, and three leave-type progress rows before the OT/attendance/medical cards.
- Updated the personal leave card to a soft rose theme, changed the badge to `ปี 2569`, removed the total summary frame, and added explicit `ใช้ไป 25%` / `คงเหลือ 75%` endpoints with remaining-day labels per leave type.
- Switched the personal leave card to a distinct coral-orange accent and moved calculated used/remaining percentages into each vacation, personal business, and sick leave progress row.
- Moved each leave percentage pair below its progress bar to match the MEDICAL / BENEFIT card hierarchy.
- Matched each percentage label color to its leave progress bar: purple for vacation, amber for personal business, and teal for sick leave.
- Increased the leave progress bars to the same 12px height as TEAM STATUS, color-coded the leave titles, and added `เหลือสิทธิ์ลา 12 วัน` to the vacation row.
- Changed the personal business leave bar and its labels to a coral-red accent for contrast against the orange card background.
- Added remaining leave-rights notes to all three rows: 12 days vacation, 2 days personal business, and 4 days sick leave.
- Moved used and remaining percentages inside the filled and neutral portions of each leave progress bar, leaving only the percentage values visible.
- Applied the same inline percentage treatment to ATTENDANCE / TODAY and MEDICAL / BENEFIT, with taller bars and italic, color-matched remaining percentages.
- Updated the vacation row to `ลาพักร้อน ใช้ไป 3 / 15 วัน` and aligned each personal-leave progress bar on the same desktop row as its leave text.
- Reflowed the desktop overview cards into two paired rows: TEAM STATUS with RECENT ACTIVITY, then LEAVE STATISTICS with MY LEAVE STATISTICS.
- Moved Attendance's `86 / 103 คน` into the filled progress segment and `83.5%` to the right endpoint, removing the former `16.5%` and the count below the bar.
- Added a matching `คงเหลือรวม 18 วัน` score panel to MY LEAVE STATISTICS and reordered each row to leave type, progress, then `คงเหลือ` days.
- Increased the personal leave, Attendance, and Medical progress tracks to 28px while keeping the percentages centered and visible.
- Updated the personal leave copy to `ลากิจ ใช้ไป 1 / 3 วัน` and `ลาป่วย ใช้ไป 1 / 5 วัน`; restored its compact 16px tracks and replaced the gray remainder with leave-type pastel gradients. Attendance and Medical retain 28px tracks.
- Warmed the `คงเหลือรวม 18 วัน` score text to dark brown with a deeper orange number for legibility on the peach panel.
- Dashboard prototype: pastel remainder tracks now match each statistic, and personal leave rows have longer bars with consistent dots and text.
- Verification note: prototype syntax and diff checks pass; repository-wide check remains blocked by 43 unrelated LIFF lint errors.
- Dashboard paired leave cards now share consistent leave-type colors and shorter `เหลือ` labels.
- Personal leave used-percent text is white inside the filled bars.
- TEAM STATUS row labels and percentages now follow the matching progress colors.
- OT SUMMARY header badge now uses the shared white pill treatment.
- Paired leave-statistics row labels now share the same Thai typeface and bold weight.
- Reflowed the desktop Overview prototype so RECENT ACTIVITY is a full-width horizontal card above TEAM STATUS, LEAVE STATISTICS, and MY LEAVE STATISTICS; removed the five duplicate KPI rail cards. Verified in the local Desktop preview at 1440px.
- Restored the Owner-selected two-row Overview order: TEAM STATUS beside RECENT ACTIVITY, then LEAVE STATISTICS beside MY LEAVE STATISTICS. KPI rail remains hidden. Desktop preview verified at 1440px.
- Adjusted Overview density: TEAM STATUS and LEAVE STATISTICS now use one-third-width cards matching OT SUMMARY; RECENT ACTIVITY and MY LEAVE STATISTICS span the full desktop row. Preview verified at 1440px.
- Finalized the requested two-row 1+2 grid: TEAM STATUS with two-column RECENT ACTIVITY above LEAVE STATISTICS with two-column MY LEAVE STATISTICS. Desktop preview verified at 1440px.
- Redesigned MY LEAVE STATISTICS as a three-tile pastel grid: vacation, sick leave, and business leave each show the used count, entitlement, progress, and remaining days in the existing dashboard style. Preview verified at 1440px.
- Replaced the three personal-leave tile icons with the supplied 3D artwork, added Thai/English labels, white entitlement badges, and expanded progress bars with inline percentages plus used/remaining day labels above each track.
- Updated MY LEAVE STATISTICS so all three tiles show English above Thai, removed entitlement copy, and match the MEDICAL / BENEFIT progress treatment with used and remaining day labels above each percentage bar.
- Validation: `node --check` and `git diff --check` pass for the prototype changes; repository lint/typecheck still report pre-existing LIFF errors, tests hit 61 sandbox-path `ENOENT` failures, and the production build hits the existing Turbopack CSS worker panic.
- Polished the three MY LEAVE STATISTICS tiles so each icon sits beside its English/Thai title, the percentages use Medical's italic bold treatment, and entitlement badges are fully hidden.
- Restored consistent top-right entitlement pills (`สิทธิ์ 15 วัน`, `สิทธิ์ 3 วัน`, and `สิทธิ์ 5 วัน`) on all three MY LEAVE STATISTICS tiles and widened the icon-to-title gap to prevent overlap. Desktop preview verified at 1440px.
- Validation after the entitlement and spacing update: `node --check` and `git diff --check` pass; repository lint still reports the existing 43 LIFF errors, typecheck reports existing LIFF errors, tests report sandbox-path `ENOENT` failures, and the production build still hits the existing Turbopack CSS worker panic.
- Rebalanced the three personal-leave tile headers by removing the legacy absolute icon offset, aligning each artwork box with its bilingual title, and adding a calendar icon to each color-matched entitlement pill.
- Updated the Overview Hero constellation with `พร้อมทำงาน 86/103 คน`, `ค่ารักษา ฿3,840`, and `OT สะสม 42.5 ชั่วโมง`; added vacation, business-leave, and sick-leave oval satellites and moved the wider horizontal ellipse into the right visual lane. Desktop preview verified at 1800px.
- Matched the three new leave satellites to the existing Hero ovals at 132×80px with the same 14px bold two-line metric type, then opened their positions slightly to keep each badge separated.
- Matched the leave satellite fills to the existing purple, green, and red Hero gradients and changed all three frames to the shared white border, neutral navy text, and matching category shadow treatment.
- Recolored the three new Hero leave ovals to unique pastel hues (gold, mint, and orchid) so none repeats an existing metric, and shifted the complete orbit group 36px right while keeping every badge within the Hero bounds.
- Clustered the vacation, business-leave, and sick-leave ovals together on the right side of the constellation in a compact diagonal arrangement, with clear spacing from OT, attendance, and the live timestamp.
- Rebalanced all nine Hero ovals into a shared three-level ellipse layout: three across the top, four around the centre, and three across the bottom, while preserving the clear left copy lane and Hero bounds.
- Tightened the Hero constellation so vacation, business-leave, and sick-leave ovals stay together as a right-side leave cluster while the six operational metrics remain evenly distributed around the inner ellipse.
- Re-spread the six operational Hero metrics into an asymmetric orbital layout instead of a fixed row pattern, while keeping the three leave metrics clustered and every oval within the Hero bounds.
- Repositioned Medical to the owner-marked left slot, moved Ready Today to Medical's former slot, moved OT to Ready Today's former slot, and redistributed the three leave ovals around the vacated OT area.
- Fine-tuned the final Hero spacing: operational ovals now follow a balanced asymmetric arc, the leave trio keeps a clean triangular cluster, and all oval gaps remain collision-free.
- Added a Desktop-only Hero layout editor: drag any satellite, use arrow keys for fine movement, save positions per browser, and reset to the CSS arrangement.
- Matched the secondary Desktop workspaces to the Overview visual system: light pastel galaxy surfaces, shared card borders, readable dark content, and consistent progress, timeline, request, approval, report, and settings panels.
- Started the Leave workspace detail pass: added an Overview-level leave balance board by leave type, a weekly team leave map with date states, and a clearer planning action while preserving the existing request, balance, upcoming, and history flows.
- Aligned the Leave page to Overview point by point: matched the 328px Hero baseline and orbital lane, rebuilt the first two rows as 440/898px pastel boards at 299px height, and matched bilingual heading hierarchy, gradients, progress bars, activity cards, team map, and three personal leave tiles.
- Completed the visual parity pass with Overview card tones, border colors, activity row geometry, title letter spacing, Thai font metrics, and the live date/time kicker structure.
- Kept Leave history on the same page: exposed the styled `LEAVE HISTORY` panel below the action area, routed `leave/requests` back to that page, and added in-page scrolling from Recent Activity.
- Reworked the Leave action area into an Overview-style desktop grid: the request form spans two columns, balance and upcoming leave sit beside it, and history spans the full row.
- Converted the three Leave history records into matching desktop sub-cards inside the full-width history board; tablet and mobile layouts retain the readable stacked list.
- Reordered the Leave home flow so the request card is the first actionable board after the Hero, with reference-aligned type, date, duration, detail, attachment, approval, and submit steps before the overview statistics.
- Reframed the Leave home page as three explicit desktop sections—request, leave statistics, and leave history—with in-page section navigation and statistics boards grouped by personal/team context.
- Rebuilt the Leave desktop workspace from the ground up with a focused request form, balance and upcoming-leave side rail, dedicated statistics cards, entitlement breakdown, and filterable history table.
- Added an explicit nine-oval Overview layout control surface so every Hero metric can be selected and positioned without relying on visually targeting a small oval.
