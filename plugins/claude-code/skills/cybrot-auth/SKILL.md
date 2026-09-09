---
name: cybrot-auth
description: Configure authenticated Cybrot Gate DAST (API key, Bearer, cookie). Use when scanning logged-in apps or APIs that need test credentials.
---

# Cybrot Auth

Authenticated scanning for Cybrot Gate .

## Rules

- Use **dedicated test credentials** only — never production.
- Prefer non-prod / local targets; remote needs `--authorize`.

## CLI

```bash
cybrot scan --dast --target http://localhost:3000 \
 --auth-bearer "$TEST_TOKEN" --authorize

cybrot scan --dast --target http://localhost:3000 \
 --auth-cookie "session=..." --authorize

cybrot scan --dast --target http://localhost:3000 \
 --auth-header "X-API-Key: test-key" --authorize
```

## cybrot.yml

```yaml
dast:
 authentication:
 enabled: true
 type: bearer # bearer | cookie | api_key
 token: "TEST_ONLY"
```

If deep routes are empty after login, use the `cybrot-data` skill to seed test data first.
