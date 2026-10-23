# CKACE HR — ACTIVE TASK

Updated: 2026-10-23 Asia/Bangkok

## WEB-LEAVE-06 — Full authenticated NAV + direct-URL regression on TESTm72

Status: **READY — TESTm72 rollout and Manager responsive tooltip gate PASS; full role regression is next**
Priority: **P1 — current TEST confidence gate**

Objective / why now:
Re-run the complete authenticated Employee/Manager/SuperAdmin NAV and direct-URL matrix on the final TESTm72 release after the responsive tooltip fix, proving that the CSS-only change did not regress permissions, navigation or narrow-viewport behavior.

Scope:
- Use Owner-controlled TEST sessions for plain Employee `พนักงาน`, Manager `หัวหน้า`, and the elevated `TEST`/SuperAdmin fixture as available; never create or set passwords.
- Check every exposed NAV group and its representative direct URLs, including allowed and failed-closed boundaries recorded by the previous role matrix.
- Repeat narrow viewport checks at the hosted Codex viewport (`innerWidth=695`) for Dashboard and relevant admin/approval pages.
- Read-only verification only; do not submit leave, OT, medical, time-correction or approval actions.

Out of scope:
- Any source change unless a fresh regression is proven; Production services/traffic/DB/DNS/Firebase, `ckrr-line-gateway*`, Secret Manager, IAM, project settings or new grants.
- Project A, protected `docs/design/desktop-20261018/**`, destructive cleanup and unrelated refactors.

Acceptance / verification:
- Employee: all permitted self-service NAV routes load; approval/report/admin direct URLs fail closed; no narrow NAV overflow.
- Manager: self-service, approvals, Reports, Announcements and permitted admin routes load; unrelated admin routes fail closed; no narrow overflow.
- SuperAdmin/elevated fixture: management, reports and approval destinations load; no narrow overflow.
- Every checked direct URL shows the expected route/permission outcome and no business mutation is performed.
- TESTm72 remains healthy during the run; Production remains untouched.

TESTm72 rollout evidence (Owner-authorized `Build`):
- Cloud Build `60b80e24-6eb4-4c62-b158-75b725b62222` = **SUCCESS**, source SHA `85c75295c735e618cf2f3def86f095350f7a9e8b`, branch `codex/web-leave-05-role-gate`, `_VERSION=m72`.
- Cloud verify, API/Web image build and push, migration, deploy, traffic switch and Hosting/health verification all passed.
- API `ckace-hr-api-test-m72` Ready with 100% traffic; image digest `sha256:b420b95e650c37c8f4b739929a705dd0ef0aedd6a358c8e65f5b1e279c85101a`.
- Web `ckace-hr-web-test-m72` Ready with 100% traffic; image digest `sha256:15a9f5918d441bdce282f7b7b3a10688585fbda2b422d27e75646fd4f52d33ff`.
- Migration execution `ckace-hr-migrate-test-s9k7f` completed successfully.
- Public `/api/health` returned `ok=true`, `stage=test`, `runtime=NON_PRODUCTION`, `serviceRevision=ckace-hr-api-test-m72`.
- No rollback was needed. Local Firebase REST readback is unavailable because of ADC quota-project configuration; the approved pipeline's deploy-and-verify step passed.

Manager responsive evidence on TESTm72:
- Manager identity `หัวหน้า` was confirmed in the Codex in-app tab.
- `/desktop/admin` at `innerWidth=695` measured `documentWidth=690`, `clientWidth=690`, `bodyWidth=690`, and `offenders=[]`.
- All visible `.ck-dot-tip` labels were readable: widths approximately `56–113px`, heights `27.375px`, and right edge `651.6 <= 690`.
- Focused tooltip `ปิดอยู่ (ปลอดภัย)` rendered with `opacity=1`, normal wrapping and no overflow. No business action was submitted.

Local verification:
- Web lint **PASS**.
- Targeted `desktop-route-access.test.ts` **7/7 PASS**.
- Source commit `85c75295c735e618cf2f3def86f095350f7a9e8b` is pushed to `source/codex/web-leave-05-role-gate`.

Next action:
Run the full authenticated NAV/direct-URL matrix on TESTm72 using the Owner-controlled role sessions. Do not touch Production.
