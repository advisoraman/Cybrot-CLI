import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  fail,
  log,
  loadUserConfig,
  resolveApi,
  resolveToken,
  CLI_VERSION,
} from '../util.js';
import { loadProjectConfig } from '../config/load.js';
import { detectProject } from '../detectors/project.js';
import { detectListeningTarget } from '../detectors/target.js';
import { runLocalScanners } from '../scanners/index.js';
import { summarizeRisk, gateFails } from '../risk/index.js';
import { printTerminalReport } from '../output/terminal.js';
import { buildScanPayload, printJsonReport } from '../output/json.js';
import { printSarif } from '../output/sarif.js';
import { uploadLocalResults } from '../cloud/ingest.js';
import { runCloudScan } from '../cloud/cloud-scan.js';
import { doctorDockerStatus, TOOLS_IMAGE } from '../scanners/docker-runner.js';

export async function cmdScan(flags, positional) {
  // Legacy / explicit cloud worker path
  if (flags.cloud === true || flags.mode === 'cloud') {
    const cfg = await loadUserConfig();
    const token = await resolveToken(flags, cfg);
    if (!token) fail('No token found. Run `cybrot login` first, or pass --token / CYBROT_TOKEN.');
    const api = flags.api || cfg.api || resolveApi(flags, cfg);
    return runCloudScan(api, token, flags, positional);
  }

  const cwd = path.resolve(positional[0] || '.');
  const st = await fs.stat(cwd).catch(() => null);
  if (!st || !st.isDirectory()) fail(`Path is not a directory: ${cwd}`);

  const { config } = await loadProjectConfig(cwd);
  const project = await detectProject(cwd);

  let target =
    flags.target ||
    (typeof flags.target === 'string' ? flags.target : null) ||
    config.application?.target ||
    null;

  // Auto-detect if still default/missing and DAST enabled
  const dastEnabled = flags.dast === true || (flags.dast !== false && config.scans?.dast !== false);
  if ((!target || target === 'http://localhost:3000') && dastEnabled && !flags['no-detect']) {
    const detected = await detectListeningTarget(project.expectedPort);
    if (detected) target = detected;
  }
  if (flags.target) target = flags.target;

  log('');
  log('🛡️  CYBROT');
  log('');
  if (project.framework || project.language) {
    log(`✓ ${project.framework || project.language} project detected`);
  }
  if (target) log(`✓ Application target: ${target}`);
  else log('✓ No running target detected (DAST may be skipped)');
  log('✓ Starting security engine');
  log('');

  const started = Date.now();
  const { findings, tools } = await runLocalScanners({
    workspaceDir: cwd,
    target,
    config,
    flags,
  });
  const durationMs = Date.now() - started;
  const risk = summarizeRisk(findings);

  const format = flags.format || config.output?.format || 'terminal';
  const payload = buildScanPayload({
    projectName: flags.name || config.project?.name || project.name,
    target,
    findings,
    risk,
    tools,
    durationMs,
    cliVersion: CLI_VERSION,
    config,
  });

  // Persist last local results for findings/verify commands
  const cacheDir = path.join(cwd, '.cybrot');
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(path.join(cacheDir, 'last-scan.json'), JSON.stringify(payload, null, 2));

  if (format === 'json') {
    printJsonReport(payload);
  } else if (format === 'sarif') {
    printSarif(findings, { version: CLI_VERSION });
  } else {
    printTerminalReport({
      projectName: payload.project,
      target,
      findings,
      risk,
      tools,
      durationMs,
    });
  }

  // Optional cloud upload
  const shouldUpload =
    flags.upload === true ||
    (flags.upload !== false && config.output?.upload_results === true && !flags['no-upload']);

  if (shouldUpload) {
    const cfg = await loadUserConfig();
    const token = await resolveToken(flags, cfg);
    if (!token) {
      log('⚠  Skipping cloud upload (not logged in). Run `cybrot login` or pass --no-upload.');
    } else {
      const api = flags.api || cfg.api || resolveApi(flags, cfg);
      log('Uploading results to Cybrot Cloud…');
      const up = await uploadLocalResults(api, token, {
        name: payload.project,
        target: target || 'local://workspace',
        findings,
        tools,
        risk,
        durationMs,
      });
      if (up.ok) {
        log(`✓ Uploaded → scan ${up.scanId}`);
        log(`  Dashboard: ${up.dashboardUrl}`);
        payload.cloud_scan_id = up.scanId;
        await fs.writeFile(path.join(cacheDir, 'last-scan.json'), JSON.stringify(payload, null, 2));
      } else {
        log(`⚠  Upload failed: ${up.error}`);
      }
    }
  }

  // CI gate
  const failOn = flags['fail-on'] || config.gate?.fail_on || 'high';
  if (gateFails(findings, failOn)) {
    fail(`Security gate failed (fail-on=${failOn}).`, 2);
  }
}

export async function cmdDoctor() {
  log('🛡️  CYBROT GATE DOCTOR\n');
  log(`✓ node: ${process.version}`);
  const st = await doctorDockerStatus();
  if (!st.docker) {
    log('✖ docker: not found (REQUIRED)');
    log('\nInstall Docker Desktop or Engine, then re-run `cybrot doctor`.\n');
    return;
  }
  log(`✓ docker: installed`);
  if (!st.daemon) {
    log('✖ docker daemon: not running (REQUIRED)');
    log('\nStart Docker, then re-run `cybrot doctor`.\n');
    return;
  }
  log('✓ docker daemon: running');
  if (st.toolsImage) log(`✓ tools image: ${st.toolsImage}`);
  else {
    log(`⚠ tools image: not pulled yet (${TOOLS_IMAGE})`);
    log('  First `cybrot scan` will pull it, or build:');
    log('  docker build -f cli/docker/Dockerfile.gate-tools -t cybrot/gate-tools:local .');
    log('  export CYBROT_TOOLS_IMAGE=cybrot/gate-tools:local');
  }
  if (st.zapImage) log('✓ runtime scanner image: ready');
  else log('⚠ runtime scanner image: not pulled yet — pulled on first application scan');
  log('\nRequired: Node 18+ and Docker. Scanners run inside Cybrot managed images.\n');
}
