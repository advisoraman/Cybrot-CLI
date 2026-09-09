import path from 'node:path';
import { log } from '../util.js';
import { detectProject } from '../detectors/project.js';
import { detectListeningTarget } from '../detectors/target.js';
import { DEFAULT_CYBROT_YML, mergeConfig } from '../config/defaults.js';
import { writeProjectConfig, loadProjectConfig } from '../config/load.js';

export async function cmdInit(flags, positional) {
  const cwd = path.resolve(positional[0] || '.');
  const existing = await loadProjectConfig(cwd);
  if (existing.path && !flags.force) {
    log(`cybrot.yml already exists at ${existing.path}`);
    log('Pass --force to overwrite.');
    return;
  }

  log('🛡️  CYBROT INIT\n');
  const project = await detectProject(cwd);
  const target =
    (await detectListeningTarget(project.expectedPort)) ||
    (project.expectedPort ? `http://localhost:${project.expectedPort}` : 'http://localhost:3000');

  log(`✓ Language: ${project.language || 'unknown'}`);
  log(`✓ Framework: ${project.framework || 'unknown'}`);
  log(`✓ Package manager: ${project.packageManager || 'unknown'}`);
  log(`✓ Development command: ${project.startCommand || 'n/a'}`);
  log(`✓ Expected port: ${project.expectedPort || 'n/a'}`);
  log(`✓ Detected target: ${target}`);
  log(`✓ OpenAPI: ${project.openapi || 'Not found'}`);
  log(`✓ Authentication: ${project.authHints.length ? project.authHints.join(', ') + ' detected' : 'none detected'}`);

  const config = mergeConfig(DEFAULT_CYBROT_YML, {
    project: { name: project.name || path.basename(cwd) },
    application: { target },
    authentication: {
      enabled: project.authHints.length > 0,
    },
  });

  const out = await writeProjectConfig(cwd, config);
  log(`\n✓ Wrote ${out}`);
  log('Next: start your app, then run `cybrot scan`\n');
}
