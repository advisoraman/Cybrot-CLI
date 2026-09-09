import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const execFileP = promisify(execFile);

export const CONFIG_DIR = path.join(homedir(), '.cybrot');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export const DEFAULT_API = 'http://localhost:3000';
export const CLI_VERSION = '2.0.0';

export function fail(msg, code = 1) {
  process.stderr.write(`\n✖ ${msg}\n`);
  process.exit(code);
}

export function log(...args) {
  process.stdout.write(args.join(' ') + '\n');
}

export function logErr(...args) {
  process.stderr.write(args.join(' ') + '\n');
}

/** Hand-rolled flag parser — zero deps. */
export function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') && a.includes('=')) {
      const [k, v] = a.slice(2).split(/=(.*)/s);
      flags[k] = v;
    } else if (a.startsWith('--')) {
      const k = a.slice(2);
      flags[k] = i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

export async function loadUserConfig() {
  try {
    return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export async function saveUserConfig(cfg) {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

export function resolveApi(flags, cfg = {}) {
  return flags.api || process.env.CYBROT_API || cfg.api || DEFAULT_API;
}

export async function resolveToken(flags, cfg = {}) {
  return flags.token || process.env.CYBROT_TOKEN || cfg.token || null;
}

export async function which(bin) {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const { stdout } = await execFileP(cmd, [bin]);
    return stdout.trim().split('\n')[0] || null;
  } catch {
    return null;
  }
}

export async function runCmd(bin, args, opts = {}) {
  const { maxMs = 10 * 60 * 1000, cwd, env, maxBuffer = 64 * 1024 * 1024 } = opts;
  try {
    const result = await execFileP(bin, args, {
      cwd,
      env: { ...process.env, ...env },
      maxBuffer,
      timeout: maxMs,
      encoding: 'utf8',
    });
    return { ok: true, stdout: result.stdout || '', stderr: result.stderr || '', code: 0 };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || '',
      code: typeof err.code === 'number' ? err.code : 1,
      error: err.message,
    };
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
