---
name: cybrot-ci
description: Add Cybrot security gates to GitHub Actions or GitLab CI. Use when the user asks for CI security scanning, fail-on-severity gates, or SARIF export.
---

# Cybrot CI

Wire Cybrot into CI as a security gate.

## Templates / plugins

Cybrot Gate CI pack :

- `cli/plugins/github-action/` — composite Action + `workflow.example.yml`
- `cli/ci/github-actions-cybrot.yml` — full workflow
- `cli/ci/gitlab-ci-cybrot.yml`
- `cli/plugins/pre-commit/` — pre-push gate
- `cli/plugins/vscode/` — IDE tasks
- `cli/plugins/claude-code/` — agent skill pack

## Typical gate

```bash
cybrot scan --format sarif --fail-on high --no-upload > cybrot.sarif
```

Exit code 2 means the severity gate failed.

## Secrets

- `CYBROT_TOKEN` — optional cloud upload
- `CYBROT_API` — API base (default production)

For DAST in CI: start the app (or preview), wait for health, then `cybrot scan --target $URL --authorize`.
