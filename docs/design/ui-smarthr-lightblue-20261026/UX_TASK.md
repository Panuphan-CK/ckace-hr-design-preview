# UI-SMARTHR-04 — Structural SmartHR Light Blue Desktop Rebuild

Updated: 2026-10-27 Asia/Bangkok

Status: PASS — scoped implementation and verification complete. The organization-wide leave list remains an API gap and is documented in `NEEDS_LOGIC_LATER.md`.

## Scope and boundaries

- Worktree: `D:\CKACE_HR.worktrees\ux-ui`
- Branch: `codex/ui-smarthr-lightblue`
- Base: `eeb609aed25f03a1f8e675597be2a7e876032d06`
- Application edits are limited to `apps/web/**`; design notes and synthetic screenshots are limited to this folder.
- No API, schema, migration, permission, validation, data-fetching, route, calculation, or business-rule edits. LIFF pages and Project A are untouched.
- No deploy or cloud/TEST/Production operations.

## Implemented

- Rebuilt the shared Desktop shell as a fixed grouped left sidebar plus a slim top bar with read-only search, app control, notification and profile controls. Responsive navigation is off-canvas on narrow screens.
- Applied the Owner-approved SmartHR A visual direction using the original screenshots for structure and the three approved HTML mock-ups as the authority for matching pages.
- Rebuilt the `/desktop` overview and `/desktop/leave` visual hierarchy with data already returned by existing APIs. Existing role visibility, routes, actions, validation and data remain in place.
- Applied the shared visual system to the leave request status/list, employee management, reports, attendance and other Desktop surfaces.
- Kept unsupported metrics and whole-company leave-list data hidden; see `NEEDS_LOGIC_LATER.md`.

## Visual evidence

- Five 1440px side-by-side composites are in `compare/`: admin overview, my leave, closest leave-list comparison (`/desktop/requests`), employee list, and attendance.
- Six 1440px application captures are in `compare/`: dashboard, my leave, request status, employee list, reports, and attendance.
- One 390px my-leave capture verifies the responsive layout and menu open/close control.
- All application captures use synthetic API responses; no TEST account or real employee data was captured. See `compare/README.md` for mappings and limitations.

## Verification

- ESLint (`eslint apps/web/src --max-warnings=0`, repository toolchain) — PASS, zero warnings.
- `npm run typecheck --workspace=@ckace/hr-web` — PASS.
- `vitest run apps/web` — PASS, 22 files / 103 tests.
- Playwright desktop captures at 1440px: dashboard, leave, request status, employee list, reports, and attendance all rendered with `scrollWidth = 1440`; no page or console errors.
- Playwright responsive capture at 390px: leave page and document width remained 390px; menu open and close both passed.
- `git diff --check` — PASS.

## Changed areas

- Desktop shell, dashboard, leave page, icon set, and shared SmartHR stylesheet.
- Design specification, hidden-data inventory, task record, and visual evidence documentation.

No API or business-logic files were changed. The change is not deployed.
