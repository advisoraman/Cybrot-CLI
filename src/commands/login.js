import readline from 'node:readline/promises';
import { fail, log, loadUserConfig, saveUserConfig, resolveApi, CONFIG_FILE } from '../util.js';
import { apiCall } from '../cloud/client.js';

export async function cmdLogin(flags) {
  const api = resolveApi(flags);
  let email = flags.email;
  let password = flags.password;

  const interactive = !email || !password;
  const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null;

  if (!email) email = (await rl.question('Email: ')).trim();
  if (!password) password = await rl.question('Password: ');
  if (rl) rl.close();
  if (!email) fail('Email is required.');
  if (!password) fail('Password is required.');

  const { status, data } = await apiCall(api, null, 'POST', '/api/auth/login', {
    json: { email, password },
  });
  if (status !== 200 || !data?.token) {
    fail(`Login failed (HTTP ${status}): ${data?.error || 'unexpected response'}`);
  }

  await saveUserConfig({ api, token: data.token, email, loginAt: new Date().toISOString() });
  log(`\n✓ Logged in as ${email}`);
  log(`  API base: ${api}`);
  log(`  Token saved to ${CONFIG_FILE}\n`);
}

export async function cmdLogout() {
  const cfg = await loadUserConfig();
  delete cfg.token;
  delete cfg.email;
  delete cfg.loginAt;
  await saveUserConfig(cfg);
  log('✓ Logged out (token cleared).');
}
