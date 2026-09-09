---
name: cybrot-api
description: Query Cybrot Cloud scan history and findings via the CLI/API. Use when the user asks about dashboard scans, scan status, or cloud findings.
---

# Cybrot API

Query Cybrot Cloud for scan history and findings.

## Auth

```bash
cybrot login --api http://localhost:3000 # or https://cybrot.com
```

Token stored in `~/.cybrot/config.json`.

## Commands

```bash
cybrot status <scan-id>
cybrot findings --scan <scan-id>
cybrot findings <finding-id> --scan <scan-id> --explain
```

## HTTP (for agents)

- `GET /api/scans` — list
- `GET /api/scans/:id` — detail
- `GET /api/scans/:id/unified-findings` — deduped findings
- `POST /api/scans/:id/findings/:fid/explain` — AI explain
- `POST /api/scans/local` + `POST /api/scans/:id/ingest` — CLI upload path
