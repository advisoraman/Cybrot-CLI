---
name: cybrot-data
description: Prepare safe local test data so Cybrot DAST can exercise authenticated application routes. Use when DAST cannot reach deep routes due to empty state.
---

# Cybrot Data Seeding

DAST cannot test deep routes if the app has no data after login.

## Approach

1. Use **dedicated test credentials** only (never production).
2. Prefer existing app seed scripts / fixtures (`npm run seed`, `prisma db seed`, Django fixtures).
3. Minimum useful seed for SaaS apps:
 - test user
 - organization / tenant
 - one project
 - a few sample records on primary resources
4. Configure authenticated DAST in `cybrot.yml`:

```yaml
dast:
 authentication:
 enabled: true
 type: bearer # or cookie | api_key
 token: "TEST_ONLY_TOKEN"
```

Or CLI:

```bash
cybrot scan --dast --target http://localhost:3000 \
 --auth-bearer "$TEST_TOKEN" --authorize
```

5. Confirm seeded routes respond 200 for the test user before scanning.
