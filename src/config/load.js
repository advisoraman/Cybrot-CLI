import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DEFAULT_CYBROT_YML, mergeConfig } from './defaults.js';

/**
 * Minimal YAML subset parser for cybrot.yml (no deps).
 * Supports: nested maps via indentation, booleans, numbers, quoted/unquoted strings.
 */
export function parseSimpleYaml(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const root = {};
  const stack = [{ indent: -1, obj: root }];

  for (let raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indent = raw.match(/^ */)[0].length;
    const line = raw.trim();
    const m = line.match(/^([^:#]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;

    if (val === '' || val === '|' || val === '>') {
      const child = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
      continue;
    }

    parent[key] = coerce(val);
  }
  return root;
}

function coerce(val) {
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  return val;
}

export function stringifySimpleYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out += `${pad}${k}:\n${stringifySimpleYaml(v, indent + 1)}`;
    } else if (typeof v === 'string') {
      const needsQuote = /[:#\n]/.test(v) || v === '';
      out += `${pad}${k}: ${needsQuote ? JSON.stringify(v) : v}\n`;
    } else {
      out += `${pad}${k}: ${v}\n`;
    }
  }
  return out;
}

export async function loadProjectConfig(cwd = process.cwd()) {
  const ymlPath = path.join(cwd, 'cybrot.yml');
  const yamlPath = path.join(cwd, 'cybrot.yaml');
  const jsonPath = path.join(cwd, 'cybrot.json');

  for (const p of [ymlPath, yamlPath]) {
    try {
      const text = await fs.readFile(p, 'utf8');
      return { path: p, config: mergeConfig(DEFAULT_CYBROT_YML, parseSimpleYaml(text)) };
    } catch {
      /* try next */
    }
  }
  try {
    const text = await fs.readFile(jsonPath, 'utf8');
    return { path: jsonPath, config: mergeConfig(DEFAULT_CYBROT_YML, JSON.parse(text)) };
  } catch {
    return { path: null, config: structuredClone(DEFAULT_CYBROT_YML) };
  }
}

export async function writeProjectConfig(cwd, config) {
  const p = path.join(cwd, 'cybrot.yml');
  const body = `# Cybrot local scanner configuration\n${stringifySimpleYaml(config)}`;
  await fs.writeFile(p, body, 'utf8');
  return p;
}
