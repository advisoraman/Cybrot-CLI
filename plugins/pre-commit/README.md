# Cybrot Gate pre-commit plugin
#
# Mirrors StackHawk “scan before you ship” — runs a fast local gate on push.
#
## Setup

1. Install CLI: `cd cli && npm link`
2. Ensure **Docker is running** (scanners run in `cybrot/gate-tools`)
3. Copy hooks into your app repo `.pre-commit-config.yaml` — see `.pre-commit-config.snippet.yaml`
4. `pre-commit install --hook-type pre-push`

## What it does

On `git push`, runs `cybrot scan --sast --secrets --fail-on high --no-upload`
(Semgrep/Gitleaks inside Docker). Exit code 2 blocks the push when high/critical findings exist.
