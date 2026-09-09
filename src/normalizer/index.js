import crypto from 'node:crypto';

/**
 * Normalize scanner-specific findings into Cybrot Finding shape.
 */
export function makeFinding({
  title,
  severity = 'medium',
  confidence = 'medium',
  source,
  tool,
  cwe_id = null,
  cve_id = null,
  file_path = null,
  line_number = null,
  endpoint_url = null,
  http_method = null,
  evidence = {},
  remediation = null,
  description = '',
  references = [],
  verification_status = 'unverified',
  raw = null,
}) {
  const sev = normalizeSeverity(severity);
  const conf = String(confidence || 'medium').toLowerCase();
  const id = crypto
    .createHash('sha256')
    .update([title, file_path || endpoint_url || '', line_number ?? '', cwe_id || '', source].join('|'))
    .digest('hex')
    .slice(0, 16);

  return {
    id: `finding_${id}`,
    title: String(title || 'Finding').slice(0, 200),
    severity: sev,
    confidence: conf,
    source, // sast | dast | secrets | sca
    tool: tool || source,
    cwe_id,
    cve_id,
    file_path,
    line_number,
    endpoint_url,
    http_method,
    evidence: evidence || {},
    remediation,
    description: description || '',
    references: references || [],
    verification_status,
    finding_type: sourceToType(source),
    raw,
  };
}

export function sourceToType(source) {
  const map = { sast: 'SAST', dast: 'DAST', secrets: 'SECRET', sca: 'SCA' };
  return map[source] || 'OTHER';
}

export function normalizeSeverity(s) {
  const v = String(s || 'medium').toLowerCase();
  if (v === 'error' || v === 'critical' || v === 'crit') return 'critical';
  if (v === 'warning' || v === 'high' || v === 'warn') return 'high';
  if (v === 'info' || v === 'informational' || v === 'note') return 'info';
  if (v === 'low') return 'low';
  if (v === 'medium' || v === 'moderate') return 'medium';
  return 'medium';
}

export function dedupeFindings(findings) {
  const map = new Map();
  for (const f of findings) {
    const key = [
      (f.title || '').toLowerCase(),
      f.file_path || f.endpoint_url || '',
      f.line_number ?? '',
      (f.cwe_id || '').toUpperCase(),
      f.finding_type || '',
    ].join('|');
    if (!map.has(key)) map.set(key, f);
  }
  return [...map.values()];
}

export function normalizeBatch(findings) {
  return dedupeFindings(findings.filter(Boolean));
}
