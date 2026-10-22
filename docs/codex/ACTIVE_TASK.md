# CKACE HR — ACTIVE TASK

Updated: 2026-10-22 Asia/Bangkok

## M67-R5 — Prepare the next TEST release from verified Claude lineage

Status: **READY**
Priority: **P1 — TESTm67 stabilization**

Objective:
Prepare a concrete next-TEST release plan from the verified Claude candidate `5a29241`, proving the current API/Web image and traffic provenance and rollback targets before requesting a TEST build.

Why now:
Authenticated TESTm67 checks verified OT threshold behavior, attendance-policy save/persistence, holiday-table refresh, and numeric attendance Excel exports. The remaining candidate difference is explicit two-decimal Excel formatting. No urgent build blocker was reproduced in the exercised paths.

Scope:
- inspect TEST-only deployment metadata through available read-only access;
- identify API/Web revisions, image digests, traffic allocation, build source and rollback targets where evidence permits;
- review `infra/cloudbuild/test-release.yaml` at the Claude candidate for safe revision naming and rollback;
- prepare one batched TEST change set and post-deploy verification plan;
- preserve the original dirty Local tree and the protected design artifact.

Out of scope:
- TEST build/deploy/traffic until the Owner explicitly requests it;
- any Production operation;
- automatic integration of uncertain Local-only desktop-auth/LIFF work;
- Project A / APP_Leave work;
- role/access expansion or approval-policy changes without concrete required confirmation.

Acceptance criteria:
- release candidate is pinned to a verified source SHA;
- current TEST API/Web deployment evidence and any evidence gaps are recorded;
- intended revisions and rollback targets cannot accidentally reuse or promote stale m67 images;
- release change set and post-deploy checks are concrete and reviewable;
- source/continuity diff and Git status are reviewed before publication;
- Owner approval is obtained before deployment or commit/push.

Current evidence:
- Live health: `ckace-hr-api-test-m67`, `stage=test`, `NON_PRODUCTION`.
- Claude candidate: `5a29241`; prior Local gates passed: lint, typecheck, 110 files / 821 tests, Prisma validation and full build.
- TEST attendance export: seven numeric hour values; E11 total `34.269999999999996`; both sheets use General number format. Candidate adds `0.00` formatting while retaining numeric values.
- OT threshold was tested at 20:00 -> 20:30 -> 20:00. A 20:15 end changed from meal-eligible to below-threshold; exactly 20:30 was meal-eligible. Original policy restored and verified after reload.
- Holiday description and attendance-policy name were temporarily edited, saved, reloaded where applicable, restored and verified. Holiday table refreshed immediately after save.
- Baseline attendance radius remains 0.1 km. NEWTEST remains inactive, with no selected roles and SELF scope. Four active approval policies use ADMIN (same team) then SUPERADMIN (all teams).
- Owner selected B and clarified on 2026-10-22 that TEST changes do not require automatic restoration. Record what changed and its test purpose; retain useful TEST settings/data unless restoration is needed for another check or the Owner requests it. This does not authorize destructive actions, security-sensitive access expansion, deployment or Production changes. Owner personally logged in; session is available.

Verification limits:
- No GPS clock action, role/access mutation, approval-chain mutation or new request submission was performed in the authenticated check.
- Workbook values/types were read directly from XLSX XML using bundled Python after the artifact-tool import failed in node_repl (`node:process` restricted). No workbook was edited.
- Exact live build SHA, Web revision and Cloud Run traffic allocation are still unproven.

Next:
Gather TEST-only deployment provenance and prepare the next release plan. Keep the existing authenticated browser session for further read-only verification; do not ask the Owner to log in again unless the session expires.
