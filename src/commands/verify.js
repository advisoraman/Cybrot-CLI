import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fail, log, loadUserConfig, resolveApi, resolveToken, CLI_VERSION } from '../util.js';
import { loadProjectConfig } from '../config/load.js';
import { runLocalScanners } from '../scanners/index.js';
import { summarizeRisk } from '../risk/index.js';
import { apiCall } from '../cloud/client.js';
import { buildScanPayload } from '../output/json.js';
import { uploadLocalResults } from '../cloud/ingest.js';

/**
 * Re-scan and compare against previous findings. Mark verified when fingerprints disappear.
 */
export async function cmdVerify(flags, positional) {
  const cwd = path.resolve(positional[0] || '.');
  const cachePath = path.join(cwd, '.cybrot', 'last-scan.json');
  let before;
  try {
    before = JSON.parse(await fs.readFile(cachePath, 'utf8'));
  } catch {
    fail('No previous scan to verify against. Run `cybrot scan` first.');
  }

  const beforeFindings = before.findings || [];
  if (!beforeFindings.length) {
    log('✓ Previous scan had no findings — nothing to verify.');
    return;
  }

  log('🛡️  CYBROT VERIFY\n');
  log(`Before: ${beforeFindings.length} finding(s)`);
  log('Re-running security scan…\n');

  const { config } = await loadProjectConfig(cwd);
  const target = flags.target || before.target || config.application?.target;
  const started = Date.now();
  const { findings: afterFindings, tools } = await runLocalScanners({
    workspaceDir: cwd,
    target,
    config,
    flags,
  });
  const durationMs = Date.now() - started;
  const risk = summarizeRisk(afterFindings);

  const beforeKeys = new Set(beforeFindings.map(fingerprint));
  const afterKeys = new Set(afterFindings.map(fingerprint));

  const resolved = beforeFindings.filter((f) => !afterKeys.has(fingerprint(f)));
  const remaining = afterFindings.filter((f) => beforeKeys.has(fingerprint(f)));
  const newOnes = afterFindings.filter((f) => !beforeKeys.has(fingerprint(f)));

  log('──────────────────────────────\n');
  for (const f of resolved) {
    log(`✅ FIX VERIFIED — ${f.title}`);
    log(`   Before: 🔴 Detected`);
    log(`   After:  🟢 Not detected by verification scan\n`);
  }
  for (const f of remaining) {
    log(`❌ STILL PRESENT — ${f.title}`);
    log(`   Verification: RE-SCAN FAILED\n`);
  }
  if (newOnes.length) {
    log(`⚠  ${newOnes.length} new finding(s) appeared during verification.`);
  }

  const payload = buildScanPayload({
    projectName: before.project,
    target,
    findings: afterFindings.map((f) => ({
      ...f,
      verification_status: beforeKeys.has(fingerprint(f))
        ? 're_scan_failed'
        : 'unverified',
    })),
    risk,
    tools,
    durationMs,
    cliVersion: CLI_VERSION,
    config,
  });
  payload.verification = {
    before_count: beforeFindings.length,
    after_count: afterFindings.length,
    verified: resolved.map((f) => f.id),
    still_present: remaining.map((f) => f.id),
    new_findings: newOnes.map((f) => f.id),
  };

  await fs.mkdir(path.join(cwd, '.cybrot'), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(payload, null, 2));

  // Update cloud unified findings when previous scan was uploaded
  if (before.cloud_scan_id && !flags['no-upload']) {
    const cfg = await loadUserConfig();
    const token = await resolveToken(flags, cfg);
    if (token) {
      const api = flags.api || cfg.api || resolveApi(flags, cfg);
      for (const f of resolved) {
        // Best-effort: mark prior unified findings verified if we can match by title
        await markVerified(api, token, before.cloud_scan_id, f).catch(() => {});
      }
      // Also upload the verification scan as a new local scan
      const up = await uploadLocalResults(api, token, {
        name: `${before.project || 'app'} (verify)`,
        target: target || 'local://workspace',
        findings: afterFindings,
        tools,
        risk,
        durationMs,
        metadata: { verification_of: before.cloud_scan_id },
      });
      if (up.ok) {
        log(`✓ Verification scan uploaded: ${up.dashboardUrl}`);
        payload.cloud_scan_id = up.scanId;
        await fs.writeFile(cachePath, JSON.stringify(payload, null, 2));
      }
    }
  }

  if (remaining.length) {
    fail(`${remaining.length} finding(s) still present after verification.`, 2);
  }
  log('\n✅ Security verification passed.\n');
}

function fingerprint(f) {
  return [
    (f.title || '').toLowerCase().replace(/\s+/g, ' ').trim(),
    f.file_path || f.endpoint_url || '',
    f.line_number ?? '',
    (f.cwe_id || '').toUpperCase(),
  ].join('|');
}

async function markVerified(api, token, scanId, finding) {
  // List unified findings and patch matching ones
  const { status, data } = await apiCall(api, token, 'GET', `/api/scans/${scanId}/unified-findings`);
  if (status !== 200) return;
  const list = data.findings || data || [];
  const match = list.find(
    (u) =>
      (u.title || '').toLowerCase() === (finding.title || '').toLowerCase() &&
      (u.file_path || u.endpoint_url || '') === (finding.file_path || finding.endpoint_url || '')
  );
  if (!match) return;
  await apiCall(api, token, 'PATCH', `/api/scans/${scanId}/unified-findings/${match.id}/verify`, {
    json: { note: 'Verified by cybrot verify (finding absent on re-scan)' },
  });
}
