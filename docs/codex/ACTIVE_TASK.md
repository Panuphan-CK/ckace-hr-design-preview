# CKACE HR — ACTIVE TASK

Updated: 2026-10-23 Asia/Bangkok

## WEB-LEAVE-05 — Fix Manager tooltip readability and prepare TESTm72

Status: **PARTIAL — TESTm71 has no overflow but tooltip readability fails; local CSS fix ready, Build authorization pending**
Priority: **P1 — current TEST acceptance gate**

Objective / why now:
Correct the remaining hosted Manager responsive defect found on TESTm71: status-dot tooltips stay inside the viewport but collapse to the 28px status-dot width and wrap each label into an excessively tall column. Promote the local fix only after the Owner explicitly says `Build`, then rerun the Manager check on TESTm72.

Scope:
- Local CSS fix in `apps/web/src/app/desktop/ui/ck-v2.css` only: keep the right-edge tooltip within the viewport while allowing natural readable width, capped at 320px.
- After explicit Owner `Build` authorization, use only the approved regional trigger for TESTm72 and then verify with the Owner-controlled Manager fixture `หัวหน้า`.
- Recheck `/desktop/admin` at the hosted narrow viewport (target `innerWidth=695`): `document.documentElement.scrollWidth <= clientWidth`, no right-edge tooltip overflow, and tooltip labels render as readable horizontal text.
- Do not submit business actions.

Out of scope:
- Build/deploy before explicit Owner `Build` authorization; Production services/traffic/DB/DNS/Firebase, `ckrr-line-gateway*`, Secret Manager, IAM, project settings or new grants.
- Project A, protected `docs/design/desktop-20261018/**`, destructive cleanup and unrelated refactors.

Acceptance / verification:
- Owner explicitly says `Build` before the TESTm72 mutation.
- Manager identity is confirmed as `หัวหน้า` before recording hosted evidence.
- Hosted `/desktop/admin` at the narrow viewport has no horizontal overflow and every visible `.ck-dot-tip` stays within the viewport with readable label layout.
- Existing Manager permission/direct-URL matrix remains unchanged and no business action is submitted.

TESTm71 rollout evidence (Owner-authorized `Build`):
- Cloud Build `eb8a317b-5146-4d80-ac81-4f7fc315069f` = **SUCCESS**, source SHA `4345fa2d6391a815bbf900a2fd67387da97f7370`, branch `codex/web-leave-05-role-gate`, `_VERSION=m71`.
- Verify step passed lint, typecheck and tests; API/Web image build and push steps passed.
- API image/revision digest: `sha256:d3d058d7ff95298fddfd3a8ec86d101a58ab38749343e14a5765d408235c6d10`; `ckace-hr-api-test-m71` Ready.
- Web image/revision digest: `sha256:c0cac395fe32d1b5cb3a1026100a90db53c0d79311ab4fa7cb9aecfaa0904311`; `ckace-hr-web-test-m71` Ready.
- `ckace-hr-migrate-test-qbwfp` completed successfully; the m71 image digest was used by the execution.
- Cloud Run API and Web each show 100% traffic on the m71 revision; no rollback was needed.
- Public `https://ckrr-leave-system-2026.web.app/api/health` returned `ok=true`, `stage=test`, `runtime=NON_PRODUCTION`, `serviceRevision=ckace-hr-api-test-m71`.
- The approved pipeline completed Firebase Hosting live re-release and its deploy-and-verify step passed; local Firebase REST readback was blocked by ADC quota-project configuration, so no release ID is claimed from local evidence.

Responsive evidence after m71:
- Manager identity `หัวหน้า` was confirmed in the Codex in-app tab.
- Hosted `/desktop/admin` at `innerWidth=695` had no horizontal overflow: `documentWidth=690`, `clientWidth=690`, `bodyWidth=690`, `offenders=[]`.
- Readability **failed**: visible `.ck-dot-tip` elements were only about `28–30px` wide and `104–241px` tall because the tooltip's auto width collapsed to the status-dot containing block. This is the remaining defect; do not mark the task PASS.
- Local fix applied: `width: max-content`, `max-width: min(320px, calc(100vw - 32px))`, `box-sizing: border-box`, `white-space: normal`, and `overflow-wrap: anywhere` for narrow `SettingRow` tooltips.
- Local verification after the fix: Web lint **PASS**; targeted `desktop-route-access.test.ts` **7/7 PASS**. Hosted TESTm71 remains unchanged until a new Build is authorized.

Next action:
Owner says `Build`; then run TESTm72 with the approved trigger and rerun the hosted Manager `/desktop/admin` overflow + tooltip readability check. Do not touch Production.
