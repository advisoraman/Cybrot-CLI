import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fail, log, loadUserConfig, resolveApi, resolveToken } from '../util.js';
import { printFindingDetail } from '../output/terminal.js';
import { apiCall } from '../cloud/client.js';

export async function cmdFindings(flags, positional) {
  const cwd = path.resolve(flags.path || '.');
  const findingId = positional[0];

  // Prefer local last-scan cache; fall back to cloud if --scan given
  if (flags.scan) {
    return cloudFindings(flags, findingId);
  }

  const cachePath = path.join(cwd, '.cybrot', 'last-scan.json');
  let payload;
  try {
    payload = JSON.parse(await fs.readFile(cachePath, 'utf8'));
  } catch {
    fail('No local scan results. Run `cybrot scan` first, or pass --scan <id>.');
  }

  const findings = payload.findings || [];
  if (findingId) {
    const f = findings.find((x) => x.id === findingId || x.id.endsWith(findingId));
    if (!f) fail(`Finding not found: ${findingId}`);
    printFindingDetail(f);
    if (flags.explain && payload.cloud_scan_id) {
      await explainCloud(flags, payload.cloud_scan_id, f);
    }
    return;
  }

  if (!findings.length) {
    log('No findings in last scan.');
    return;
  }

  for (const f of findings) {
    const where = f.endpoint_url || (f.file_path ? `${f.file_path}${f.line_number ? ':' + f.line_number : ''}` : '');
    log(`[${(f.severity || '').toUpperCase()}] ${f.id}  ${f.title}${where ? ' — ' + where : ''}`);
  }
  log(`\n${findings.length} finding(s). Detail: cybrot findings <id>`);
}

async function cloudFindings(flags, findingId) {
  const cfg = await loadUserConfig();
  const token = await resolveToken(flags, cfg);
  if (!token) fail('No token. Run `cybrot login`.');
  const api = flags.api || cfg.api || resolveApi(flags, cfg);
  const scanId = flags.scan;

  if (findingId) {
    const { status, data } = await apiCall(
      api,
      token,
      'GET',
      `/api/scans/${scanId}/unified-findings/${findingId}`
    );
    if (status !== 200) fail(`Finding not found (HTTP ${status})`);
    printFindingDetail({
      title: data.title,
      severity: data.severity,
      confidence: 'medium',
      source: data.finding_type?.toLowerCase(),
      tool: data.primary_tool,
      cwe_id: data.cwe_id,
      file_path: data.file_path,
      line_number: data.line_number,
      endpoint_url: data.endpoint_url,
      description: data.description,
      verification_status: data.status,
    });
    if (flags.explain) await explainCloud(flags, scanId, { id: findingId, ...data });
    return;
  }

  const { status, data } = await apiCall(api, token, 'GET', `/api/scans/${scanId}/unified-findings`);
  if (status !== 200) fail(`Failed to list findings (HTTP ${status})`);
  const list = data.findings || data || [];
  for (const f of list) {
    log(`[${(f.severity || '').toUpperCase()}] ${f.id}  ${f.title}`);
  }
}

async function explainCloud(flags, scanId, finding) {
  const cfg = await loadUserConfig();
  const token = await resolveToken(flags, cfg);
  if (!token) {
    log('⚠  Login required for AI explain');
    return;
  }
  const api = flags.api || cfg.api || resolveApi(flags, cfg);
  // Prefer tool finding id if present; unified AI routes use finding id under findings path
  const fid = finding.primary_finding_id || finding.id;
  log('\nRequesting AI explanation…');
  const { status, data } = await apiCall(api, token, 'POST', `/api/scans/${scanId}/findings/${fid}/explain`, {
    json: {},
  });
  if (status !== 200) {
    log(`⚠  Explain failed (HTTP ${status}): ${data?.error || ''}`);
    return;
  }
  log('\nAI Explain:');
  log(data.summary || data.explanation || JSON.stringify(data, null, 2));
}
