---
name: cybrot-fix
description: Fix Cybrot security findings with minimal patches. Use when the user asks to fix critical/high Cybrot or security scan issues.
---

# Cybrot Fix

Remediate security findings from a Cybrot scan.

## Steps

1. Load findings from `.cybrot/last-scan.json` or `cybrot findings`.
2. Prefer FIX NOW / high severity + high confidence first.
3. For each finding:
 - Locate code via `file_path`/`line_number` or route via `endpoint_url`.
 - Read evidence; understand the framework.
 - Apply a **minimal** patch (parameterized queries, authz checks, secret removal, dependency bump).
 - Do not claim the issue is fixed yet.
4. Optionally call cloud remediate for guidance:

```bash
# after upload
curl -X POST "$API/api/scans/$SCAN/findings/$FID/remediate" \
 -H "Authorization: Bearer $TOKEN"
```

5. After patches, run tests if available, then **always** run:

```bash
cybrot verify
```

Verification means the finding fingerprint is **absent** on re-scan — not merely that code changed.
