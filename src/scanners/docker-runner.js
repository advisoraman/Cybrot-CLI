import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runCmd, which, log, fail } from '../util.js';

export const TOOLS_IMAGE =
  process.env.CYBROT_TOOLS_IMAGE || 'ghcr.io/advisoraman/cybrot-gate-tools:latest';

export const ZAP_IMAGE =
  process.env.CYBROT_ZAP_IMAGE || 'ghcr.io/zaproxy/zaproxy:stable';

/**
 * Docker is mandatory for Cybrot Gate local scans.
 */
export async function assertDocker() {
  const bin = await which('docker');
  if (!bin) {
    fail(
      'Docker is required for Cybrot Gate.\n' +
        '  Install Docker Desktop (or Engine), start it, then re-run.\n' +
        '  Check: cybrot doctor'
    );
  }
  const ping = await runCmd('docker', ['info'], { maxMs: 15_000 });
  if (!ping.ok) {
    fail(
      'Docker is installed but not reachable (is the daemon running?).\n' +
        `  ${ping.stderr?.slice(0, 200) || ping.error || ''}\n` +
        '  Check: cybrot doctor'
    );
  }
  return bin;
}

/**
 * Ensure image exists locally; pull if missing.
 */
export async function ensureImage(image, { pull = true } = {}) {
  const inspect = await runCmd('docker', ['image', 'inspect', image], { maxMs: 15_000 });
  if (inspect.ok) return { image, pulled: false };

  if (!pull) {
    fail(`Docker image not found: ${image}\n  Build or pull it, then retry.`);
  }

  log(`  Pulling ${image}…`);
  const pulled = await runCmd('docker', ['pull', image], {
    maxMs: 15 * 60 * 1000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (!pulled.ok) {
    if (
      image === TOOLS_IMAGE &&
      (image.includes('ghcr.io/advisoraman/cybrot-gate-tools') ||
        image.includes('ghcr.io/cybrot/gate-tools'))
    ) {
      const local = 'cybrot/gate-tools:local';
      const localOk = await runCmd('docker', ['image', 'inspect', local], { maxMs: 10_000 });
      if (localOk.ok) {
        log(`  Using local image ${local} (GHCR pull failed)`);
        return { image: local, pulled: false };
      }
    }
    fail(
      `Failed to pull Docker image: ${image}\n` +
        `  ${pulled.stderr?.slice(0, 300) || pulled.error || ''}\n` +
        '  Build locally: docker build -f docker/Dockerfile.gate-tools -t cybrot/gate-tools:local .\n' +
        '  Then: export CYBROT_TOOLS_IMAGE=cybrot/gate-tools:local'
    );
  }
  return { image, pulled: true };
}

/**
 * Run a command inside the Cybrot Gate tools image with workspace at /src
 * and writable .cybrot at /out for reports.
 */
export async function runInToolsContainer({
  workspaceDir,
  args,
  maxMs = 10 * 60 * 1000,
  image = TOOLS_IMAGE,
  workdir = '/src',
}) {
  await assertDocker();
  await fs.mkdir(path.join(workspaceDir, '.cybrot'), { recursive: true });
  const ensured = await ensureImage(image);
  const img = ensured.image;

  const dockerArgs = [
    'run',
    '--rm',
    '-v',
    `${workspaceDir}:${workdir}:ro`,
    '-v',
    `${path.join(workspaceDir, '.cybrot')}:/out:rw`,
    '-w',
    workdir,
    img,
    ...args,
  ];

  return runCmd('docker', dockerArgs, {
    maxMs,
    maxBuffer: 256 * 1024 * 1024,
  });
}

export async function doctorDockerStatus() {
  const dockerBin = await which('docker');
  if (!dockerBin) {
    return { docker: false, daemon: false, toolsImage: null, zapImage: null, message: 'docker not found' };
  }
  const info = await runCmd('docker', ['info'], { maxMs: 15_000 });
  if (!info.ok) {
    return { docker: true, daemon: false, toolsImage: null, zapImage: null, message: 'daemon not running' };
  }
  const tools = await runCmd('docker', ['image', 'inspect', TOOLS_IMAGE], { maxMs: 10_000 });
  const local = await runCmd('docker', ['image', 'inspect', 'cybrot/gate-tools:local'], { maxMs: 10_000 });
  const zap = await runCmd('docker', ['image', 'inspect', ZAP_IMAGE], { maxMs: 10_000 });
  return {
    docker: true,
    daemon: true,
    toolsImage: tools.ok ? TOOLS_IMAGE : local.ok ? 'cybrot/gate-tools:local' : null,
    zapImage: zap.ok ? ZAP_IMAGE : null,
    message: 'ok',
  };
}
