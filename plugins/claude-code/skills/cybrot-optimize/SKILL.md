---
name: cybrot-optimize
description: Set up Cybrot local security scanning for the current project. Use when the user asks to configure Cybrot, clearscan, or local DAST/SAST security scanning.
---

# Cybrot Optimize

Set up Cybrot security scanning for this repository.

## Steps

1. Ensure the Cybrot CLI is available (`node cli/bin/cybrot.mjs` from the cybrot-saas repo, or `cybrot` if linked).
2. From the **target application** directory (not necessarily this monorepo), run:

```bash
cybrot init
```

3. Review generated `cybrot.yml` — set `application.target` to the local app URL.
4. Confirm Docker: `cybrot doctor` (Docker is mandatory; scanners run in images)
5. Tell the user to start the app (`npm run dev` etc.), then run `cybrot scan`.

## Notes

- Config file is `cybrot.yml` (not hawk.yml / clearscan.yml).
- Local scanners require Docker. Docker is mandatory.
- Cloud upload requires `cybrot login`.
