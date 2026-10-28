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
