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

## Controller model
For non-trivial work, use **one Controller/Orchestrator** as the single coordinator.

The Controller:
- owns scope, plan, task decomposition, file ownership, integration order, review, and final readiness
- should not make production UI edits itself unless the owner explicitly asks for single-agent execution
- may delegate to up to **3 Workers** in parallel when scopes are independent
- must prevent two Workers from editing the same files at the same time
- must review every Worker result against this AGENTS.md and the locked design system
- is the only agent allowed to declare a task ready for owner approval

Workers:
- receive a bounded objective, allowed files, forbidden files, acceptance checks, and required evidence
- do not broaden scope
- do not merge or declare final completion
- return changed files, verification evidence, unresolved risks, and recommendations to the Controller

Preferred team:
1. Controller — planning/integration/acceptance
2. Design & UX Worker — audit/design delta/UUPM evidence
3. Implementation Worker — bounded UI implementation
4. QA Worker — Vercel audit/accessibility/responsive/regression

For small tasks, the Controller may use only one Worker. Do not create parallelism merely to use more agents.

## Required workflow
For non-trivial UI/UX work:
- use $ck-leave-controller first
- use $using-superpowers when available
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
