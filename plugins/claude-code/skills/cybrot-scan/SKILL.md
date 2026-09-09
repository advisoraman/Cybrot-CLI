---
name: cybrot-scan
description: Run Cybrot local security scans (SAST, secrets, SCA, DAST) and interpret results. Use when the user asks to scan for security issues, run Cybrot, or security-test a feature.
---

# Cybrot Scan

Run a local Cybrot security scan and summarize findings.

## Steps

1. Confirm the application is running if DAST is needed (e.g. `http://localhost:3000`).
2. From the app root:

```bash
cybrot scan --target http://localhost:3000
# or layer-specific:
cybrot scan --sast
cybrot scan --secrets
cybrot scan --sca
cybrot scan --dast --target http://localhost:3000
```

3. Read `.cybrot/last-scan.json` or terminal output for the deployment decision.
4. Summarize: overall risk, counts by severity, top issues with evidence, and whether it is SAFE TO DEPLOY / REVIEW REQUIRED / DO NOT DEPLOY.
5. For cloud explain on an uploaded finding: `cybrot findings <id> --explain` (requires login + prior upload).

## Output focus

Developers care about the **deployment decision**, not raw alert dumps. Prioritize high-confidence, reachable findings.
