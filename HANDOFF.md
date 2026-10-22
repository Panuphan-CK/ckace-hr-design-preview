# CKACE_HR — HANDOFF

Last Updated: 2026-10-22 Asia/Bangkok

## Current state

- Active executor: **Codex Local**
- Primary implementation baseline: `origin/claude/project-thread-j4idbg`
- Owner-confirmed TEST baseline: **TESTm67**
- Current focus: **M67 reconciliation / stabilization / verification**
- Production: **NO-GO**
- Local working tree contains preserved dirty/untracked work and must not be destructively cleaned.

## Documentation state

The working tree now uses **active-only documentation**.

- Keep one active task only in `docs/codex/ACTIVE_TASK.md`.
- Do not retain completed or obsolete task documents in the working tree.
- Git history is the archive.
- Older task/phase documents are not part of the active planning surface. The current Local design prototype at `docs/design/desktop-20261018/**` is a protected working artifact and must not be deleted by cleanup.
- Owner Overview review is active: manager = 4 cards, employee = 3 cards; Today child cards fill the parent content height. Card hierarchy is English-first (12px) with smaller Thai labels (10px). Current UXUI PRO-B applies one coherent visual system across APPROVE / REQUESTS / LEAVE / OVERTIME: soft card-tone surfaces and borders, 3px top accents, left-icon halos, and equal top-right badge icons aligned within ~1px of the English heading line. APPROVE/REQUESTS use 2×2 color-coded mini metrics with accent strips and no mini-card icons to preserve readable space. LEAVE/OVERTIME header icon-to-title spacing is 9px, matching REQUESTS. The pre-B liked alternate is preserved at lnwjud checkpoint `607a04c0-8b4a-4470-8e67-c988b3de46d3`. Labels are APPROVE/งานอนุมัติ, REQUESTS, LEAVE, OVERTIME. Current QA preview uses local port 4187.

## Current implementation status

The current implementation line contains mature TEST-stage work across authentication/RBAC/audit, Leave, OT, Attendance, Time Correction, Medical, approvals, notifications, reports/Excel, HR settings, Web LIFF, and TEST release automation.

Local source must be reconciled against the current implementation baseline before promoting older Local code over the tested m67 line.

## Verified M67 intake — 2026-10-22

- Latest observed remote refs place `origin/main` at `f1ca9d2` and `origin/claude/project-thread-j4idbg` at `5a29241`.
- Local `main` is at `ce7c06d` (design work), ahead 1 / behind 22 relative to `origin/main`, with preserved dirty/untracked work. This authenticated TEST verification session made no commit or push.
- The two remote lines share `4e20dde`; the Owner's newer `ab7a106` advances only the protected Overview design files and does not change the Claude implementation baseline.
- Live TEST API health returned `serviceRevision=ckace-hr-api-test-m67` with `stage=test`.
- The Claude release-support sequence `4bf201b..b72f93f` changes only `infra/cloudbuild/test-release.yaml`; application code is unchanged from `2d6fff7` through that range. The exact Cloud Build trigger SHA remains unproven.
- Claude tip `5a29241` is a later Excel report numeric-hours correction and must be treated as newer than TESTm67 until separately verified and deployed.
- The working tree is not a checkout of the Claude baseline: no currently dirty file is byte-identical to the Claude tip, 30 tracked dirty files differ from it, and substantial Local-only/untracked work remains.
- Protected design work continues on its Owner-directed lineage. Current files must be preserved; do not assume the earlier intake file-match counts still apply after newer design commits.
- The remaining Local-only source group includes three desktop-auth files that add LINE sign-in plus an untracked LIFF/assets implementation. These are preserved but excluded from automatic integration because neither remote line proves their provenance.
- A clean isolated worktree was created at `C:\Users\MSI_01\.codex\worktrees\m67-reconcile\CKACE_HR` from Claude tip `5a29241`; the focused management-report workbook test passes (1 file / 5 tests).
- Claude tip broad verification is green: lint PASS, typecheck PASS, and full automated tests PASS (110 files / 821 tests). The isolated worktree remains source-clean.
- A first typecheck attempt was rejected as invalid evidence after proving the temporary shared `node_modules` junction resolved workspace packages from dirty Local `main`. The junction was removed; isolated `npm ci` and Prisma generation produced the passing result.
- Release-candidate build gates are also green: Prisma schema validation PASS using a non-secret Local dummy URL, full monorepo build PASS, and Next.js generated 31 static routes. The worktree stayed source-clean after generated outputs.

## Current authenticated TEST evidence — 2026-10-22

- Owner personally logged in and selected B. Latest clarification: TEST changes do not require automatic restoration. Record changes and test purpose; retain useful TEST settings/data unless restoration is needed for another check or explicitly requested. This does not authorize destructive actions, security-sensitive access expansion, deployment or Production changes. The changes in the preceding verification round were already restored; leave them as they are.
- Live health still reports `ckace-hr-api-test-m67`, `stage=test`, `NON_PRODUCTION`.
- Attendance report for October has seven rows and displays 34.3 hours. Downloaded Excel stores numeric decimal hours (including 8.17, 8.67 and 8.83), a numeric total of `34.269999999999996`, and numeric per-person totals. Both worksheets currently use General number format. Claude candidate `5a29241` adds two-decimal formatting, not a text-to-number conversion.
- OT meal threshold was changed 20:00 -> 20:30 -> 20:00. At an end time of 20:15, the hint changed from meal-eligible to below-threshold; at exactly 20:30, the changed policy was eligible. Original meal time 20:00, amount 50, enabled state and transport threshold 21:30 were restored/verified after reload. No OT request was submitted.
- Holiday description for 01/01/2569 was temporarily suffixed `[M67-R4 QA]`. The table refreshed immediately after save. Original description `วันขึ้นปีใหม่ (ตัวอย่างสำหรับ TEST)` was restored and verified after reload; date and active state stayed unchanged.
- Attendance-policy name was temporarily suffixed `[M67-R4 QA]`, saved and verified after reload, then restored to `สำนักงาน (ตัวอย่าง TEST)` and verified after reload. Radius remains 0.1 km; office coordinates and work/break times were unchanged.
- NEWTEST remains inactive, with no selected roles and SELF scope. These are observed baseline values, not changes made in this session.
- Four active approval policies are configured for Leave, Time Correction, OT and Medical, each displaying ADMIN (same team) then SUPERADMIN (all teams). These were read only.
- No blocker was reproduced in the exercised save/refresh/report paths. GPS clock actions, actual role/access changes, approval-chain changes and scoped announcement publishing were not tested and are not covered by this result.
- Workbook XML was inspected with bundled Python after artifact-tool import was unavailable in node_repl (`node:process` restricted). The downloaded workbook was not edited.
- Evidence screenshots are outside the repo in the conversation visualization directory: `m67-ot-restored.jpg`, `m67-holiday-restored.jpg`, `m67-attendance-restored.jpg`.
- Recommendation: batch the verified Excel formatting improvement into the next Owner-requested TEST build. First prove TEST API/Web image/traffic provenance and prepare a rollback plan using current m67, rather than assuming an older rollback revision.

## Git publication rule

- Local-first.
- Preserve uncertain Local work.
- Do not reset, clean, or stash merely to make Local look clean.
- Commit/push only after the Owner confirms at the end of the task.

## Active task

See `docs/codex/ACTIVE_TASK.md`.

## Immediate next action

Run M67-R5 TEST-only deployment provenance and next-release preparation. The authenticated session remains available. TEST build/deploy requires the Owner's explicit build request; commit/push still requires separate approval. Keep the original dirty Local work, protected Overview prototype and Production unchanged.

After the task finishes, update active continuity, replace the finished active task with the next task, summarize, then ask the Owner whether to commit and push.
