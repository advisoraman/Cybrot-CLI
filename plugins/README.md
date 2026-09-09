# Cybrot Gate plugins & agent skills

StackHawk has **HawkScan Action** + **Wingman agent skills**.  
This folder is the Cybrot Gate equivalent.

## Plugins

| Plugin | Like | Install |
|--------|------|---------|
| [`github-action/`](github-action/) | stackhawk/hawkscan-action | Copy workflow or use composite action |
| [`pre-commit/`](pre-commit/) | local pre-push gate | Snippet → `.pre-commit-config.yaml` |
| [`vscode/`](vscode/) | IDE tasks | Copy `tasks.json` → `.vscode/` |
| [`claude-code/`](claude-code/) | Wingman skills | Copy into `.claude/skills/` or Cursor `.cursor/skills/` |

Also: repo-root [`.cursor/skills/`](../.cursor/skills/) for Cursor.

## Agent skills (chat → scan → fix → verify)

| Skill | Purpose |
|-------|---------|
| `cybrot-gate` | Full Gate workflow / routing |
| `cybrot-optimize` | `cybrot init` |
| `cybrot-scan` | Run scan |
| `cybrot-auth` | Authenticated DAST |
| `cybrot-data` | Test data seeding |
| `cybrot-fix` | Remediate |
| `cybrot-verify` | Re-scan verification |
| `cybrot-api` | Cloud API |
| `cybrot-ci` | CI gates |

## Quick install

```bash
# CLI
git clone https://github.com/advisoraman/Cybrot-CLI.git
cd Cybrot-CLI && npm link

# Docker image (auto-pulled on scan)
docker pull ghcr.io/advisoraman/cybrot-gate-tools:latest

# Cursor skills into your app
cp -R .cursor/skills/cybrot-* /path/to/app/.cursor/skills/
```
