---
name: web-design-guidelines
description: Review CK Leave UI code for Vercel Web Interface Guidelines compliance. Use for UI review, accessibility audit, interaction audit, responsive UX review, and pre-delivery QA.
metadata:
  upstream: vercel-labs/agent-skills
  upstream_revision: "063bee94c3f4df8453406c830b0a7df0f2860278"
---

# Web Interface Guidelines

Before each review, fetch the latest rules from:
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

If network access is unavailable, use references/command-snapshot.md.

Procedure:
1. Read AGENTS.md and relevant CK Leave design-system files.
2. Read every requested UI file.
3. Apply all applicable upstream rules.
4. Report terse findings grouped by file using file:line.
5. Mark a reviewed file ✓ pass when no issue remains.

CK Leave additions: flag Thai text clipping, focus hidden by sticky/fixed UI, missing reduced-motion handling, color-only status, failures at 1024/1366/1440/1920 widths, and unapproved drift from MASTER.md.
