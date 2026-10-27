# SmartHR Light Blue — Desktop design specification

Updated: 2026-10-27 Asia/Bangkok

## Visual direction

Use the Owner-selected SmartHR HRM Figma community kit as a visual reference, recoloured light blue. Do not copy code from the paid ThemeForest template. Preserve the separate `docs/design/desktop-20261018/**` work exactly.

Reference: https://www.figma.com/proto/B6jLuCqhxxuBGpBlUXrhbT/SmartHR---Free-Figma-UI-Kit-for-HRM---Employee-Management--Community-?node-id=1805-240056&p=f&t=P71wH8WPDsZgL5N7-1&scaling=scale-down&content-scaling=fixed&page-id=273%3A57897

## Tokens

- Primary: `#1F6FD1`; hover: `#1859A8`; tint: `#EAF4FF`; page background: light blue throughout.
- Title: `#174A7C`; body: `#111827`; muted text: `#6B7280`; border: `#D9E9F8`.
- Cards: white, 14px radius, thin blue border and soft blue shadow. Controls: 10px radius. Section titles have a coloured dot; tables use a pale-blue header; status uses labelled dots.
- Approved uses green, pending uses blue, rejected uses red, and sent-back uses blue. Avoid orange and grey page backgrounds. Use accessible darker text variants where needed.
- Keep Thai text, Buddhist dates and 24-hour times. Hide internal IDs from employee-facing views.

## Shared shell and components

- Desktop uses the existing role-filtered navigation and existing menu-group controls. Present it as a light-blue left sidebar with icon tiles and a dark-blue selected item.
- At tablet/mobile widths the same menu groups become a horizontally scrollable bar below the top bar. Keep the existing links and expansion behavior; add no new navigation actions.
- Keep the existing top-bar application, notification and profile controls. Do not add search, full-screen or message actions as part of this visual-only task.
- Reuse existing data, API calls, validation, permissions, routes, calculations and settings rules. Do not invent data or endpoints. Where existing data is unavailable, retain truthful empty/error states.

## Page order

1. Existing `/desktop` overview: style existing greeting, capability-gated stats and quick actions as SmartHR cards; preserve its current data and visibility rules.
2. `/desktop/leave`: show existing leave balances, history, calendar/approver context and submission form in the SmartHR layout.
3. `/desktop/approvals#leave`: style the existing assigned approval queue and history. Keep the existing approver scope and filters.
4. `/desktop/requests`: style the existing request summary and filters.
5. Apply the shared system to all remaining Desktop routes: settings, employees/organization, OT, medical, attendance, time correction, reports, profile, inbox, announcements, notifications, calendar, benefits, delegation, onboarding, login, registration and password reset.

## Verification and boundaries

Run only `apps/web` lint, typecheck and tests. Check Desktop at default width and 390px, confirm document width does not exceed viewport, and capture screenshots for the Owner. LIFF, API, schema, migrations, roles, data fetching and business logic remain untouched. Do not deploy any environment other than the specifically approved `ckace-hr-web-ux-preview` service.

Worktree: `D:\CKACE_HR.worktrees\ux-ui`
Branch: `codex/ui-smarthr-lightblue`
Base: `bd96ac0c910a8cab2e9ab013aeb8bc7819b1df5b`
