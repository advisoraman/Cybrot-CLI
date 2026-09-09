import { runSast } from './sast.js';
import { runSecrets } from './secrets.js';
import { runSca } from './sca.js';
import { runDast } from './dast.js';
import { normalizeBatch } from '../normalizer/index.js';
import { log } from '../util.js';
import { assertDocker, ensureImage, TOOLS_IMAGE, ZAP_IMAGE } from './docker-runner.js';

/**
 * Orchestrate enabled scanners and return normalized findings + tool summaries.
 * Docker is mandatory — tools run inside cybrot/gate-tools (+ ZAP for DAST).
 */
export async function runLocalScanners({
  workspaceDir,
  target,
  config,
  flags = {},
}) {
  const scans = config.scans || {};
  const want = {
    sast: flags.sast === true || (flags.sast !== false && scans.sast !== false && !onlyOne(flags)),
    secrets: flags.secrets === true || (flags.secrets !== false && scans.secrets !== false && !onlyOne(flags)),
    sca:
      flags.sca === true ||
      flags.dependencies === true ||
      (flags.sca !== false &&
        flags.dependencies !== false &&
        scans.dependencies !== false &&
        !onlyOne(flags)),
    dast: flags.dast === true || (flags.dast !== false && scans.dast !== false && !onlyOne(flags)),
  };

  if (onlyOne(flags)) {
    want.sast = !!flags.sast;
    want.secrets = !!flags.secrets;
    want.sca = !!(flags.sca || flags.dependencies);
    want.dast = !!flags.dast;
  }

  await assertDocker();
  const needsTools = want.sast || want.secrets || want.sca;
  if (needsTools) {
    log('✓ Docker ready — ensuring scanner image');
    await ensureImage(TOOLS_IMAGE);
  }
  if (want.dast && target) {
    await ensureImage(ZAP_IMAGE);
  }

  const tools = [];
  const all = [];
  const tier = flags.tier === 'detailed' ? 'detailed' : 'quick';

  if (want.sast) {
    log('✓ Running source analysis (SAST)');
    const r = await runSast(workspaceDir, { tier });
    tools.push(toolSummary(r));
    all.push(...(r.findings || []));
  }

  if (want.secrets) {
    log('✓ Checking secrets');
    const r = await runSecrets(workspaceDir);
    tools.push(toolSummary(r));
    all.push(...(r.findings || []));
  }

  if (want.sca) {
    log('✓ Checking dependencies (SCA)');
    const r = await runSca(workspaceDir);
    tools.push(toolSummary(r));
    all.push(...(r.findings || []));
  }

  if (want.dast) {
    if (!target) {
      tools.push({
        name: 'dast/zap',
        findings: 0,
        error: 'No target URL (pass --target or set application.target)',
      });
    } else {
      log('✓ Testing running application (DAST)');
      const auth = {
        ...(config.dast?.authentication || {}),
        ...(config.authentication || {}),
        ...(flags['auth-header']
          ? {
              enabled: true,
              header: String(flags['auth-header']).split(':')[0],
              value: String(flags['auth-header']).split(':').slice(1).join(':').trim(),
              type: 'api_key',
            }
          : {}),
        ...(flags['auth-bearer']
          ? { enabled: true, type: 'bearer', token: flags['auth-bearer'] }
          : {}),
        ...(flags['auth-cookie']
          ? { enabled: true, type: 'cookie', cookie: flags['auth-cookie'] }
          : {}),
      };
      const r = await runDast(target, {
        maxDuration: config.dast?.max_duration || flags['max-duration'] || '5m',
        authorized: flags.authorize === true || flags.authorized === true || isLocalTarget(target),
        authentication: auth,
      });
      tools.push(toolSummary(r));
      all.push(...(r.findings || []));
    }
  }

  return { findings: normalizeBatch(all), tools };
}

function onlyOne(flags) {
  return !!(flags.sast || flags.secrets || flags.sca || flags.dependencies || flags.dast);
}

function toolSummary(r) {
  return {
    name: r.name,
    findings: (r.findings || []).length,
    error: r.error || null,
    skipped: !!r.skipped,
  };
}

function isLocalTarget(target) {
  try {
    const u = new URL(target);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1';
  } catch {
    return false;
  }
}
