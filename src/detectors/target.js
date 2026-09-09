import { execFileP } from '../util.js';

/**
 * Try to find a listening local HTTP port suitable as a scan target.
 */
export async function detectListeningTarget(preferredPort = null) {
  if (preferredPort) {
    const url = `http://localhost:${preferredPort}`;
    if (await probe(url)) return url;
  }

  const candidates = [3000, 5173, 8080, 8000, 5000, 4200, 4000, 3001];
  for (const port of candidates) {
    const url = `http://localhost:${port}`;
    if (await probe(url)) return url;
  }

  // lsof fallback (macOS/Linux)
  try {
    const { stdout } = await execFileP('lsof', ['-iTCP', '-sTCP:LISTEN', '-P', '-n'], {
      timeout: 5000,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    });
    const ports = new Set();
    for (const line of stdout.split('\n')) {
      const m = line.match(/:(\d+)\s+\(LISTEN\)/);
      if (m) ports.add(Number(m[1]));
    }
    for (const port of [...ports].sort((a, b) => a - b)) {
      if (port < 1024) continue;
      const url = `http://localhost:${port}`;
      if (await probe(url)) return url;
    }
  } catch {
    /* ignore */
  }

  return null;
}

async function probe(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 800);
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal, redirect: 'manual' });
    clearTimeout(t);
    return res.status > 0;
  } catch {
    return false;
  }
}
