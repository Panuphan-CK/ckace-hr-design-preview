# SmartHR Light Blue — Desktop design specification

Updated: 2026-10-27 Asia/Bangkok

## Visual direction

Use the seven screenshots in `smarthr-original/` to understand the SmartHR page structure. For the three pages that have approved mock-ups, `reference/` is the visual source of truth at 1440px and takes precedence over the original screenshots. Apply the Owner-selected A direction: SmartHR structure recoloured light blue, with primary `#1F6FD1`, tint `#EAF4FF`, navy `#174A7C`, clean white cards, progress bars on balance cards, 14px corners, coloured headings, and Archivo + Noto Sans Thai. Do not copy code from a paid ThemeForest template or place the original screenshots in the app. Preserve the separate `docs/design/desktop-20261018/**` work exactly.

Reference files: `smarthr-original/` (structure), `reference/admin-overview.html`, `reference/my-leave.html`, and `reference/leave-list.html` (approved visual layouts).

## Current `/desktop` overview direction — 2026-10-27

The Owner requested targeted updates to the Desktop overview: keep the SmartHR shell, use the CKACE design preview for KPI cards and the monthly calendar, and put the dashboard title in the framed heading. Remove the HERO. Retain existing routes, capability gates, API data, and truthful empty states; the Owner approved fetching the selected month using the existing calendar API; do not add sample values, quick links, or attendance actions. Hide unavailable organization-wide metrics listed in `NEEDS_LOGIC_LATER.md` in the real application. Owner approved synthetic values explicitly marked “* ข้อมูลตัวอย่าง” for local layout review, and requested the original Claude KPI colors. Synthetic values are not permitted in the real application. The scope of this iteration is the Desktop presentation of the overview.

## Tokens

- Primary: `#1F6FD1`; hover: `#1859A8`; tint: `#EAF4FF`; page background: light blue throughout.
- Title: `#174A7C`; body: `#111827`; muted text: `#6B7280`; border: `#D9E9F8`.
- Cards: white, 14px radius, thin blue border and soft blue shadow. Controls: 10px radius. Section titles have a coloured dot; tables use a pale-blue header; status uses labelled dots.
- Approved uses green, pending uses blue, rejected uses red, and sent-back uses blue. Avoid orange and grey page backgrounds. Use accessible darker text variants where needed.
- Keep Thai text, Buddhist dates and 24-hour times. Hide internal IDs from employee-facing views.

## Shared shell and components

- Desktop uses the existing role-filtered navigation in a white left sidebar with blue unboxed icons, dark text, a pale-blue selected item and a collapse control. Collapsed group icons open their permitted destinations in a flyout aligned to the selected icon.
- At tablet/mobile widths the same role-filtered menu becomes an off-canvas sidebar opened from the top bar. Keep the existing links and route access; add no destination or permission.
- On Desktop, move the existing application, notification and profile controls to the bottom of the sidebar and remove the top bar. Retain the mobile top bar and existing control behavior; do not add search behavior.
- Reuse existing data, API calls, validation, permissions, routes, calculations and settings rules. Do not invent data or endpoints. Where existing data is unavailable, retain truthful empty/error states.

## Page order

1. Existing `/desktop` overview: keep one role-aware page with a consistent layout for head roles and employee-appropriate content for USER; use the approved SmartHR overview reference, show only capability-gated API data, omit quick links and attendance actions, and retain the truthful empty/error states.
2. `/desktop/leave`: match the approved balance-card, request-history, calendar, approver, and form arrangement using existing data.
3. `/desktop/requests`: match the approved leave-list structure where the available page data permits; do not fabricate organization-wide leave rows.
4. Apply the shared system to employee/organization tables, reports, attendance, approvals, settings, OT, medical, time correction, profile, inbox, announcements, notifications, calendar, benefits, delegation, onboarding, login, registration and password reset.

## Verification and boundaries

Run only `apps/web` lint, typecheck and tests. Check Desktop at 1440px and 390px, confirm document width does not exceed viewport, and capture synthetic-data comparison screenshots for the Owner. LIFF, API, schema, migrations, roles, data fetching and business logic remain untouched. Do not deploy; the PM handles the TEST build.

Worktree: `D:\CKACE_HR.worktrees\ux-ui`
Branch: `codex/ui-smarthr-lightblue`
Base: `eeb609aed25f03a1f8e675597be2a7e876032d06`
