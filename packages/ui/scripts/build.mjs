import { cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(packageRoot, '..', '..');
const dist = join(packageRoot, 'dist');

await rm(dist, { recursive: true, force: true });
const result = spawnSync(
  process.execPath,
  [
    resolve(root, 'node_modules/typescript/bin/tsc'),
    '--project',
    resolve(packageRoot, 'tsconfig.build.json'),
  ],
  { stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status ?? 1);

async function copyCss(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) await copyCss(source);
    else if (entry.name.endsWith('.css')) {
      const relative = source.slice(join(packageRoot, 'src').length + 1);
      await cp(source, join(dist, relative));
    }
  }
}

await copyCss(join(packageRoot, 'src'));
const cssFiles = [];
async function collectCss(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectCss(path);
    else if (entry.name.endsWith('.css') && !entry.name.endsWith('.module.css')) {
      cssFiles.push(path);
    }
  }
}
await collectCss(join(dist, 'src')).catch(() => {});
await collectCss(dist);
const uniqueCss = [...new Set(cssFiles)];
const contents = await Promise.all(uniqueCss.map((file) => readFile(file, 'utf8')));
await writeFile(
  join(dist, 'styles.css'),
  `/* Safe aggregate stylesheet. Component CSS Modules are emitted beside each component. */\n@layer forge-ui;\n${contents.join('\n')}`,
);
await writeFile(
  join(dist, 'styles.css.d.ts'),
  'declare const stylesheet: string;\nexport default stylesheet;\n',
);
