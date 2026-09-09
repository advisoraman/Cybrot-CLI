import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCmd, log, logErr } from '../util.js';
import { makeFinding, normalizeSeverity } from '../normalizer/index.js';
import { assertDocker, ensureImage, ZAP_IMAGE } from './docker-runner.js';

/**
 * Local DAST against a running target (managed Docker image).
 * Rewrites localhost → host.docker.internal (macOS/Windows) or host gateway (Linux).
 */
export async function runDast(targetUrl, opts = {}) {
  await assertDocker();
  const ensured = await ensureImage(ZAP_IMAGE);
  const zapImage = ensured.image;

  let target;
  try {
    target = new URL(targetUrl);
  } catch {
    return { name: 'dast', findings: [], error: `Invalid target URL: ${targetUrl}` };
  }

  // Authorization guard: only localhost / private / explicitly authorized remote.
  if (!opts.authorized && !isLocalOrPrivate(target)) {
    return {
      name: 'dast',
      findings: [],
      error: 'Remote targets require --authorize (confirm you own/are allowed to scan this host)',
    };
  }

  const dockerTarget = rewriteTargetForDocker(target);
  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cybrot-zap-'));
  const reportFile = path.join(reportDir, 'zap-report.json');
  const duration = parseDuration(opts.maxDuration || '5m');

  log(`  Running application scan against ${dockerTarget}…`);

  const dockerArgs = [
    'run', '--rm',
    '-v', `${reportDir}:/zap/wrk:rw`,
    ...hostNetworkArgs(),
    zapImage,
    'zap-baseline.py',
    '-t', dockerTarget,
    '-J', 'zap-report.json',
    '-I', // don't fail the container on warnings
    '-m', String(Math.max(1, Math.floor(duration / 60000))),
  ];

  // Auth headers for authenticated DAST (V4)
  const auth = opts.authentication || {};
  if (auth.enabled) {
    const header = buildAuthHeader(auth);
    if (header) {
      dockerArgs.push('-z', `-config replacer.full_list(0).description=auth -config replacer.full_list(0).enabled=true -config replacer.full_list(0).matchtype=REQ_HEADER -config replacer.full_list(0).matchstr=${header.name} -config replacer.full_list(0).replacement=${header.value}`);
    }
  }

  const result = await runCmd('docker', dockerArgs, {
    maxMs: opts.maxMs || duration + 2 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
  });

  let doc = null;
  try {
    doc = JSON.parse(await fs.readFile(reportFile, 'utf8'));
  } catch {
    // Engine may leave report empty on hard failure
  } finally {
    try {
      await fs.rm(reportDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  if (!doc) {
    return {
      name: 'dast',
      findings: [],
      error: result.error || result.stderr?.slice(0, 200) || 'Application scan produced no report (is the target reachable?)',
    };
  }

  const findings = [];
  for (const site of doc.site || []) {
    for (const alert of site.alerts || []) {
      const instances = alert.instances || [{}];
      for (const inst of instances.slice(0, 5)) {
        findings.push(
          makeFinding({
            title: (alert.name || alert.alert || 'DAST finding').slice(0, 200),
            severity: zapRiskToSeverity(alert.riskcode ?? alert.risk),
            confidence: zapConfidence(alert.confidence),
            source: 'dast',
            tool: 'cybrot-dast',
            cwe_id: alert.cweid && alert.cweid !== '-1' ? `CWE-${alert.cweid}` : null,
            endpoint_url: inst.uri || site['@name'] || targetUrl,
            http_method: inst.method || 'GET',
            description: stripHtml(alert.desc || alert.description || ''),
            remediation: stripHtml(alert.solution || ''),
            references: splitRefs(alert.reference),
            evidence: {
              reachable: true,
              public: !isLocalOrPrivate(target),
              param: inst.param,
              evidence: inst.evidence,
              attack: inst.attack,
            },
            raw: { alert, instance: inst },
          })
        );
      }
    }
  }

  if (!result.ok && findings.length === 0) {
    logErr(`  Application scan exit: ${result.code} — ${result.stderr?.slice(0, 120) || ''}`);
  }

  return { name: 'dast', findings, error: null };
}

function hostNetworkArgs() {
  if (process.platform === 'linux') {
    // host network so localhost inside container = host localhost
    return ['--network', 'host'];
  }
  // Docker Desktop: host.docker.internal is built-in; add-host helps some setups
  return ['--add-host', 'host.docker.internal:host-gateway'];
}

export function rewriteTargetForDocker(url) {
  const u = typeof url === 'string' ? new URL(url) : new URL(url.href);
  const host = u.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    if (process.platform === 'linux') {
      // with --network host, localhost works as-is
      return u.toString();
    }
    u.hostname = 'host.docker.internal';
  }
  return u.toString();
}

export function isLocalOrPrivate(url) {
  const u = typeof url === 'string' ? new URL(url) : url;
  const h = u.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === 'host.docker.internal') return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
}

function buildAuthHeader(auth) {
  const type = (auth.type || '').toLowerCase();
  if (type === 'api_key' && auth.header && auth.value) {
    return { name: auth.header, value: auth.value };
  }
  if (type === 'bearer' && auth.token) {
    return { name: 'Authorization', value: `Bearer ${auth.token}` };
  }
  if (type === 'cookie' && auth.cookie) {
    return { name: 'Cookie', value: auth.cookie };
  }
  if (auth.header && auth.value) {
    return { name: auth.header, value: auth.value };
  }
  return null;
}

function zapRiskToSeverity(risk) {
  const n = Number(risk);
  if (!Number.isNaN(n)) {
    if (n >= 3) return 'high';
    if (n === 2) return 'medium';
    if (n === 1) return 'low';
    return 'info';
  }
  return normalizeSeverity(risk);
}

function zapConfidence(c) {
  const n = Number(c);
  if (n >= 3) return 'high';
  if (n === 2) return 'medium';
  if (n === 1) return 'low';
  return 'medium';
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitRefs(ref) {
  if (!ref) return [];
  return String(ref)
    .split(/<p>|<\/p>|\n/)
    .map((s) => stripHtml(s))
    .filter((s) => /^https?:\/\//.test(s));
}

function parseDuration(s) {
  const m = String(s).match(/^(\d+)\s*(m|min|minutes|s|sec|seconds|h)?$/i);
  if (!m) return 5 * 60 * 1000;
  const n = Number(m[1]);
  const u = (m[2] || 'm').toLowerCase();
  if (u.startsWith('h')) return n * 60 * 60 * 1000;
  if (u.startsWith('s')) return n * 1000;
  return n * 60 * 1000;
}
