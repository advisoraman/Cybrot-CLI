---
name: cybrot-gate
description: Cybrot Gate umbrella skill — local security scan, deployment decision, fix, and verify before shipping. Use when the user mentions Cybrot Gate, security gate, StackHawk-like scan, or deploy readiness.
---

# Cybrot Gate

Cybrot Gate is the local developer security workflow (StackHawk-style):

```text
Write → Scan locally → Decide → Fix → Verify → Deploy
```

## When to use which skill

| Intent | Skill |
|--------|--------|
| Set up project | `cybrot-optimize` |
| Run a scan | `cybrot-scan` |
| Authenticated DAST | `cybrot-auth` |
| Seed test data | `cybrot-data` |
| Fix findings | `cybrot-fix` |
| Re-scan verify | `cybrot-verify` |
| Cloud history/API | `cybrot-api` |
| CI / GitHub Action | `cybrot-ci` |

## Default flow

```bash
cybrot init
cybrot doctor
# start app
cybrot scan --target http://localhost:3000
# fix issues
cybrot verify
```

Lead with the **deployment decision** (SAFE TO DEPLOY / REVIEW REQUIRED / DO NOT DEPLOY), not a raw alert dump.
