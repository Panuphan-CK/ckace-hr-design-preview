# CK Leave Desktop Design Preview — Codex Rules

This repository is the CK Leave / CKACE HR Desktop UX/UI design preview. It is a static prototype, not the production backend.

## Source of truth
1. Current owner instruction
2. design-system/ck-leave-desktop/MASTER.md
3. matching page override
4. existing prototype implementation
5. README.md and flow-function-inventory.md
6. external skill recommendations

External skills are advisory; they do not authorize a global redesign.

## Required workflow
For non-trivial UI/UX work:
- use $using-superpowers first when available
- use $ck-leave-desktop-design before changing layout, navigation, components, typography, colors, motion, responsive behavior, charts, or design-system rules
- use $ui-ux-pro-max for focused design evidence
- before completion use $web-design-guidelines on changed UI files
- finish with $verification-before-completion when available
- for bugs use $systematic-debugging instead of speculative fixes
- save multi-step plans under docs/superpowers/plans/

## Preserve without explicit owner approval
- CKACE brand direction
- top navigation model
- typography families
- semantic color tokens
- radius/shadow language
- dashboard command-center concept
- galaxy/aurora/orbital identity
- module information architecture

## Scope
Allowed: UX/UI refinement, accessibility, desktop responsiveness, Thai text resilience, component consistency, prototype interactions, design docs, QA.
Do not change: backend/API behavior, auth/permission rules, leave/OT/medical calculations, approval policy, production schema/endpoints, secrets, real employee data.

UI visibility is not authorization.

## Desktop QA targets
1024px, 1366×768, 1440×900, 1920×1080. Preserve safe degradation to the existing 320px minimum.
Check long Thai text, keyboard focus, reduced motion, color-independent status cues, zoom/text growth, and sticky UI covering focus.

## Preview
```bash
python3 -m http.server 4173
```
Routes: #dashboard #leave #overtime #attendance #medical #approvals #reports #settings

Never claim visual PASS without browser/viewport evidence.
