# Cybrot CLI / Cybrot Gate tools

Public home for **Cybrot Gate** scanner tooling.

## Prebuilt Docker image (required for local scans)

Users only need **Docker** + the Cybrot CLI. Scanner binaries (Semgrep, Gitleaks, Trivy) ship in this image:

```text
ghcr.io/advisoraman/cybrot-gate-tools:latest
```

### Pull

```bash
docker pull ghcr.io/advisoraman/cybrot-gate-tools:latest
```

If the package is private the first time, make it **Public** under  
GitHub → Packages → `cybrot-gate-tools` → Package settings → Change visibility → Public.

### Use with Cybrot Gate CLI

```bash
export CYBROT_TOOLS_IMAGE=ghcr.io/advisoraman/cybrot-gate-tools:latest
cybrot doctor
cybrot scan --target http://localhost:3000
```

(The CLI defaults to this image once configured.)

DAST uses the separate public image `ghcr.io/zaproxy/zaproxy:stable`.

## Build the image yourself

```bash
docker build -f docker/Dockerfile.gate-tools -t cybrot/gate-tools:local .
export CYBROT_TOOLS_IMAGE=cybrot/gate-tools:local
```

## Publish (maintainers)

Pushing to `main` (or running **Publish gate-tools image** via Actions) builds multi-arch (`amd64` + `arm64`) and pushes to GHCR.
