# Cybrot Gate plugins & agent skills

## Integrations

| Integration | Install |
|-------------|---------|
| [`github-action/`](github-action/) | Copy workflow or use composite action |
| [`pre-commit/`](pre-commit/) | Snippet → `.pre-commit-config.yaml` |
| [`vscode/`](vscode/) | Copy `tasks.json` → `.vscode/` |
| [`claude-code/`](claude-code/) | Copy into `.claude/skills/` or Cursor `.cursor/skills/` |

Also: repo-root [`.cursor/skills/`](../.cursor/skills/) for Cursor.

## Agent skills (chat → scan → fix → verify)

| Skill | Purpose |
|-------|---------|
| `cybrot-gate` | Full Gate workflow / routing |
| `cybrot-optimize` | `cybrot init` |
| `cybrot-scan` | Run scan |
| `cybrot-auth` | Authenticated scanning |
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

cybrot doctor

# Cursor skills into your app
cp -R .cursor/skills/cybrot-* /path/to/app/.cursor/skills/
```
