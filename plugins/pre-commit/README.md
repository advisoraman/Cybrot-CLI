# pre-commit — Cybrot Gate

Fast local gate before push.

```yaml
# Add to .pre-commit-config.yaml — see .pre-commit-config.snippet.yaml
```

Runs a local Cybrot Gate scan via Docker. Exit code 2 blocks the push when high/critical findings exist.
