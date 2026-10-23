# CKACE HR — ACTIVE TASK

Updated: 2026-10-23 Asia/Bangkok

## WEB-LEAVE-07 — Full authenticated Leave workflow regression on TESTm72

Status: **READY — WEB-LEAVE-06 role/NAV matrix PASS; next TEST business-flow gate**
Priority: **P1 — current TEST confidence gate**

Objective / why now:
Verify the complete Leave request lifecycle on the healthy TESTm72 release after all three role boundaries passed: Employee submit/history, Manager approval visibility/decision path, and elevated SuperAdmin approval/history boundary.

Scope:
- Use only Owner-controlled TEST sessions `พนักงาน`, `หัวหน้า` and elevated `TEST/SuperAdmin`; never create or set passwords.
- Use a clearly synthetic TEST fixture and complete one bounded Leave flow end-to-end, including status/history readback and the existing approval chain.
- Record every state transition and confirm no duplicate or unintended second request is created.
- TEST only; no Production, Project A, protected design artifact, Secret Manager, IAM, gateway or project-setting changes.

Out of scope:
- OT, Medical, Time Correction, attendance writes and unrelated refactors unless a Leave regression proves a shared blocker.
- Production services/traffic/DB/DNS/Firebase and destructive cleanup.

Acceptance / verification:
- Employee can open Leave, submit one synthetic request through the existing form, and see the expected pending/history state.
- Manager can open the Leave approval destination, see the request in the correct queue, and complete the approved TEST decision path without duplicate decisions.
- Elevated SuperAdmin can read the resulting approval/history state and the server remains authoritative.
- No unintended route denial, page-level horizontal overflow or console/runtime blocker on the tested Leave pages.
- TESTm72 health and 100% traffic remain unchanged; Production remains untouched.

Completed WEB-LEAVE-06 evidence:
- Employee `พนักงาน`: 35 direct URLs — 12 granted self-service/news routes, 23 expected denials; profile showed `EMPLOYEE`, 22 permissions.
- Manager `หัวหน้า`: 35 direct URLs — 33 granted, 2 expected denials (`/desktop/admin/management#roles`, `/desktop/admin/approval-policies`); profile showed `ADMIN + EMPLOYEE`, 46 permissions.
- Elevated `SuperAdmin คนที่สอง`: 35 direct URLs — all 35 granted; profile showed `SUPERADMIN + EMPLOYEE`, 58 permissions.
- Narrow viewport `innerWidth=695`: Dashboard metrics had `documentWidth/clientWidth/bodyWidth` within the viewport and zero page-level offenders for Employee, Manager and SuperAdmin key pages; Employee Leave's wide table remained inside its intended internal scroll surface.
- Public health readback: `ok=true`, `stage=test`, `runtime=NON_PRODUCTION`, `serviceRevision=ckace-hr-api-test-m72`.
- Cloud Run readback: `ckace-hr-api-test-m72` and `ckace-hr-web-test-m72` each report `percent=100` traffic.
- No business action was performed during WEB-LEAVE-06; no source files changed.

Local verification:
- Web lint **PASS**.
- Targeted `desktop-route-access.test.ts` **7/7 PASS**.
- `git diff --check` **PASS**; only the three expected continuity Markdown files are modified for publication.

Next action:
Run the bounded synthetic Leave workflow on TESTm72. Do not build or touch Production unless the Owner explicitly requests a separate release action.
