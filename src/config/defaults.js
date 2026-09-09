export const DEFAULT_CYBROT_YML = {
  version: 1,
  project: {
    name: 'my-application',
  },
  application: {
    target: 'http://localhost:3000',
  },
  scans: {
    dast: true,
    sast: true,
    secrets: true,
    dependencies: true,
  },
  dast: {
    crawl: true,
    max_duration: '15m',
    authentication: {
      enabled: false,
      type: 'none', // none | api_key | bearer | cookie | form
    },
  },
  authentication: {
    enabled: false,
  },
  output: {
    format: 'terminal',
    upload_results: true,
  },
  gate: {
    fail_on: 'high', // critical | high | medium | low | none
  },
};

export function mergeConfig(base, overlay) {
  if (!overlay || typeof overlay !== 'object') return structuredClone(base);
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(overlay)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
      out[k] = mergeConfig(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
