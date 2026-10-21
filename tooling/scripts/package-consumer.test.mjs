import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import test from 'node:test';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '../..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, cwd) {
  const result =
    process.platform === 'win32'
      ? spawnSync(
          process.env.ComSpec ?? 'cmd.exe',
          ['/d', '/s', '/c', [command, ...args].join(' ')],
          { cwd, encoding: 'utf8', stdio: 'pipe' },
        )
      : spawnSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')}\n${result.error ?? ''}\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

function pack(packageDirectory, destination) {
  const output = run(
    npm,
    ['pack', '--silent', '--pack-destination', destination],
    packageDirectory,
  );
  return join(destination, output.trim().split(/\r?\n/).at(-1));
}

test('packed UI, tokens, and API client work in an external React consumer', async () => {
  const consumer = mkdtempSync(join(tmpdir(), 'forge-package-consumer-'));
  const artifacts = join(consumer, 'artifacts');
  const ui = resolve(root, 'packages/ui');
  const tokens = resolve(root, 'packages/tokens');
  const apiClient = resolve(root, 'packages/api-client');
  run(npm, ['run', 'build', '--workspace=@forge-org/tokens'], root);
  run(npm, ['run', 'build', '--workspace=@forge-org/ui'], root);
  run(npm, ['run', 'build', '--workspace=@forge-org/api-client'], root);
  mkdirSync(artifacts, { recursive: true });
  const uiTar = pack(ui, artifacts);
  const tokensTar = pack(tokens, artifacts);
  const apiTar = pack(apiClient, artifacts);

  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify(
      {
        name: 'forge-external-consumer',
        private: true,
        type: 'module',
        scripts: { build: 'vite build', typecheck: 'tsc --noEmit' },
        dependencies: {
          '@forge-org/api-client': `file:${apiTar}`,
          '@forge-org/tokens': `file:${tokensTar}`,
          '@forge-org/ui': `file:${uiTar}`,
          '@vitejs/plugin-react': '^6.1.2',
          react: '^19.3.0',
          'react-dom': '^19.3.0',
          vite: '^8.3.4',
        },
        devDependencies: {
          '@types/react': '^19.2.0',
          '@types/react-dom': '^19.2.0',
          typescript: '^6.0.3',
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(consumer, 'index.html'),
    '<div id="root"></div><script type="module" src="/src/main.tsx"></script>',
  );
  mkdirSync(join(consumer, 'src'), { recursive: true });
  writeFileSync(
    join(consumer, 'src/main.tsx'),
    `import { useState } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { Button, FormField, Input } from '@forge-org/ui';\nimport '@forge-org/tokens/tokens.css';\nimport '@forge-org/ui/styles.css';\nimport { organizationApi } from '@forge-org/api-client';\nvoid organizationApi.listWorkspaces;\nfunction Consumer() {\n  const [count, setCount] = useState(0);\n  const [theme, setTheme] = useState<'dark' | 'light'>('dark');\n  return <main data-theme={theme}><button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Theme</button><div className="button" data-testid="host-class">Host class</div><FormField label="Name"><Input /></FormField><Button onClick={() => setCount(count + 1)}>Save {count}</Button></main>;\n}\ncreateRoot(document.getElementById('root')!).render(<Consumer />);\n`,
  );
  writeFileSync(
    join(consumer, 'vite.config.ts'),
    `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n`,
  );
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          jsx: 'react-jsx',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2,
    ),
  );
  run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
  const installedUi = join(consumer, 'node_modules/@forge-org/ui');
  const installedUiPackage = JSON.parse(readFileSync(join(installedUi, 'package.json'), 'utf8'));
  assert.equal(installedUiPackage.name, '@forge-org/ui');
  assert.equal(existsSync(join(installedUi, 'dist/index.js')), true);
  assert.equal(existsSync(join(installedUi, 'dist/styles.css')), true);
  const packedAggregate = readFileSync(join(installedUi, 'dist/styles.css'), 'utf8');
  for (const selector of ['.button', '.control', '.card', '.state']) {
    assert.doesNotMatch(packedAggregate, new RegExp(`\\.${selector.slice(1)}(?=[\\s,{:#>+~.])`));
  }
  run(npm, ['run', 'typecheck'], consumer);
  run(npm, ['run', 'build'], consumer);

  const port = 4173 + Math.floor(Math.random() * 300);
  const server =
    process.platform === 'win32'
      ? spawn(
          process.env.ComSpec ?? 'cmd.exe',
          ['/d', '/s', '/c', `npm exec -- vite --host 127.0.0.1 --port ${port}`],
          { cwd: consumer, stdio: 'ignore' },
        )
      : spawn('npm', ['exec', '--', 'vite', '--host', '127.0.0.1', '--port', String(port)], {
          cwd: consumer,
          stdio: 'ignore',
        });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await globalThis.fetch(`http://127.0.0.1:${port}`);
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        await new Promise((resolve) => globalThis.setTimeout(resolve, 200));
      }
    }
    assert.equal(ready, true, 'external Vite consumer did not start');
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${port}`);
      assert.equal(await page.getByLabel('Name').isVisible(), true);
      assert.equal(
        await page
          .getByTestId('host-class')
          .evaluate((element) => getComputedStyle(element).minHeight),
        '0px',
      );
      assert.notEqual(
        await page.getByRole('button', { name: 'Save 0' }).getAttribute('class'),
        'button',
      );
      await page.getByRole('button', { name: 'Save 0' }).click();
      assert.equal(await page.getByRole('button', { name: 'Save 1' }).isVisible(), true);
      const before = await page
        .getByLabel('Name')
        .evaluate((element) => globalThis.getComputedStyle(element).backgroundColor);
      await page.getByRole('button', { name: 'Theme' }).click();
      assert.equal(await page.locator('main').getAttribute('data-theme'), 'light');
      const after = await page
        .getByLabel('Name')
        .evaluate((element) => globalThis.getComputedStyle(element).backgroundColor);
      assert.notEqual(before, after);
    } finally {
      await browser.close();
    }
  } finally {
    if (process.platform === 'win32') {
      spawnSync('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      server.kill();
    }
  }

  assert.equal(existsSync(join(consumer, 'node_modules/@forge-org/ui/dist/index.js')), true);
  assert.equal(existsSync(join(consumer, 'node_modules/@forge-org/ui/dist/styles.css')), true);
  assert.equal(existsSync(join(consumer, 'node_modules/@forge-org/tokens/dist/tokens.css')), true);
  assert.equal(existsSync(join(consumer, 'node_modules/react')), true);
  assert.equal(existsSync(join(consumer, 'node_modules/@forge-org/ui/node_modules/react')), false);
  assert.equal(readFileSync(join(consumer, 'dist/index.html'), 'utf8').includes('root'), true);
});
