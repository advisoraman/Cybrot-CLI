const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const CONF_RANK = { confirmed: 4, high: 3, medium: 2, low: 1, possible: 0 };

/**
 * Simple V1 risk engine → deployment decision.
 */
export function scoreFinding(f) {
  const sev = SEV_RANK[f.severity] ?? 2;
  const conf = CONF_RANK[f.confidence] ?? 2;
  const reachable =
    f.source === 'dast' || f.evidence?.reachable === true || f.endpoint_url
      ? 1.25
      : 1.0;
  const publicExposure = f.evidence?.public === true ? 1.2 : 1.0;
  return sev * conf * reachable * publicExposure;
}

export function summarizeRisk(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let maxScore = 0;
  let top = null;

  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
    const s = scoreFinding(f);
    if (s > maxScore) {
      maxScore = s;
      top = f;
    }
  }

  let decision = 'SAFE_TO_DEPLOY';
  let label = 'SAFE TO DEPLOY';
  let overall = 'LOW';

  if (counts.critical > 0 || (counts.high > 0 && maxScore >= 9)) {
    decision = 'DO_NOT_DEPLOY';
    label = 'DO NOT DEPLOY';
    overall = 'CRITICAL';
  } else if (counts.high > 0 || counts.medium >= 5) {
    decision = 'ACTION_REQUIRED';
    label = 'NOT RECOMMENDED FOR DEPLOYMENT';
    overall = 'HIGH';
  } else if (counts.medium > 0 || counts.low > 0) {
    decision = 'REVIEW_REQUIRED';
    label = 'REVIEW REQUIRED';
    overall = 'MEDIUM';
  }

  return {
    decision,
    label,
    overall,
    counts,
    maxScore,
    topIssue: top,
    total: findings.length,
  };
}

export function gateFails(findings, failOn = 'high') {
  if (!failOn || failOn === 'none' || failOn === false) return false;
  const threshold = SEV_RANK[String(failOn).toLowerCase()] ?? 3;
  return findings.some((f) => (SEV_RANK[f.severity] ?? 0) >= threshold);
}

export function priorityFor(f) {
  if (f.severity === 'critical' || (f.severity === 'high' && f.confidence === 'high')) return 'FIX NOW';
  if (f.severity === 'high' || f.severity === 'medium') return 'FIX BEFORE RELEASE';
  if (f.severity === 'low') return 'PLAN FIX';
  return 'LOW PRIORITY';
}
