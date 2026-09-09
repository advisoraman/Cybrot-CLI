# Cybrot Gate — Claude Code / Copilot agent skills

StackHawk ships “Wingman” agent skills; this pack is the Cybrot Gate equivalent.

## Install (Claude Code)

Copy into your project or user skills directory:

```bash
cp -R cli/plugins/claude-code/skills/* ~/.claude/skills/
# or project-local:
mkdir -p .claude/skills && cp -R cli/plugins/claude-code/skills/* .claude/skills/
```

## Skills included

| Skill | Purpose |
|-------|---------|
| `cybrot-gate` | Umbrella / when to use which skill |
| `cybrot-optimize` | `cybrot init` + config |
| `cybrot-scan` | Run local scan |
| `cybrot-auth` | Authenticated DAST |
| `cybrot-data` | Test data seeding |
| `cybrot-fix` | Remediate findings |
| `cybrot-verify` | Re-scan verification |
| `cybrot-api` | Cloud API / history |
| `cybrot-ci` | CI gates & Actions |

Cursor users: the same skills live in `.cursor/skills/cybrot-*` at the monorepo root.
