# UI-SMARTHR-04 — Desktop overview reconstruction

Status: PARTIAL — Owner requested a local-only full-card layout based on the CKACE preview, with unavailable data labelled explicitly, and then requested the original Claude KPI colors. Owner review is pending.

## Active scope

- Rebuild the Desktop overview at 1440px. Use the SmartHR shell plus the Owner-specified CKACE preview for KPI cards and calendar. Remove the HERO; keep one role-aware overview, without quick links or check-in/out buttons.
- Use only data and role visibility already supplied by the app. Unsupported organization-wide metrics remain hidden in the application. Owner approved synthetic values with “* ข้อมูลตัวอย่าง” only in the local synthetic preview; see `NEEDS_LOGIC_LATER.md` and `TEXT_MATCH.md`.
- Owner explicitly approved fetching the selected calendar month from the existing calendar API. Preserve routes, permission gates, validation and business calculations. Do not touch LIFF, Project A, other worktrees or deploy.
- Worktree `D:\CKACE_HR.worktrees\ux-ui`; branch `codex/ui-smarthr-lightblue`.

## Verification and review

- Web lint and typecheck passed; web Vitest passed (22 files, 103 tests). Chrome synthetic employee and manager views at 1440px showed no horizontal document overflow or HERO. On the synthetic API, clicking next month changed ตุลาคม 2569 to พฤศจิกายน 2569 and requested 2026-11-01 through 2026-11-30.
- Compared with the 1440px reference. Exact content/card parity is not achieved: the reference includes a welcome HERO and organization-wide metrics that are excluded by current Owner direction and available API data.
- The temporary local preview fixture routes are untracked and must be removed before publication.
- Earlier screenshots represent rejected designs and are not acceptance evidence for this iteration.
- Owner visual acceptance remains pending.

## Local-only card layout review

- Owner selected all reference cards for local review using explicit “ยังไม่มีข้อมูล” placeholders when data is unavailable. KPI cards use the previous Claude colors.
- The experimental dashboard-local-preview component and the synthetic-preview conditional are local review scaffolding. Remove them, the related preview-only CSS, and temporary API/role routes before any commit or publication unless the Owner separately chooses a real implementation.
- Web lint and typecheck passed; web Vitest passed (22 files / 103 tests). Chrome at 1440px showed five preview summary cards and four preview boards; normal `/desktop` without the preview query showed zero preview layouts. Final colors were visually inspected with synthetic data.

- Owner corrected the KPI color treatment: Claude reference KPI tiles use white backgrounds with colored icons and subtle colored corner accents; group panels retain tinted backgrounds. The prior all-tinted KPI treatment was replaced and verified visually in the local 1440px preview.

## Owner review: dashboard heading, sample filters and eight boards

- Dashboard heading is bold blue on a pastel background; breadcrumb removed. Local synthetic preview shows the current Gregorian year as a sample filter control.
- Owner selected a Local-only filter mock: employee, department, division, year, month and start/end date fields are visible, but do not filter data.
- The Local-only preview contains TEAM STATUS, LEAVE STATISTICS, REQUESTS, ACTIVITY, OT SUMMARY, ATTENDANCE / TODAY, MEDICAL / BENEFIT, and COMPANY UPDATE. Unavailable data is labelled.
- Desktop browser check confirmed all eight captions, 2026, all seven field labels (date range has two fields), and filter open/close. Web lint and typecheck passed; 22 web test files / 103 tests passed.
- Preview component, filter and synthetic API routes remain temporary review scaffolding and must be removed before publication unless a real implementation is separately approved.

## Owner review: bilingual cards and calendar

- Owner requested English above Thai, marked synthetic data on unavailable cards, removal of the large personal-statistics wrapper, five small cards followed by five KPI cards, and a single activity and company update.
- Local-only synthetic cards now use sample values with visible labels. Company update is full width after the calendar; the calendar is white with date-grouped synthetic leave entries and an agenda. The existing weekly team card remains separately visible.
- Browser verification at 1440px: five small cards and five KPI cards all carried sample labels; one company update matched calendar width (1157px); duplicate prior requests and news panels were absent; next month requested 2026-11-01 through 2026-11-30. Employee and manager views had no horizontal document overflow.
- Latest web lint and typecheck passed; 22 web test files and 103 tests passed. The owner must review the new appearance.
- Synthetic preview components, conditionals, sample fixtures and their preview-only styles remain temporary and must not be published without a separate decision on real data and permissions.

## Owner review: Desktop sidebar

- Owner requested a white sidebar, blue icons without tiles, dark text, collapse control, bottom notification/apps/profile controls, no Desktop top bar, and a collapsed group flyout aligned to its icon. Mobile top bar is retained.
- Local synthetic browser: expanded sidebar 280px, collapsed 66px, Desktop top bar hidden, 3 footer controls. Employee flyout top matched its trigger at 152px and listed all 5 permitted links; Escape closed it and profile opened to the right. Manager collapsed groups preserved all expanded destinations: requests 5, approvals 4, reports 5.
- Web lint and typecheck passed; 22 web test files / 103 tests passed. Owner visual review remains pending. Synthetic preview scaffolding remains excluded from publication.

## Owner review: compact cards and requests

- The seven requested overview boards use a compact three-column Desktop grid; ACTIVITY spans two columns and TEAM STATUS / LEAVE STATISTICS include synthetic progress bars. The existing งานและคำขอของฉัน card is visible again and labelled as synthetic in the Local preview.
- Desktop synthetic browser: five KPI tiles, seven boards, one restored requests panel, one company update, no horizontal document overflow; calendar next-month API range verified. Web lint/typecheck and 103 tests passed.
- Owner clarified that TEAM LEAVE and งานและคำขอของฉัน must move up. They now appear side by side immediately after the KPI tiles and before the compact boards and calendar. Local synthetic preview remains temporary review scaffolding.

- After moving both cards, web lint and typecheck passed, web Vitest passed (22 files / 103 tests), and synthetic employee and manager Desktop renders at 1440px showed no horizontal overflow. Owner visual review is pending.

## Owner review: typography, sidebar and card palette

- Owner asked to adapt the local Desktop preview in three areas only: typography, sidebar and card colors.
- The design-only `owner-dashboard-preview.html` now uses Prompt with Noto Sans Thai fallback; its white sidebar uses blue icons and dark labels, and its KPI/status cards use distinct soft blue, green, orange, violet and rose fills. The app at `localhost:3001` is not the target of this adjustment.
- Reviewed the owner design preview in Chrome at 1440px. No routes, permissions, data logic or page structure were changed. No tests were run for this visual-only change.

## Current Owner review — fresh dashboard concept

- Rebuilt owner-dashboard-preview.html as a new standalone employee workspace concept at port 4186, superseding its previous visual design.
- White surfaces, blue primary action, Inter/Noto Sans Thai typography, four summary metrics, action-required panel, request table, leave balances, attendance and upcoming events.
- All content is synthetic and labelled. Navigation anchors, sidebar toggle and informational dialogs are prototype interactions only. Application source at port 3001 was not edited for this redesign.
- Browser desktop rendering inspected. Owner review is the next step; no deploy or publication performed.

## Current visual direction — expressive workspace

- Owner rejected the neutral concept. Reworked the preview into an asymmetric composition: large cobalt feature area, adjacent 2-by-2 metrics, weekly date strip, dark navigation, lime accents, lilac and peach surfaces.
- Desktop rendering visually checked at the local 4186 preview. All figures remain synthetic. Owner visual approval is pending; localhost:3001 application source is untouched.

## Current Owner review — white and pastel HR dashboard

- Applied the eight requested adjustments to the 4186 preview: white canvas, light-blue decorative sidebar, content expansion on collapse, framed tinted section headings, larger typography and five compact HR KPI cards.
- Desktop expanded and collapsed views inspected. Sidebar reduces from 246px to 76px and the main content fills the released space; main width is no longer capped. Collapsed links retain accessible labels.
- Owner visual approval remains pending. Only design-preview HTML and this design task note were edited in this round; existing application changes in the worktree were preserved.

## Owner request — leave system settings preview

- Added a separate settings view in the 4186 standalone preview with nine categories: leave cycle, workdays, work/OT hours and employee choices, annual holidays, leave types and tenure-based entitlement, employees, departments, four request approval types, and role/scope access.
- Values are marked as sample; section navigation, weekday choices, leave carry/forfeit choice, approval-type tabs, and prototype save feedback are local preview interactions only.
- Application source, routes, permissions, API calls, data, TEST and Production were not changed. Owner visual review is pending.- Work-hour fields display 24-hour `HH:mm` values, and employee lunch options include selectable 30/45/60-minute durations plus a no-lunch choice.


## Current task — GAS Desktop parity

- Owner supplied app-leave-GAS as the read-only UI reference and requested all Desktop pages except Login.
- Began the Local shell styling using GAS background, blue, sidebar spacing and radius. Existing UX work remains in place.
- Web typecheck passed. Visual check at 1440px revealed the Dashboard hero/spacing still needs structural work; GAS parity is not yet complete. No TEST or Production deployment was made.

- GAS overview first section: changed the title to สรุปการใช้วันลา and displayed the three leave-type cards before other content. This is partial UI work only; the existing Dashboard contains hard-coded fallback values that must be removed or replaced with real data before release.
- Web typecheck and git diff --check pass. Browser connection was unavailable after the latest edit, so rendered verification of that edit is still pending.

- Rebuilt the GAS leave-summary cards structurally: icon and used value above the leave name, quota and progress. In development syntheticPreview only, labelled sample entitlements are supplied when the API is unavailable; normal runtime uses returned entitlements or an unavailable state. The Local rendered cards were inspected. Remaining Dashboard content and other Desktop pages are not yet GAS parity.
- Web typecheck passes. Web lint could not run because eslint is not installed in this worktree.

- Owner requested larger leave progress bars with the percentage inside. The Local preview shows the labels centered within 26px bars; web typecheck passed. Remaining GAS parity work is still active.

- Progress labels are italic white with a dark text shadow for readability on the unfilled track. Verified in Local preview; GAS parity work remains active.

- Progress bars now show only the percentage in a colored label, per Owner request; Local rendering and web typecheck passed. For small values the label has a minimum width for legibility.

- Owner requested the percentage aligned to the right edge of the colored progress portion; Local preview and web typecheck passed. Small values retain a readable 40px label.

## Owner review — uniform Desktop overview cards

- Applied one visual system across the Overview leave entitlement, OT, medical, request-status, recent-request, weekly-calendar and company-announcement cards: white rounded panels, thin borders, soft blue shadows, pastel accent bars/icon tiles and consistent framed headings.
- OT and medical progress bars now match the leave cards: larger tracks with a bold italic white percentage badge positioned at the filled portion's right edge. Medical no longer repeats the used percentage below the bar.
- Kept all existing navigation destinations, API data bindings and permissions unchanged. Scope is the Overview only; other Desktop pages still need their own GAS parity work.
- Verification: Web typecheck passed. Targeted diff check for page.tsx and smarthr.css passed. The full worktree check reports existing trailing whitespace in desktop-shell.tsx and the two design-preview HTML files; those were left untouched. No test suite was run.
- Responsive card behavior: KPI cards move to two columns at tablet width and one column on narrow screens; request/agenda panels stack without changing route behavior.
## Owner review — Overview shortcuts removed

- Removed all nine card/header/row links from the Dashboard, including leave details, OT/medical actions, request shortcuts, calendar/news links and request-row arrows.
- Kept the existing Sidebar destinations and role-based menu visibility unchanged.
- Verification: web typecheck passed; the Local synthetic Overview accessibility tree now contains no content links (navigation links remain in the Sidebar). No test suite was run.