import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const apiRoot = join(repositoryRoot, 'apps', 'api');
const webPackagePath = join(repositoryRoot, 'apps', 'web', 'package.json');
const requireFromWeb = createRequire(webPackagePath);

export function npmInvocation({
  npmCli = process.env.npm_execpath,
  platform = process.platform,
  comSpec = process.env.ComSpec ?? 'cmd.exe',
  args = [],
} = {}) {
  if (npmCli) return { command: process.execPath, args: [npmCli, ...args] };
  if (platform === 'win32') {
    return { command: comSpec, args: ['/d', '/s', '/c', `npm ${args.join(' ')}`] };
  }
  return { command: 'npm', args };
}

function runNpm(args, options) {
  const invocation = npmInvocation({ args });
  return spawnSync(invocation.command, invocation.args, options);
}

export function missingPrerequisites({ nodeMajor, pythonMajor, pythonMinor, npm, uv, chromium }) {
  const missing = [];
  if (nodeMajor !== 24) missing.push(`Node.js 24 is required (found ${nodeMajor ?? 'unknown'}).`);
  if (pythonMajor !== 3 || pythonMinor !== 12) {
    missing.push(
      `Python 3.12 is required for the API test environment (found ${pythonMajor ?? 'unknown'}.${pythonMinor ?? 'unknown'}).`,
    );
  }
  if (!npm) missing.push('npm is not available on PATH.');
  if (!uv) missing.push('uv is not available on PATH.');
  if (!chromium)
    missing.push('Playwright Chromium is not installed; run npx playwright install chromium.');
  return missing;
}

function commandAvailable(command, args) {
  const options = {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false,
  };
  const result = command === 'npm' ? runNpm(args, options) : spawnSync(command, args, options);
  return result.status === 0;
}

function getPythonVersion() {
  const result = spawnSync('uv', ['run', '--project', apiRoot, '--locked', 'python', '--version'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) return {};
  const match = `${result.stdout}\n${result.stderr}`.match(/Python\s+(\d+)\.(\d+)/i);
  return match ? { pythonMajor: Number(match[1]), pythonMinor: Number(match[2]) } : {};
}

function getPrerequisites() {
  const uv = commandAvailable('uv', ['--version']);
  const python = uv ? getPythonVersion() : {};
  let chromium = false;
  try {
    const { chromium: playwrightChromium } = requireFromWeb('@playwright/test');
    chromium = existsSync(playwrightChromium.executablePath());
  } catch {
    chromium = false;
  }
  return {
    nodeMajor: Number(process.versions.node.split('.')[0]),
    ...python,
    npm: commandAvailable('npm', ['--version']),
    uv,
    chromium,
  };
}

function runId() {
  return `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${process.pid}`;
}

function runAcceptance() {
  const id = runId();
  const outputDirectory = join(repositoryRoot, 'test-results', 'product-acceptance', `local-${id}`);
  const evidenceDirectory = join(outputDirectory, 'evidence');
  const reportPath = join(outputDirectory, 'acceptance-report.json');
  const playwrightReportPath = join(outputDirectory, 'playwright-results.json');
  const startedAt = new Date().toISOString();
  mkdirSync(evidenceDirectory, { recursive: true });

  const prerequisites = getPrerequisites();
  const missing = missingPrerequisites(prerequisites);
  let exitCode = missing.length > 0 ? 2 : 0;
  let status = missing.length > 0 ? 'BLOCKED' : 'PASS';

  if (missing.length > 0) {
    for (const item of missing) process.stderr.write(`Prerequisite missing: ${item}\n`);
  } else {
    process.stdout.write(
      'Starting the full Playwright acceptance suite; Playwright owns and stops its isolated servers.\n',
    );
    const result = runNpm(['run', 'test:e2e:full'], {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        FORGE_E2E_EVIDENCE_DIR: evidenceDirectory,
        FORGE_E2E_JSON_REPORT: playwrightReportPath,
      },
      stdio: 'inherit',
      shell: false,
    });
    exitCode = result.status ?? 1;
    status = exitCode === 0 ? 'PASS' : 'FAIL';
  }

  let playwrightResults = null;
  if (existsSync(playwrightReportPath)) {
    try {
      const result = JSON.parse(readFileSync(playwrightReportPath, 'utf8'));
      playwrightResults = {
        expected: result.stats?.expected ?? null,
        unexpected: result.stats?.unexpected ?? null,
        skipped: result.stats?.skipped ?? null,
        flaky: result.stats?.flaky ?? null,
      };
    } catch {
      status = 'FAIL';
      exitCode = exitCode || 1;
    }
  }

  const report = {
    schema_version: 1,
    status,
    command: 'npm run test:acceptance:local',
    suite_command: 'npm run test:e2e:full',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    exit_code: exitCode,
    prerequisites,
    missing_prerequisites: missing,
    playwright_results: playwrightResults,
    evidence_directory: relative(repositoryRoot, evidenceDirectory).replaceAll('\\', '/'),
    playwright_artifacts: 'test-results/product-acceptance/',
    cleanup:
      'Playwright globalTeardown removes only its marker-verified temporary fixture; Playwright stops owned servers.',
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(
    `Acceptance ${status}. Report: ${relative(repositoryRoot, reportPath).replaceAll('\\', '/')}\n`,
  );
  process.exitCode = exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runAcceptance();
}
