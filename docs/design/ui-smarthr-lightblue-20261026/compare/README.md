# Visual comparison evidence

Captured for UI-SMARTHR-04 on 2026-10-27. Each side-by-side composite uses a 1440px-wide reference pane and a 1440px-wide application pane. The application was rendered locally with synthetic API responses; no TEST account or real employee data was used.

## Approved HTML mock-ups

- `compare-admin.png`: `reference-admin.png` beside the local `/desktop` overview.
- `compare-my-leave.png`: `reference-my-leave.png` beside local `/desktop/leave`.
- `compare-leave-list.png`: `reference-leave-list.png` beside the local `/desktop/requests` status page. The current page lists requests for the signed-in employee, not an organization-wide leave list. This is a data/API gap, not a visual substitute; see `../NEEDS_LOGIC_LATER.md`.

## SmartHR original-screen structure comparisons

- `compare-employees.png`: SmartHR original employee grid (`smarthr-original/06-employee-grid.png`) beside the local employee management table.
- `compare-attendance.png`: SmartHR original employee attendance (`smarthr-original/05-attendance-employee-view.png`) beside the local attendance page.

The seven originals are reference-only. None of these source images is bundled in the application.

## Application captures

- 1440px pages: `dashboard.png`, `my-leave.png`, `request-status.png`, `employee-list.png`, `reports.png`, and `attendance.png`.
- Responsive capture: `my-leave-390.png` at 390px; it includes the open navigation drawer and full leave page. The drawer close control was exercised and the document remained 390px wide.
- `reference-admin.png`, `reference-my-leave.png`, and `reference-leave-list.png` are the rendered approved HTML mock-ups used in the composites.

There is intentionally no 1:1 approved reference for reports. Its application capture is included separately; no mock-up numbers or employee records were copied into it.
