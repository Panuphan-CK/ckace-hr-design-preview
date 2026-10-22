# CKACE HR · People Operations Command Center

Status: **Protected current Local review prototype**
Updated: 2026-10-21
Operational TEST baseline: **TESTm67 (Owner-confirmed)**

This directory is the current standalone Desktop review prototype. It is prototype-only and does not define production authorization, business rules, API behavior, or deployed TEST state.

## Current direction

One People Operations system with persistent top tabs:

- ภาพรวม
- ลา
- OT
- ลงเวลา
- ค่ารักษา
- งานอนุมัติ
- รายงาน
- ตั้งค่าระบบ

Time Correction belongs to the Attendance workspace.

## Visual direction

Current rendered direction is the **Galaxy / People Operations Command Center**:

- compact Dashboard Hero;
- live Thai date/time;
- centered core/readiness metric;
- readable pastel metric ovals;
- shared elliptical Galaxy tracks;
- light blue/white canvas and dark navy chrome;
- teal/purple/amber/green accents;
- Thai-first hierarchy and short action-first copy;
- responsive and reduced-motion behavior.

Older cloud, Aurora Glass Garden, editorial neo-brutalist and parity-driven directions are historical experiments where they conflict with the current rendered prototype.

## Overview Hero layout editor

Desktop review supports named metric selection, dragging, keyboard fine movement, visible drag handles, browser-local save, and reset to the CSS layout.

The editor is review tooling only.

## Files

- `index.html` — static review shell
- `style.css` — current prototype visual system
- `prototype.js` — fictional/in-memory route/content/interactions
- `hero-layout-editor.js` — Desktop Hero layout review tooling
- `flow-function-inventory.md` — usability/function reference inventory

## TESTm67 relationship

TESTm67 is the current deployed TEST baseline according to the Owner. This prototype may be newer than TESTm67 and must not be assumed to be deployed.

For current authority use the repository root continuity plus `docs/CURRENT_STATE_TESTM67_20261021.md`.
