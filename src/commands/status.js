import { fail, log, loadUserConfig, resolveApi, resolveToken } from '../util.js';
import { apiCall } from '../cloud/client.js';

export async function cmdStatus(flags, positional) {
  const scanId = positional[0];
  if (!scanId) fail('Usage: cybrot status <scan-id>');
  const cfg = await loadUserConfig();
  const token = await resolveToken(flags, cfg);
  if (!token) fail('No token found. Run `cybrot login` first, or pass --token.');
  const api = flags.api || cfg.api || resolveApi(flags, cfg);

  const { status, data } = await apiCall(api, token, 'GET', `/api/scans/${scanId}`);
  if (status !== 200 || !data) fail(`Scan not found (HTTP ${status}).`);

  log(`status      ${data.status}`);
  if (data.scan_type) log(`type        ${data.scan_type} (${data.source_type})`);
  const count = data.findings_count ?? (Array.isArray(data.findings) ? data.findings.length : null);
  if (count !== null) log(`findings    ${count}`);
  if (data.started_at) log(`started     ${data.started_at}`);
  if (data.completed_at) log(`completed   ${data.completed_at}`);
  if (data.error_message) log(`error       ${data.error_message}`);
  log(`dashboard   ${api}/scans/${scanId}`);
}
