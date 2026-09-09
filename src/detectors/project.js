import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Detect language/framework/package manager from common manifest files.
 */
export async function detectProject(cwd = process.cwd()) {
  const info = {
    language: null,
    framework: null,
    packageManager: null,
    startCommand: null,
    testCommand: null,
    expectedPort: null,
    openapi: null,
    authHints: [],
    name: path.basename(cwd),
  };

  const has = async (rel) => {
    try {
      await fs.access(path.join(cwd, rel));
      return true;
    } catch {
      return false;
    }
  };

  const readJson = async (rel) => {
    try {
      return JSON.parse(await fs.readFile(path.join(cwd, rel), 'utf8'));
    } catch {
      return null;
    }
  };

  if (await has('package.json')) {
    info.language = 'TypeScript/JavaScript';
    info.packageManager = (await has('pnpm-lock.yaml'))
      ? 'pnpm'
      : (await has('yarn.lock'))
        ? 'yarn'
        : (await has('bun.lockb'))
          ? 'bun'
          : 'npm';
    const pkg = await readJson('package.json');
    if (pkg?.name) info.name = pkg.name;
    const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
    if (deps.next) {
      info.framework = 'Next.js';
      info.expectedPort = 3000;
      info.startCommand = `${info.packageManager === 'npm' ? 'npm run' : info.packageManager} dev`;
    } else if (deps.nuxt || deps['nuxt3']) {
      info.framework = 'Nuxt';
      info.expectedPort = 3000;
    } else if (deps.react && deps.vite) {
      info.framework = 'React (Vite)';
      info.expectedPort = 5173;
      info.startCommand = `${info.packageManager === 'npm' ? 'npm run' : info.packageManager} dev`;
    } else if (deps.express || deps.fastify || deps.koa) {
      info.framework = deps.express ? 'Express' : deps.fastify ? 'Fastify' : 'Koa';
      info.expectedPort = 3000;
      info.startCommand = pkg?.scripts?.dev || pkg?.scripts?.start || 'node .';
    } else if (deps['@nestjs/core']) {
      info.framework = 'NestJS';
      info.expectedPort = 3000;
    }
    if (pkg?.scripts?.test) info.testCommand = `${info.packageManager === 'npm' ? 'npm test' : info.packageManager + ' test'}`;
    if (pkg?.scripts?.dev) info.startCommand = info.startCommand || `${info.packageManager === 'npm' ? 'npm run' : info.packageManager} dev`;
    // Auth hints from deps
    if (deps.jsonwebtoken || deps.jose || deps['@auth/core'] || deps['next-auth']) {
      info.authHints.push('JWT');
    }
    if (deps.passport || deps['express-session']) info.authHints.push('session');
  } else if (await has('requirements.txt') || (await has('pyproject.toml'))) {
    info.language = 'Python';
    info.packageManager = (await has('poetry.lock')) ? 'poetry' : 'pip';
    if (await has('manage.py')) {
      info.framework = 'Django';
      info.expectedPort = 8000;
      info.startCommand = 'python manage.py runserver';
    } else if (await fileContains(cwd, 'requirements.txt', 'flask') || (await fileContains(cwd, 'pyproject.toml', 'flask'))) {
      info.framework = 'Flask';
      info.expectedPort = 5000;
    } else if (await fileContains(cwd, 'requirements.txt', 'fastapi') || (await fileContains(cwd, 'pyproject.toml', 'fastapi'))) {
      info.framework = 'FastAPI';
      info.expectedPort = 8000;
      info.startCommand = 'uvicorn main:app --reload';
    }
  } else if (await has('go.mod')) {
    info.language = 'Go';
    info.packageManager = 'go';
    info.expectedPort = 8080;
  } else if (await has('pom.xml') || (await has('build.gradle')) || (await has('build.gradle.kts'))) {
    info.language = 'Java';
    info.packageManager = (await has('pom.xml')) ? 'maven' : 'gradle';
    info.expectedPort = 8080;
  } else if (await has('composer.json')) {
    info.language = 'PHP';
    info.packageManager = 'composer';
    info.expectedPort = 8000;
  } else if (await has('Cargo.toml')) {
    info.language = 'Rust';
    info.packageManager = 'cargo';
  }

  // OpenAPI discovery
  for (const candidate of [
    'openapi.json',
    'openapi.yaml',
    'openapi.yml',
    'swagger.json',
    'swagger.yaml',
    'docs/openapi.json',
    'api/openapi.yaml',
  ]) {
    if (await has(candidate)) {
      info.openapi = candidate;
      break;
    }
  }

  return info;
}

async function fileContains(cwd, rel, needle) {
  try {
    const text = await fs.readFile(path.join(cwd, rel), 'utf8');
    return text.toLowerCase().includes(needle.toLowerCase());
  } catch {
    return false;
  }
}
