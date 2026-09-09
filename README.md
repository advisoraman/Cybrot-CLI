# Cybrot CLI — Cybrot Gate

StackHawk-style **local security scanning** for developers and AI coding agents.

```text
Write code → start app → cybrot scan → decide → fix → verify → deploy
```

**Required:** Node 18+ and Docker  
**Not required:** installing Semgrep / Gitleaks / Trivy on your machine

---

## Quick setup

```bash
git clone https://github.com/advisoraman/Cybrot-CLI.git
cd Cybrot-CLI
npm link

# Docker must be running — scanners pull this public image automatically:
#   ghcr.io/advisoraman/cybrot-gate-tools:latest

cybrot doctor
cybrot init                 # in your app repo
# terminal 1: npm run dev
cybrot scan --target http://localhost:3000
```

Optional cloud upload:

```bash
cybrot login --api https://cybrot.com   # or http://localhost:3000
cybrot scan --target http://localhost:3000   # uploads if cybrot.yml says so
```

---

## Prebuilt Docker image

| Image | Purpose |
|-------|---------|
| [`ghcr.io/advisoraman/cybrot-gate-tools:latest`](https://github.com/users/advisoraman/packages/container/package/cybrot-gate-tools) | Semgrep + Gitleaks + Trivy |
| `ghcr.io/zaproxy/zaproxy:stable` | DAST (ZAP baseline) |

```bash
docker pull ghcr.io/advisoraman/cybrot-gate-tools:latest
```

Override:

```bash
export CYBROT_TOOLS_IMAGE=ghcr.io/advisoraman/cybrot-gate-tools:latest
```

Build locally (optional):

```bash
docker build -f docker/Dockerfile.gate-tools -t cybrot/gate-tools:local .
export CYBROT_TOOLS_IMAGE=cybrot/gate-tools:local
```

---

## Commands

| Command | What it does |
|---------|----------------|
| `cybrot doctor` | Check Node + Docker + images |
| `cybrot init` | Write `cybrot.yml` |
| `cybrot scan` | Local SAST / secrets / SCA / DAST |
| `cybrot scan --cloud` | Legacy: upload source to Cybrot Cloud workers |
| `cybrot findings` | Show last scan findings |
| `cybrot verify` | Re-scan and confirm fixes |
| `cybrot seed` | Auth DAST test-data checklist |
| `cybrot login` / `logout` | Cloud auth |
| `cybrot status <id>` | Cloud scan status |

Useful flags: `--target`, `--sast`, `--secrets`, `--sca`, `--dast`, `--format json|sarif`, `--fail-on high`, `--auth-bearer`, `--no-upload`.

Example config: [`cybrot.yml.example`](cybrot.yml.example).

---

## Agent skills

StackHawk ships **agent skills** so Copilot / Claude can run HawkScan from chat.  
Cybrot Gate ships the same idea under `.cursor/skills/` and `plugins/claude-code/skills/`.

| Skill | When to use |
|-------|-------------|
| `cybrot-gate` | Umbrella — deploy readiness workflow |
| `cybrot-optimize` | Set up `cybrot init` + config |
| `cybrot-scan` | Run a local security scan |
| `cybrot-auth` | Authenticated DAST (Bearer / cookie / API key) |
| `cybrot-data` | Seed safe test data for deep DAST |
| `cybrot-fix` | Patch findings (minimal changes) |
| `cybrot-verify` | Re-scan and prove the fix |
| `cybrot-api` | Query Cybrot Cloud history / explain |
| `cybrot-ci` | Wire CI gates |

### Install for Cursor

Skills are already in this repo at [`.cursor/skills/`](.cursor/skills/).  
Open this repo in Cursor, or copy them into your app:

```bash
cp -R .cursor/skills/cybrot-* /path/to/your-app/.cursor/skills/
```

Then ask: *“Run Cybrot Gate on this app”* or *“Fix the critical Cybrot findings and verify.”*

### Install for Claude Code

```bash
cp -R plugins/claude-code/skills/* ~/.claude/skills/
# or project-local:
mkdir -p .claude/skills && cp -R plugins/claude-code/skills/* .claude/skills/
```

See [`plugins/claude-code/README.md`](plugins/claude-code/README.md).

---

## Plugins (like StackHawk hawkscan-action)

| Plugin | StackHawk analogue | Path |
|--------|--------------------|------|
| GitHub Action | hawkscan-action | [`plugins/github-action/`](plugins/github-action/) |
| GitLab CI | HawkScan CI | [`ci/gitlab-ci-cybrot.yml`](ci/gitlab-ci-cybrot.yml) |
| Pre-commit / pre-push | local gate | [`plugins/pre-commit/`](plugins/pre-commit/) |
| VS Code / Cursor tasks | IDE scan | [`plugins/vscode/`](plugins/vscode/) |
| Claude / Cursor skills | Wingman agent skills | [`.cursor/skills/`](.cursor/skills/), [`plugins/claude-code/`](plugins/claude-code/) |

Catalog: [`plugins/README.md`](plugins/README.md).

### GitHub Action (example)

```yaml
- uses: actions/checkout@v4
- uses: ./plugins/github-action   # from this repo as submodule, or copy action
  with:
    layers: sast,secrets,sca
    fail-on: high
    format: sarif
```

Or copy [`ci/github-actions-cybrot.yml`](ci/github-actions-cybrot.yml) into your app’s `.github/workflows/`.

---

## Layout

```text
Cybrot-CLI/
├── bin/cybrot.mjs          # CLI entry
├── src/                    # commands, scanners, normalizer, cloud
├── docker/                 # gate-tools Dockerfile
├── plugins/                # GitHub Action, pre-commit, VS Code, Claude skills
├── .cursor/skills/         # Cursor agent skills
├── ci/                     # full workflow templates
└── cybrot.yml.example
```

---

## License

UNLICENSED / proprietary unless otherwise stated. Public repo for distribution of the CLI and tools image.
