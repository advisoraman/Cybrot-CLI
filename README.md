# Cybrot CLI — Cybrot Gate

Local security scanning for developers and AI coding agents.

```text
Write code → start app → cybrot scan → decide → fix → verify → deploy
```

**Required:** Node 18+ and Docker

---

## Quick setup

```bash
git clone https://github.com/advisoraman/Cybrot-CLI.git
cd Cybrot-CLI
npm link

cybrot doctor
cybrot init # in your app repo
# terminal 1: npm run dev
cybrot scan --target http://localhost:3000
```

Optional cloud upload:

```bash
cybrot login --api https://cybrot.com # or your Cybrot API URL
cybrot scan --target http://localhost:3000
```

---

## Scanner runtime

Scans run through Cybrot’s managed Docker images. You do not install or configure individual engines.

```bash
# Optional: pre-pull / override tools image
docker pull ghcr.io/advisoraman/cybrot-gate-tools:latest
export CYBROT_TOOLS_IMAGE=ghcr.io/advisoraman/cybrot-gate-tools:latest
```

Build the tools image locally (optional):

```bash
docker build -f docker/Dockerfile.gate-tools -t cybrot/gate-tools:local .
export CYBROT_TOOLS_IMAGE=cybrot/gate-tools:local
```

---

## Commands

| Command | What it does |
|---------|----------------|
| `cybrot doctor` | Check Node + Docker readiness |
| `cybrot init` | Write `cybrot.yml` |
| `cybrot scan` | Local code, secrets, dependency, and application scanning |
| `cybrot scan --cloud` | Upload source for a Cybrot Cloud scan |
| `cybrot findings` | Show last scan findings |
| `cybrot verify` | Re-scan and confirm fixes |
| `cybrot seed` | Auth scan test-data checklist |
| `cybrot login` / `logout` | Cloud auth |
| `cybrot status <id>` | Cloud scan status |

Useful flags: `--target`, `--sast`, `--secrets`, `--sca`, `--dast`, `--format json|sarif`, `--fail-on high`, `--auth-bearer`, `--no-upload`.

Example config: [`cybrot.yml.example`](cybrot.yml.example).

---

## Agent skills

Skills teach Cursor / Claude to run Cybrot Gate from chat.

| Skill | When to use |
|-------|-------------|
| `cybrot-gate` | Umbrella — deploy readiness workflow |
| `cybrot-optimize` | Set up `cybrot init` + config |
| `cybrot-scan` | Run a local security scan |
| `cybrot-auth` | Authenticated application scanning |
| `cybrot-data` | Seed safe test data for deeper scans |
| `cybrot-fix` | Patch findings (minimal changes) |
| `cybrot-verify` | Re-scan and prove the fix |
| `cybrot-api` | Query Cybrot Cloud history |
| `cybrot-ci` | Wire CI gates |

### Install for Cursor

Skills are in [`.cursor/skills/`](.cursor/skills/). Copy into your app:

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

---

## Integrations

| Integration | Path |
|-------------|------|
| GitHub Action | [`plugins/github-action/`](plugins/github-action/) |
| GitLab CI | [`ci/gitlab-ci-cybrot.yml`](ci/gitlab-ci-cybrot.yml) |
| pre-commit | [`plugins/pre-commit/`](plugins/pre-commit/) |
| VS Code / Cursor tasks | [`plugins/vscode/`](plugins/vscode/) |
| Claude Code skills | [`plugins/claude-code/`](plugins/claude-code/) |

See [`plugins/README.md`](plugins/README.md).

---

## Support

Issues and updates: https://github.com/advisoraman/Cybrot-CLI
