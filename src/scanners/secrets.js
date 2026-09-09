import { promises as fs } from 'node:fs';
import path from 'node:path';
import { log } from '../util.js';
import { makeFinding } from '../normalizer/index.js';
import { runInToolsContainer } from './docker-runner.js';

export async function runSecrets(workspaceDir, opts = {}) {
  const reportName = `gitleaks-${Date.now()}.json`;
  const hostReport = path.join(workspaceDir, '.cybrot', reportName);

  log('  Running Gitleaks in Docker…');
  const args = [
    'gitleaks',
    'dir',
    '/src',
    '--report-format', 'json',
    '--report-path', `/out/${reportName}`,
    '--exit-code', '0',
    '--no-banner',
  ];

  const result = await runInToolsContainer({
    workspaceDir,
    args,
    maxMs: opts.maxMs || 6 * 60 * 1000,
  });

  let leaks = [];
  try {
    leaks = JSON.parse(await fs.readFile(hostReport, 'utf8')) || [];
  } catch {
    leaks = [];
  } finally {
    fs.unlink(hostReport).catch(() => {});
  }

  const findings = leaks.map((l) =>
    makeFinding({
      title: `Secret: ${l.Description || l.RuleID || 'credential'}`.slice(0, 200),
      severity: 'high',
      confidence: 'high',
      source: 'secrets',
      tool: 'gitleaks',
      cwe_id: 'CWE-798',
      file_path: stripSrc(l.File),
      line_number: l.StartLine ?? null,
      description: `${l.Description || 'A secret was detected.'} Rule: ${l.RuleID}`,
      remediation: 'Revoke and rotate this credential, then remove it from source and history.',
      references: ['https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_credentials'],
      evidence: { rule_id: l.RuleID, match_preview: mask(l.Secret || l.Match) },
      raw: { ...l, Secret: undefined, Match: mask(l.Match) },
    })
  );

  return {
    name: 'secrets/gitleaks',
    findings,
    error: result.ok || findings.length ? null : result.error || result.stderr?.slice(0, 200) || null,
  };
}

function mask(secret) {
  const s = String(secret || '');
  if (s.length <= 8) return '••••';
  return `${s.slice(0, 4)}••••••••${s.slice(-2)}`;
}

function stripSrc(p) {
  if (!p) return null;
  return String(p).replace(/^\/src\/?/, '').replace(/^\.\//, '');
}
