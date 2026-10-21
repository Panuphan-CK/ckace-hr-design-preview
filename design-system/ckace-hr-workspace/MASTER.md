# CKACE HR People Operations Command Center

Revision 2026-10-21. This is the active TASK-39.9 Desktop review design system. It uses one focused People Operations system with persistent top tabs. The current Owner-confirmed operational TEST baseline is TESTm67, but this design system may be newer than TESTm67 and is not deployment evidence. FlowAccount remains a usability reference only; CKACE owns the visual language.

## Direction

- Pattern: one People Operations system with a persistent top tab bar and a dashboard-first command center.
- Style: premium midnight header, indigo/cyan gradient hero, light-blue dashboard canvas, tinted gradient cards, energetic status colors, short labels, and expressive metric cards.
- Entry point: users land on the Team Pulse dashboard. They do not choose an app before starting work.
- Top tabs: ภาพรวม, ลา, OT, ลงเวลา, ค่ารักษา, งานอนุมัติ, รายงาน, ตั้งค่าระบบ. Time correction is part of the ลงเวลา workspace.
- People Operations detail: Leave, OT, attendance plus time correction, medical reimbursement, approvals, reports, and one shared settings hub.
- Density: a compact desktop command center with metric/live insight cards, two-column work panels, a full-width team calendar, and responsive one-column mobile flows.
- Orb language: six circular satellite nodes drift slowly around the Team Pulse core like a galaxy cluster. They cover the five KPI signals (people, ready, leave, approvals, attendance) plus OT, with distinct accents, readable numbers, and a reduced-motion fallback.
- Motion: use calm Galaxy motion with reduced-motion fallback. The current Desktop review supports a Hero layout editor for positioning the metric ovals; saved editor positions are review tooling, not production business state.
- Readability: Thai labels should use a larger scale than the English eyebrow labels. The hero metadata lives in orbital nodes, the five KPI cards include people on leave and attendance completion, and the calendar summary names people who are on leave. Hero date/time uses a full Thai month name and a live seconds clock. Dashboard card surfaces use lighter gradients so text stays readable across the page.
- Content voice: short, action-first Thai copy. Lead with today’s state, show the next decision, and keep helper text to one line. Avoid explanatory dashboard blocks and duplicate routes.

## Visual tokens

- Canvas: #edf1f7
- Midnight chrome: #101a39 → #1d2a5a
- Primary indigo: #4b63e8
- Accent cyan: #91f1e2
- Teal: #0b9d9a
- Amber: #dc921b
- Purple: #8968ef
- Green: #229a61
- Text: #14213d
- Border: #e2e7f0
- Card radius: 14–16px
- Shadow: soft white-card elevation; stronger shadow on hover

## Interaction

- Dashboard opens with an expressive command deck: Welcome Hero, five KPI cards, Team Status, Activity, Workload/OT chart, attendance status, medical benefit usage, and a full team calendar with a daily summary. The hero, animated Team Pulse orb, and dark stat rail keep the richer visual tone. Quick-action groups and a “เลือกงานที่ต้องทำ” section are intentionally removed.
- Attendance overview uses four explicit states: ปกติ, มาสาย, ลงเวลาออกก่อน, and ไม่ลงเวลา. Medical benefit overview shows the 10,000-baht annual allowance, current use, remaining balance, and the 1,000-baht per-claim ceiling.
- The compact Hero frame carries a low-frequency twinkling star field, keeps the live date/time near the top edge, and reduced-motion mode removes the sparkle and satellite movement.
- Every Overview frame carries a denser galaxy sparkle layer with short flash pulses. The team calendar and company-announcement frame use softer blue/teal command-deck surfaces with larger, higher-contrast Thai text for visual continuity and readability.
- Every module is reachable from a top tab and the core Leave, OT, attendance/time correction, and Medical workspaces complete the workflow on one page.
- Overview pages use an animated module emblem, metric cards, an inline request form, and recent activity without routing the user to another page.
- Forms stay in the same system shell with a compact summary panel and one primary submit action.
- Approval cards put decision actions in the card footer; no nested window is needed for routine work.
- Reports use a visual score, trend cards, and export action.
- Settings has one center page with five module policy cards plus shared approval/notification rows.
- Details use one dialog only. Writes remain server-authoritative in the eventual application.

## Accessibility and responsive checks

- Contrast target 4.5:1 for normal text and 3:1 for large text or controls.
- Every icon-only control has an accessible label and visible focus ring.
- Interactive targets are at least 44px high, with 8px spacing where controls are adjacent.
- Breakpoints: 560, 840, 1160px; validate at 375, 768, 1024, and 1440px.
- Respect prefers-reduced-motion and avoid horizontal page scroll.
- Status uses text plus a pill or icon; color is never the only signal.

## FlowAccount reference mapping

- FlowAccount top-level workspace navigation → CKACE top tabs for the single People Operations system.
- FlowAccount task cards → CKACE live insight cards and activity feed with status visible immediately.
- FlowAccount settings surfaces → CKACE single settings hub for all People Operations policy controls.

