/**
 * Export findings as SARIF 2.1.0 for CI / code scanning.
 */
export function toSarif(findings, { toolName = 'cybrot', version = '2.0.0' } = {}) {
  const results = findings.map((f) => {
    const level =
      f.severity === 'critical' || f.severity === 'high'
        ? 'error'
        : f.severity === 'medium'
          ? 'warning'
          : 'note';

    const loc = {};
    if (f.file_path) {
      loc.physicalLocation = {
        artifactLocation: { uri: f.file_path },
        region: f.line_number ? { startLine: f.line_number } : undefined,
      };
    }

    return {
      ruleId: f.cwe_id || f.id || f.tool,
      level,
      message: { text: f.title + (f.description ? `\n${f.description}` : '') },
      locations: Object.keys(loc).length ? [loc] : undefined,
      properties: {
        severity: f.severity,
        confidence: f.confidence,
        source: f.source,
        endpoint_url: f.endpoint_url || undefined,
        cwe: f.cwe_id || undefined,
        cve: f.cve_id || undefined,
      },
    };
  });

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: toolName,
            informationUri: 'https://cybrot.com',
            version,
            rules: [],
          },
        },
        results,
      },
    ],
  };
}

export function printSarif(findings, opts) {
  process.stdout.write(JSON.stringify(toSarif(findings, opts), null, 2) + '\n');
}
