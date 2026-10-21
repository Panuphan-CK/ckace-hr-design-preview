# CK Leave Desktop — Master Design System

**Status: LOCKED BASELINE**  
Global changes require explicit owner approval.

The existing prototype is the accepted direction. External skills validate and improve it; they do not replace it automatically.

## Product
Thai-first People Operations Command Center: Dashboard, Leave, OT, Attendance, Medical, Approvals, Reports, Settings. Keep one desktop workspace with top-level tabs.

## Visual direction
- pale sky/light work canvas
- navy command/navigation surfaces
- white/translucent data cards
- blue / teal / purple operational accents
- restrained galaxy / aurora / orbital motion
- desktop-dense but readable hierarchy
- work clarity over decoration

## Core tokens
Source: style.css :root

```css
--ink:#14213d; --ink-soft:#31405d; --muted:#74819a;
--canvas:#edf1f7; --surface:#ffffff; --surface-soft:#f7f9fc;
--line:#e2e7f0; --line-strong:#cfd7e6;
--navy:#101a39; --navy-2:#1d2a5a;
--blue:#4b63e8; --teal:#0b9d9a; --amber:#dc921b;
--purple:#8968ef; --green:#229a61; --red:#d45860;
--rose:#dc5d89; --indigo:#6974ec; --slate:#607089;
--shadow:0 12px 32px rgba(30,45,84,.08);
--shadow-lg:0 24px 60px rgba(19,31,71,.18);
--radius:16px;
```

Do not replace this palette wholesale without approval.

## Typography
Noto Sans Thai = body/UI. Prompt = headings/brand/display. Mitr only where existing or explicitly approved.
Thai readability wins over stylistic compression.

## Navigation
Sticky navy top bar, top-level modules, active state not color-only, smaller widths may scroll rather than hide modules.

## Components
Keep consistent KPI cards, panels, chips, forms, tables/lists, dialogs, approval actions, charts, and empty/loading/error/permission states. Status must pair color with text/icon.

## Motion
Brand accent only. Honor prefers-reduced-motion, prefer transform/opacity, keep interactions interruptible, and never make essential understanding depend on motion.

## Accessibility
Semantic controls, visible focus, labels/accessibility names, skip link, keyboard-operable actions/dialogs, sufficient contrast, no color-only meaning, sticky/fixed UI must not cover focused controls.

## QA
1024, 1366×768, 1440×900, 1920×1080; safe degradation to 320px.

Hierarchy: MASTER.md > explicit page override > existing implementation details.
