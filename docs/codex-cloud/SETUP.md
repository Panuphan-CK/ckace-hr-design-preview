# Codex Cloud Setup — CK Leave Desktop

Repository: Panuphan-CK/ckace-hr-design-preview

Configure the Codex Cloud environment setup command as:

```bash
bash scripts/bootstrap-codex-cloud.sh
```

This installs UI UX Pro Max v2.15.0 into the task environment under .agents/skills without changing prototype source files.

The repository already contains CK Leave project rules, the locked design-system baseline, the Vercel audit skill, and selected Superpowers workflows.

Useful preview:
```bash
python3 -m http.server 4173
```

Recommended task prompt:
```text
Work on CK Leave Desktop.
Follow AGENTS.md.
Use $using-superpowers and $ck-leave-desktop-design.
Use $ui-ux-pro-max for focused design evidence.
Preserve the locked CK Leave design system unless I explicitly approve a global redesign.
Before completion run $web-design-guidelines on changed UI files and $verification-before-completion.
Task: <describe the change>
```
