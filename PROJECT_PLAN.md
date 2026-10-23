# CKACE_HR — Project B PROJECT PLAN

Last Updated: 2026-10-23 Asia/Bangkok

> Canonical plan for **Project B only**: `D:\CKACE_HR`.
> Project A `D:\APP_Leave` has separate continuity and must not be tracked here.

## Current Active Task — 2026-10-23

**WEB-LEAVE-05 — TEST rollout + authenticated role matrix rerun** is the current P1 task. The source fix is committed/pushed as `2355d5246d1819899161c0b3c90ee86e3ffd37d2` on `codex/web-leave-05-role-gate`.

- Read-only preflight captured API/Web `m69` at 100%; latest prior migrate execution `ckace-hr-migrate-test-n9x6v` succeeded.
- The Owner explicitly said `Build`; only the approved regional Trigger `ckace-hr-test-manual-release` (`4f54907f-eed2-4813-b51e-25af6a3dbf01`) was used.
- Cloud Build `fd4404e6-4bea-4d21-9cab-96eae051c19c` = **SUCCESS** from source SHA `7ea2c7f2b3ea75c044aeeb6e7d990593e1d65ffd`, including `111` test files / `830` tests PASS, image build/push, migration and TEST deploy.
- TESTm70 verification: API `ckace-hr-api-test-m70` and Web `ckace-hr-web-test-m70` are Ready with 100% traffic; migration `ckace-hr-migrate-test-fcckm` succeeded; public health reports `serviceRevision=ckace-hr-api-test-m70`, `stage=test`, `runtime=NON_PRODUCTION`; Firebase release `1792730304686000` completed.
- Authenticated rerun passed for the elevated `TEST` / `EMPLOYEE SUPERADMIN` session on representative Home, Leave, Leave approvals, Reports and role-management routes, including narrow `695x668` overflow check. The Manager session (`หัวหน้า`) then passed self-service, all approval hashes, Reports, Announcements and permitted admin direct URLs; `admin/management#roles` correctly failed closed. The separate plain Employee session (`พนักงาน`) also passed its allowed/denied matrix.
- Manager responsive follow-up: `/desktop/admin` measured `documentWidth=696` vs `clientWidth=690` at the hosted `695px` viewport, caused by the `.ck-dot-tip` edge tooltip; other tested Manager routes had no horizontal overflow. This remains a P3 acceptance issue until fixed or Owner-accepted.
- The Owner-opened `TEST` login is confirmed by Profile as `EMPLOYEE` + `SUPERADMIN` with `58` permissions, so its successful approvals/reports/admin direct URLs are elevated-session evidence, not plain Employee deny-case evidence. A separate plain Employee login is still required.
- Read-only Users view identifies the required plain Employee fixture by the account label `พนักงาน`, separate from `TEST` and `หัวหน้า`.
- Plain Employee (`พนักงาน`) hosted matrix passed: self-service, Profile, Inbox, Benefits and read-only Announcements loaded; approvals, Reports and Admin/Management/Professional roles/Approval policies direct URLs failed closed; visible Dashboard NAV contained only permitted self-service links and no horizontal overflow at the hosted `695px` viewport.
- Responsive fix prepared locally in `apps/web/src/app/desktop/ui/ck-v2.css`: narrow `SettingRow` status-dot tooltips now right-anchor and wrap within the viewport. Web lint and targeted route-access tests pass; full Web typecheck/build remains blocked by pre-existing contract errors (Webpack compiled before typecheck) and Turbopack worktree symlink handling. TESTm71 build/deploy is not authorized until the Owner says `Build`.

Production remains NO-GO. Do not touch Project A, protected design artifacts, Production services, Secret Manager, IAM or project settings.

## Current Phase

**Phase A — Project B Web Desktop Functional + Security QA — PASS**

Phase A review is complete on TEST. Production remains **NO-GO** until later explicit gates.

**Status 2026-10-17 (TEST, branch `claude/project-thread-j4idbg`, commit 38b3e86):** the v18 Desktop redesign and the Owner-driven workflow work are deployed to TEST (API m19b, Web m19a) and covered by an API-level regression run inside the TEST migrate-job image (authorization, leave/OT/medical/time-correction cycles, add-record for a whole missing day, medical auto-approval policy, reports, delegations). Owner decisions: late threshold 09:05 (attendance policy), over-limit medical claims stay capped at the per-claim limit, medical auto-approval roles are policy data, LINE LIFF stays out of scope. Open: Owner single-pass visual review of the web UI on TEST; LINE/email sending (credentials deferred, TEST has no Cloud Scheduler); leave logic vs Production is otherwise aligned (docs/design/PRODUCTION_RULES_SUMMARY.md, comparison 2026-10-17); import of real employees and balances, Production release and GAS retirement each need separate Owner approval and have not been started.

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
| TASK-39.9 | Desktop full redesign (apps, icon rail, per-type pages) | **IN PROGRESS — mockup v18 under Owner review** |
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

1. **Development ownership:** ChatGPT is the primary Developer/Reviewer/QA for Project B and works directly through @lnwjud. Codex is not used for Project B coding unless the Owner explicitly requests it again.
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
14. TASK-39.7 retains TASK-39.6 Leave-first IA while using Project A only as a read-only visual reference to restore stronger Production-style Desktop surfaces and Dashboard/Calendar presentation.
15. TASK-39.8 uses Project A only as a read-only visual/interaction reference. Waves 1–2 keep Project B authorization, API contracts and business rules unchanged while aligning My Requests and Approval Work presentation to Production.

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
- TASK-39.8 Wave 3 — Reports Production parity
- TASK-39.8 Wave 4 — Employee/Admin/Leave Settings/Platform Settings parity
- TASK-39.8 final whole-task responsive/functional regression and Owner visual review
- stabilize and promote the Leave-first Desktop source only through an explicitly approved release gate
- future shared Employee Master expansion for accounting/audit affiliation and professional registrations after Leave-first stabilization
- future Office / Customer / Audit modules as separate later phases
- prepare Production readiness plan under TASK-40 after explicit Owner approval
- separate Production go/no-go approval under TASK-41.

## Next Action

**Owner reviews the TEST web UI once (decides whether UX/UI is accepted), then the remaining Production-parity gaps and the release-readiness plan (TASK-40) are scheduled.**

Keep Production/Project A/LINE LIFF/GAS/Gateway unchanged. Real-employee import, Production release, source-of-truth switch and GAS retirement each require explicit Owner approval.
