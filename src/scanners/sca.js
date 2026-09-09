import { promises as fs } from 'node:fs';
import path from 'node:path';
import { log } from '../util.js';
import { makeFinding, normalizeSeverity } from '../normalizer/index.js';
import { runInToolsContainer } from './docker-runner.js';

/** SCA via Trivy inside the Cybrot Gate tools Docker image. */
export async function runSca(workspaceDir, opts = {}) {
  const reportName = `trivy-${Date.now()}.json`;
  const hostReport = path.join(workspaceDir, '.cybrot', reportName);

  log('  Running Trivy in Docker…');
  const args = [
    'trivy',
    'fs',
    '--format', 'json',
    '--output', `/out/${reportName}`,
    '--quiet',
    '--scanners', 'vuln',
    '/src',
  ];

  const result = await runInToolsContainer({
    workspaceDir,
    args,
    maxMs: opts.maxMs || 10 * 60 * 1000,
  });

  let doc = {};
  try {
    doc = JSON.parse(await fs.readFile(hostReport, 'utf8'));
  } catch {
    return {
      name: 'sca/trivy',
      findings: [],
      error: result.error || result.stderr?.slice(0, 200) || 'Could not parse Trivy output',
    };
  } finally {
    fs.unlink(hostReport).catch(() => {});
  }

  const findings = [];
  for (const res of doc.Results || []) {
    for (const v of res.Vulnerabilities || []) {
      findings.push(
        makeFinding({
          title: `${v.VulnerabilityID || 'CVE'}: ${v.PkgName || 'dependency'}`.slice(0, 200),
          severity: normalizeSeverity(v.Severity),
          confidence: 'high',
          source: 'sca',
          tool: 'trivy',
          cve_id: v.VulnerabilityID || null,
          cwe_id: Array.isArray(v.CweIDs) ? v.CweIDs[0] : null,
          file_path: stripSrc(res.Target) || res.Target || null,
          description: v.Description || v.Title || '',
          remediation: v.FixedVersion ? `Upgrade to ${v.FixedVersion}` : 'Upgrade the vulnerable package.',
          references: v.References || [],
          evidence: {
            package: v.PkgName,
            installed: v.InstalledVersion,
            fixed: v.FixedVersion,
          },
          raw: v,
        })
      );
    }
  }

  return { name: 'sca/trivy', findings, error: null };
}

function stripSrc(p) {
  if (!p) return null;
  return String(p).replace(/^\/src\/?/, '').replace(/^\.\//, '');
}
