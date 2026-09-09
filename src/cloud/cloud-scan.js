import { promises as fs, createReadStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import path from 'node:path';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { execFileP, fail, log, sleep } from '../util.js';
import { apiCall } from './client.js';

const MAX_PACK_BYTES = 90 * 1024 * 1024;

const DEFAULT_EXCLUDES = new Set([
  '.git', 'node_modules', 'dist', 'build', '.next', '.cache', '.nuxt', '.output', '.turbo',
  'coverage', '.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache',
  'target', '.terraform', '.vscode', '.idea', '.DS_Store',
]);
const EXCLUDE_SUFFIXES = ['.log', '.tmp', '.tgz', '.tar.gz', '.zip', '.7z'];

function shouldExclude(rel) {
  const segs = rel.split('/');
  if (segs.some((s) => DEFAULT_EXCLUDES.has(s))) return true;
  const lower = rel.toLowerCase();
  return EXCLUDE_SUFFIXES.some((s) => lower.endsWith(s));
}

async function isGitRepo(dir) {
  try {
    await execFileP('git', ['rev-parse', '--is-inside-work-tree'], { cwd: dir });
    return true;
  } catch {
    return false;
  }
}

async function gitFileList(target) {
  const top = (await execFileP('git', ['rev-parse', '--show-toplevel'], { cwd: target })).stdout.trim();
  const relTop = path.relative(top, target) || '';
  const { stdout } = await execFileP('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
    cwd: top,
    maxBuffer: 64 * 1024 * 1024,
  });
  const files = [];
  for (const rel of stdout.split('\0')) {
    if (!rel) continue;
    const inTarget = relTop ? rel.startsWith(relTop + '/') || rel === relTop : true;
    if (!inTarget) continue;
    const sub = relTop ? rel.slice(relTop.length + 1) : rel;
    const abs = path.join(target, sub);
    try {
      const s = await fs.lstat(abs);
      if (s.isFile()) files.push(sub.replace(/\\/g, '/'));
    } catch {
      /* skip */
    }
  }
  return files.sort();
}

async function walkFileList(dir) {
  const files = [];
  async function walk(d, prefix) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (shouldExclude(rel)) continue;
      const abs = path.join(d, e.name);
      if (e.isDirectory()) await walk(abs, rel);
      else if (e.isFile()) files.push(rel.replace(/\\/g, '/'));
    }
  }
  await walk(dir, '');
  return files.sort();
}

function ustarHeader({ name, size, mtime, type = '0' }) {
  const buf = Buffer.alloc(512);
  const octal = (v, off, len) => {
    const s = v.toString(8).padStart(len - 2, '0') + ' \0';
    buf.write(s, off, len, 'ascii');
  };
  buf.write(name.slice(0, 100), 0, 100, 'utf8');
  buf.write('0000644', 100, 8, 'ascii');
  buf.write('0000000', 108, 8, 'ascii');
  buf.write('0000000', 116, 8, 'ascii');
  octal(size, 124, 12);
  octal(mtime, 136, 12);
  buf.write('        ', 148, 8, 'ascii');
  buf.write(type, 156, 1, 'ascii');
  buf.write('ustar', 257, 5, 'ascii');
  buf.write('\0', 262, 1, 'ascii');
  buf.write('00', 263, 2, 'ascii');
  buf.write('0000000', 329, 8, 'ascii');
  buf.write('0000000', 337, 8, 'ascii');
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += buf[i];
  buf.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  return buf;
}

function pad512(buf) {
  const rem = 512 - (buf.length % 512);
  return rem === 512 ? buf : Buffer.concat([buf, Buffer.alloc(rem)]);
}

function* tarFileEntries(name, size, mtime) {
  const nameBytes = Buffer.from(name, 'utf8');
  if (nameBytes.length > 100) {
    const payload = Buffer.alloc(nameBytes.length + 1);
    nameBytes.copy(payload);
    yield ustarHeader({ name: '././@LongLink', size: payload.length, mtime, type: 'L' });
    yield pad512(payload);
  }
  yield ustarHeader({ name, size, mtime, type: '0' });
}

function buildArchiveStream(dir, files) {
  return Readable.from(
    (async function* () {
      for (const rel of files) {
        const abs = path.join(dir, rel);
        let st;
        try {
          st = await fs.stat(abs);
        } catch {
          continue;
        }
        if (!st.isFile()) continue;
        const mtime = Math.floor(st.mtimeMs / 1000) || 0;
        yield* tarFileEntries(rel, st.size, mtime);
        if (st.size > 0) {
          for await (const chunk of createReadStream(abs)) yield chunk;
          if (st.size % 512) yield Buffer.alloc(512 - (st.size % 512));
        }
      }
      yield Buffer.alloc(1024);
    })()
  ).pipe(createGzip());
}

/**
 * Legacy cloud path: pack source, upload, enqueue remote worker scan.
 */
export async function runCloudScan(api, token, flags, positional) {
  const target = path.resolve(positional[0] || '.');
  const st = await fs.stat(target).catch(() => null);
  if (!st || !st.isDirectory()) fail(`Path is not a directory: ${target}`);

  const files = (await isGitRepo(target)) ? await gitFileList(target) : await walkFileList(target);
  if (files.length === 0) fail('No files to pack (empty or fully ignored directory?).');

  let totalBytes = 0;
  for (const rel of files) {
    try {
      totalBytes += (await fs.stat(path.join(target, rel))).size;
    } catch {
      /* skip */
    }
    if (totalBytes > MAX_PACK_BYTES) {
      fail(
        `Packed source exceeds ${Math.round(MAX_PACK_BYTES / 1024 / 1024)} MB. ` +
          `Add heavy directories to .gitignore and retry.`
      );
    }
  }

  const tier = ['quick', 'detailed'].includes(flags.tier) ? flags.tier : 'quick';
  const name = flags.name || path.basename(target);
  log(`Packaging ${files.length} files (${Math.round(totalBytes / 1024)} KB) from ${target} …`);

  const up = await apiCall(api, token, 'POST', '/api/scans/upload', {
    rawBody: buildArchiveStream(target, files),
    headers: {
      'content-type': 'application/octet-stream',
      'x-filename': `${crypto.randomUUID()}.tar.gz`,
    },
  });
  if (up.status !== 201 || !up.data?.ref) {
    fail(`Upload failed (HTTP ${up.status}): ${up.data?.error || 'unexpected response'}`);
  }
  log(`✓ Uploaded ${up.data.size} bytes → ref ${String(up.data.ref).slice(0, 8)}…`);

  const sc = await apiCall(api, token, 'POST', '/api/scans', {
    json: {
      scan_type: 'sast',
      source_type: 'upload',
      source_url: up.data.ref,
      tier,
      name,
      authorized: true,
      ...(flags.branch ? { branch: flags.branch } : {}),
    },
  });
  if (sc.status !== 201 || !sc.data?.scan_id) {
    fail(`Scan submission failed (HTTP ${sc.status}): ${sc.data?.error || 'unexpected response'}`);
  }

  const scanId = sc.data.scan_id;
  log(`✓ Cloud scan submitted: ${scanId}`);
  log(`  Name: ${name}  |  Tier: ${tier}`);
  log(`  Dashboard: ${api}/scans/${scanId}`);

  if (flags.watch) await watchScan(api, token, scanId);
  return scanId;
}

export async function watchScan(api, token, scanId) {
  let lastStatus = null;
  let lastCount = -1;
  for (;;) {
    const { status, data } = await apiCall(api, token, 'GET', `/api/scans/${scanId}`);
    if (status !== 200 || !data) {
      log(`\n⚠  Could not read status (HTTP ${status}); run \`cybrot status ${scanId}\` to re-check.`);
      return;
    }
    const count = data.findings_count ?? (Array.isArray(data.findings) ? data.findings.length : null);
    if (data.status !== lastStatus || (count !== null && count !== lastCount)) {
      const dur = data.execution_time_ms ? ` — ${Math.round(data.execution_time_ms / 1000)}s` : '';
      log(`  [${data.status}]${count !== null ? ` — ${count} finding${count === 1 ? '' : 's'}` : ''}${dur}`);
      lastStatus = data.status;
      lastCount = count;
    }
    if (['complete', 'completed', 'failed', 'cancelled'].includes(data.status)) {
      log(`\n✓ Scan ${data.status}. Findings: ${api}/scans/${scanId}`);
      return;
    }
    await sleep(3000);
  }
}
