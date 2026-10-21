# CKACE HR — ACTIVE TASK

Updated: 2026-10-21

## UI-OVERVIEW-REVIEW — Owner Overview visual review

Status: **IN REVIEW**
Priority: **P1 — current explicit Owner direction**

Objective:
Keep the Local `docs/design/desktop-20261018` Overview prototype stable for Owner visual review and iterate only on requested Overview design changes. Do not change TEST/Production behavior.

Current accepted structure:
- Manager/approver: **4 cards** in one desktop row — Pending Approvals, My Requests, Latest Activity, Latest Activity.
- Employee: **3 cards** in one desktop row — My Requests, Latest Activity, Latest Activity.
- My Requests is one aggregate card with four module mini-stats.
- TODAY WORK & ACTIVITY child cards fill the available parent-board content height on desktop.
- Desktop review typography is enlarged: English heading 9px, Thai heading 13px, mini-stat number 24px, detail text 11px.
- Owner-locked Hero layout remains unchanged.

Verification:
- Manager cards: 4 × 197px, all in one row.
- Employee cards: 3 × 197px, all in one row.
- Child-card height equals Today grid height.
- No horizontal overflow.
- Hero remains 10/10 layout nodes and 10/10 drag handles.
- `node --check docs/design/desktop-20261018/prototype.js` PASS.
- relevant `git diff --check` PASS.

Guard:
- `docs/design/desktop-20261018/**` is protected active review material; do not delete, cleanup, replace, or rebase it during Owner review.
- Do not Commit / Push until the Owner explicitly says `commit`.
- TEST/Production remain untouched.

Next:
Wait for the Owner's next visual feedback. After Owner accepts the Overview review cycle, resume M67 reconciliation unless superseded by newer Owner direction.
