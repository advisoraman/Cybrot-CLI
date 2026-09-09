export function printJsonReport(payload) {
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
}

export function buildScanPayload({
  projectName,
  target,
  findings,
  risk,
  tools,
  durationMs,
  cliVersion,
  config,
}) {
  return {
    version: 1,
    cli_version: cliVersion,
    project: projectName,
    target,
    generated_at: new Date().toISOString(),
    duration_ms: durationMs,
    risk,
    tools,
    findings,
    config: config
      ? {
          scans: config.scans,
          gate: config.gate,
        }
      : undefined,
  };
}
