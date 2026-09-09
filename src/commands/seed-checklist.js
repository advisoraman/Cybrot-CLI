#!/usr/bin/env node
/**
 * Optional helper: print a recommended seed checklist for authenticated DAST.
 * Does not mutate databases — agents/apps should run their own seed scripts.
 *
 * Usage: node cli/src/commands/seed-checklist.js
 */
import { detectProject } from '../detectors/project.js';
import { log } from '../util.js';

const cwd = process.cwd();
const project = await detectProject(cwd);

log('🛡️  CYBROT DATA SEED CHECKLIST\n');
log(`Project: ${project.name} (${project.framework || project.language || 'unknown'})`);
log('');
log('Create dedicated TEST credentials only (never production).');
log('');
log('Minimum seed:');
log('  1. Test user account');
log('  2. Organization / tenant');
log('  3. One project / workspace');
log('  4. Sample records on primary API resources');
log('');
if (project.startCommand) log(`Start app: ${project.startCommand}`);
if (project.testCommand) log(`Run tests: ${project.testCommand}`);
log('');
log('Then configure auth for DAST:');
log('  cybrot scan --dast --target http://localhost:PORT \\');
log('    --auth-bearer "$TEST_TOKEN" --authorize');
log('');
