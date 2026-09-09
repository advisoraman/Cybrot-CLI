import { apiCall } from './client.js';
import { CLI_VERSION } from '../util.js';

/**
 * Create a local_cli scan and ingest normalized findings into Cybrot Cloud.
 */
export async function uploadLocalResults(api, token, {
  name,
  target,
  findings,
  tools,
  risk,
  durationMs,
  projectId = null,
  metadata = {},
}) {
  const create = await apiCall(api, token, 'POST', '/api/scans/local', {
    json: {
      name: name || 'Local CLI scan',
      source_url: target || 'local://workspace',
      authorized: true,
      project_id: projectId,
      cli_version: CLI_VERSION,
      tools: (tools || []).map((t) => t.name),
      metadata: {
        ...metadata,
        risk_decision: risk?.decision,
        duration_ms: durationMs,
        findings_count: findings?.length ?? 0,
      },
    },
  });

  if (create.status !== 201 || !create.data?.scan_id) {
    return {
      ok: false,
      error: create.data?.error || `Create failed (HTTP ${create.status})`,
      status: create.status,
    };
  }

  const scanId = create.data.scan_id;
  const ingest = await apiCall(api, token, 'POST', `/api/scans/${scanId}/ingest`, {
    json: {
      findings: (findings || []).map(toIngestFinding),
      tools: tools || [],
      risk,
      complete: true,
    },
  });

  if (ingest.status !== 200 && ingest.status !== 201) {
    return {
      ok: false,
      scanId,
      error: ingest.data?.error || `Ingest failed (HTTP ${ingest.status})`,
      status: ingest.status,
    };
  }

  return {
    ok: true,
    scanId,
    unifiedCount: ingest.data?.unified_count,
    ingested: ingest.data?.ingested,
    dashboardUrl: `${api}/scans/${scanId}`,
  };
}

function toIngestFinding(f) {
  return {
    tool_name: f.tool || f.source,
    tool_finding_id: f.id,
    title: f.title,
    severity: f.severity,
    confidence_level: f.confidence,
    description: f.description,
    remediation: f.remediation,
    cwe_id: f.cwe_id,
    cve_id: f.cve_id,
    file_path: f.file_path,
    line_number: f.line_number,
    endpoint_url: f.endpoint_url,
    http_method: f.http_method,
    reference_urls: f.references || [],
    finding_type: f.finding_type,
    evidence: f.evidence,
    raw_output: f.raw || f,
  };
}
