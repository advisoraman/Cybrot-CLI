#!/usr/bin/env node
/**
 * Cybrot CLI — local security orchestrator + cloud upload.
 *
 *  cybrot login | logout
 *  cybrot init [--force]
 *  cybrot scan [path] [--target URL] [--sast|--dast|--secrets|--sca] [--cloud] …
 *  cybrot status <scanId>
 *  cybrot findings [id] [--scan <id>] [--explain]
 *  cybrot verify [path]
 *  cybrot doctor | seed
 */
import { parseArgs, fail, DEFAULT_API, CLI_VERSION, log } from '../src/util.js';
import { cmdLogin, cmdLogout } from '../src/commands/login.js';
import { cmdInit } from '../src/commands/init.js';
import { cmdScan, cmdDoctor } from '../src/commands/scan.js';
import { cmdStatus } from '../src/commands/status.js';
import { cmdFindings } from '../src/commands/findings.js';
import { cmdVerify } from '../src/commands/verify.js';
import { detectProject } from '../src/detectors/project.js';

const HELP = `cybrot — Cybrot Gate local security scanner (v${CLI_VERSION})

  Write → Scan → Decide → Fix → Verify → Deploy

Quick start:
  cybrot login
  cybrot init
  npm run dev          # terminal 1
  cybrot scan          # terminal 2 — Cybrot Gate (SAST/secrets/SCA/DAST)

Commands:
  cybrot login [--api <base>] [--email <e>] [--password <p>]
  cybrot logout
  cybrot init [--force]
      Detect project and write cybrot.yml

  cybrot scan [<path>] [options]
      Run local scanners (default). Options:
        --target <url>     Application URL (default from cybrot.yml / auto-detect)
        --sast|--secrets|--sca|--dependencies|--dast
                           Run only selected layer(s)
        --format terminal|json|sarif
        --fail-on critical|high|medium|low|none
        --upload / --no-upload
        --authorize        Confirm authorization for non-local targets
        --auth-bearer <t>  Authenticated DAST (Bearer token)
        --auth-cookie <c>  Authenticated DAST (Cookie header)
        --auth-header H:V  Authenticated DAST (custom header)
        --cloud            Legacy: upload source for cloud worker scan
        --tier quick|detailed   (cloud mode, or semgrep breadth)
        --watch            (cloud mode) poll until done
        --name <n>

  cybrot status <scan-id>
  cybrot findings [id] [--scan <cloud-scan-id>] [--explain]
  cybrot verify [<path>] [--target <url>]
      Re-scan and compare; mark fixed issues verified

  cybrot seed
      Print authenticated-DAST test-data checklist

  cybrot doctor
      Check local scanner prerequisites

API default: ${DEFAULT_API} (override with --api, CYBROT_API, or login)
`;

async function cmdSeed() {
  const project = await detectProject(process.cwd());
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
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const cmd = positional[0];

  if (flags.help || flags.h || !cmd) {
    process.stdout.write(HELP);
    return;
  }
  if (flags.version || flags.V) {
    process.stdout.write(`cybrot ${CLI_VERSION}\n`);
    return;
  }

  if (cmd === 'login') return cmdLogin(flags);
  if (cmd === 'logout') return cmdLogout();
  if (cmd === 'init') return cmdInit(flags, positional.slice(1));
  if (cmd === 'scan') return cmdScan(flags, positional.slice(1));
  if (cmd === 'status') return cmdStatus(flags, positional.slice(1));
  if (cmd === 'findings') return cmdFindings(flags, positional.slice(1));
  if (cmd === 'verify') return cmdVerify(flags, positional.slice(1));
  if (cmd === 'seed') return cmdSeed();
  if (cmd === 'doctor') return cmdDoctor();

  fail(`Unknown command "${cmd}". Run \`cybrot --help\` for usage.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => fail(err?.message || String(err)));
