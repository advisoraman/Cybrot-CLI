import path from 'node:path';
import { log } from '../util.js';
import { makeFinding, normalizeSeverity } from '../normalizer/index.js';
import { runInToolsContainer } from './docker-runner.js';

export async function runSast(workspaceDir, opts = {}) {
  const detailed = opts.tier === 'detailed';
  const config = detailed
    ? (process.env.SEMGREP_DETAILED_CONFIG || 'p/security-audit').split(',')[0]
    : process.env.SEMGREP_CONFIG || 'p/default';

  log(`  Running Semgrep in Docker (${detailed ? 'detailed' : 'quick'})…`);
  const args = [
    'semgrep',
    'scan',
    '--config', config,
    '--json',
    '--quiet',
    '--metrics', 'off',
    '--timeout', detailed ? '60' : '30',
    '/src',
  ];

  const result = await runInToolsContainer({
    workspaceDir,
    args,
    maxMs: opts.maxMs || (detailed ? 20 * 60 * 1000 : 8 * 60 * 1000),
  });

  let doc;
  try {
    doc = JSON.parse(result.stdout || '{}');
  } catch {
    return {
      name: 'sast/semgrep',
      findings: [],
      error: result.error || result.stderr?.slice(0, 200) || 'Could not parse semgrep JSON',
    };
  }

  const results = Array.isArray(doc.results) ? doc.results : [];
  const findings = results.map((r) => {
    const extra = r.extra || {};
    const meta = extra.metadata || {};
    return makeFinding({
      title: (meta.shortDescription || extra.message || r.check_id || 'SAST finding').slice(0, 200),
      severity: normalizeSeverity(extra.severity || meta.severity),
      confidence: (meta.confidence || 'medium').toLowerCase(),
      source: 'sast',
      tool: 'semgrep',
      cwe_id: firstCwe(meta.cwe),
      file_path: stripSrc(r.path),
      line_number: r.start?.line ?? null,
      description: extra.message || '',
      remediation: meta.fix || extra.fix || null,
      references: Array.isArray(meta.references) ? meta.references : [],
      evidence: { rule_id: r.check_id },
      raw: r,
    });
  });

  return { name: 'sast/semgrep', findings, error: null };
}

function firstCwe(cwe) {
  if (!cwe) return null;
  const s = Array.isArray(cwe) ? cwe[0] : String(cwe);
  const m = String(s).match(/CWE-?\d+/i);
  return m ? m[0].toUpperCase().replace('CWE', 'CWE-').replace('CWE--', 'CWE-') : null;
}

function stripSrc(p) {
  if (!p) return null;
  return String(p).replace(/^\/src\/?/, '').replace(/^\.\//, '');
}
