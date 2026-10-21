import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
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

test('packed UI, tokens, and API client work in an external React consumer', () => {
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
    `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport { Button, FormField, Input } from '@forge-org/ui';\nimport '@forge-org/tokens/tokens.css';\nimport { organizationApi } from '@forge-org/api-client';\nvoid organizationApi.listWorkspaces;\ncreateRoot(document.getElementById('root')!).render(<FormField label="Name"><Input /></FormField>);\nexport function ConsumerButton() { return <Button onClick={() => undefined}>Save</Button>; }\n`,
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
  run(npm, ['run', 'typecheck'], consumer);
  run(npm, ['run', 'build'], consumer);

  assert.equal(existsSync(join(consumer, 'node_modules/@forge-org/ui/dist/index.js')), true);
  assert.equal(existsSync(join(consumer, 'node_modules/@forge-org/ui/dist/styles.css')), true);
  assert.equal(existsSync(join(consumer, 'node_modules/@forge-org/tokens/dist/tokens.css')), true);
  assert.equal(existsSync(join(consumer, 'node_modules/react')), true);
  assert.equal(existsSync(join(consumer, 'node_modules/@forge-org/ui/node_modules/react')), false);
  assert.equal(readFileSync(join(consumer, 'dist/index.html'), 'utf8').includes('root'), true);
});
