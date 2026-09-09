---
name: cybrot-verify
description: Verify Cybrot security fixes by re-scanning and comparing findings. Use when the user asks to verify fixes or confirm a vulnerability is gone.
---

# Cybrot Verify

Confirm fixes with a before/after security re-scan.

## Command

```bash
cybrot verify
# optional
cybrot verify --target http://localhost:3000
```

## Interpretation

- `FIX VERIFIED` — fingerprint present before, absent after
- `STILL PRESENT` / `RE-SCAN FAILED` — do not mark verified
- New findings during verify should be reported separately

## Rules

- Never mark VERIFIED only because code changed or tests passed.
- Application tests passing + security re-scan clean = verified.
- Update cloud findings via verify endpoint when the prior scan was uploaded.
