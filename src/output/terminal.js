import { priorityFor } from '../risk/index.js';

const ICONS = {
  SAFE_TO_DEPLOY: '🟢',
  REVIEW_REQUIRED: '🟡',
  ACTION_REQUIRED: '🔴',
  DO_NOT_DEPLOY: '🔴',
};

export function printTerminalReport({ projectName, target, findings, risk, tools, durationMs }) {
  const lines = [];
  lines.push('');
  lines.push('🛡️  CYBROT');
  lines.push('');
  if (projectName) lines.push(`Project: ${projectName}`);
  if (target) lines.push(`Target:  ${target}`);
  for (const t of tools || []) {
    const status = t.error ? `⚠ ${t.error}` : `✓ ${t.findings} finding(s)`;
    lines.push(`✓ ${t.name}: ${status}`);
  }
  if (durationMs != null) lines.push(`Duration: ${Math.round(durationMs / 1000)}s`);
  lines.push('');
  lines.push('──────────────────────────────');
  lines.push('');
  lines.push(`SECURITY STATUS: ${risk.decision.replace(/_/g, ' ')}`);
  lines.push('');
  lines.push(`Overall Risk: ${risk.overall}`);
  lines.push('');
  lines.push(`Critical: ${risk.counts.critical || 0}`);
  lines.push(`High:     ${risk.counts.high || 0}`);
  lines.push(`Medium:   ${risk.counts.medium || 0}`);
  lines.push(`Low:      ${risk.counts.low || 0}`);
  lines.push('');
  lines.push(`${ICONS[risk.decision] || '•'} ${risk.label}`);
  lines.push('');

  if (risk.topIssue) {
    lines.push('Top issue:');
    lines.push(`  ${risk.topIssue.title}`);
    if (risk.topIssue.endpoint_url) lines.push(`  Location: ${risk.topIssue.endpoint_url}`);
    if (risk.topIssue.file_path) {
      const loc = risk.topIssue.line_number
        ? `${risk.topIssue.file_path}:${risk.topIssue.line_number}`
        : risk.topIssue.file_path;
      lines.push(`  Location: ${loc}`);
    }
    lines.push(`  Confidence: ${(risk.topIssue.confidence || 'medium').toUpperCase()}`);
    lines.push(`  Priority: ${priorityFor(risk.topIssue)}`);
    lines.push('');
  }

  const topN = [...findings]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 8);
  if (topN.length) {
    lines.push('Findings:');
    for (const f of topN) {
      const where = f.endpoint_url || (f.file_path ? `${f.file_path}${f.line_number ? ':' + f.line_number : ''}` : '');
      lines.push(`  [${(f.severity || '').toUpperCase()}] ${f.title}${where ? ` — ${where}` : ''}`);
    }
    if (findings.length > topN.length) {
      lines.push(`  … and ${findings.length - topN.length} more`);
    }
    lines.push('');
  }

  lines.push('Actions: [Explain] [Fix with AI] [Verify Fix]');
  lines.push('  → cybrot findings   |  cybrot verify  |  use Cursor skills');
  lines.push('');

  process.stdout.write(lines.join('\n'));
}

function severityRank(s) {
  return { critical: 4, high: 3, medium: 2, low: 1, info: 0 }[s] ?? 0;
}

export function printFindingDetail(f) {
  const lines = [
    '',
    `${severityIcon(f.severity)} ${(f.severity || '').toUpperCase()} — ${f.title}`,
    '',
    `Source: ${f.source} (${f.tool})`,
    `Confidence: ${(f.confidence || 'medium').toUpperCase()}`,
    `Priority: ${priorityFor(f)}`,
    `Verification: ${f.verification_status || 'unverified'}`,
  ];
  if (f.endpoint_url) lines.push(`Endpoint: ${f.http_method || 'GET'} ${f.endpoint_url}`);
  if (f.file_path) lines.push(`File: ${f.file_path}${f.line_number ? ':' + f.line_number : ''}`);
  if (f.cwe_id) lines.push(`CWE: ${f.cwe_id}`);
  if (f.description) {
    lines.push('', 'Why it matters:', f.description);
  }
  if (f.remediation) {
    lines.push('', 'Recommended action:', f.remediation);
  }
  lines.push('');
  process.stdout.write(lines.join('\n') + '\n');
}

function severityIcon(s) {
  if (s === 'critical' || s === 'high') return '🔴';
  if (s === 'medium') return '🟡';
  return '🟢';
}
