# Agent guide — Cybrot Gate

Use these skills when the user asks about Cybrot security scanning, Cybrot Gate, or deploy readiness.

## Skills

| Skill | Intent |
|-------|--------|
| `cybrot-gate` | Overall workflow |
| `cybrot-optimize` | Setup / `cybrot init` |
| `cybrot-scan` | Run scan |
| `cybrot-auth` | Authenticated scanning |
| `cybrot-data` | Seed test data |
| `cybrot-fix` | Patch findings |
| `cybrot-verify` | Verify with re-scan |
| `cybrot-api` | Cloud findings |
| `cybrot-ci` | CI / GitHub Action |

Installed under `.cursor/skills/` (Cursor) and `plugins/claude-code/skills/` (Claude Code).

## Runtime

```bash
npm link # from this repo
cybrot doctor
cybrot scan --target http://localhost:3000
```

Do not name third-party scanner engines to the user. Say “Cybrot Gate” / “local scan” only.
