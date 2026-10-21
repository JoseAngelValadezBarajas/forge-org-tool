import { cp, mkdir, readdir, rm } from 'node:fs/promises';
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
    join(packageRoot, 'tsconfig.build.json'),
  ],
  { stdio: 'inherit' },
);
if (result.status !== 0) process.exit(result.status ?? 1);

async function copyStyles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) await copyStyles(source);
    else if (entry.name.endsWith('.module.css')) {
      const relative = source.slice(join(packageRoot, 'src').length + 1);
      const destination = join(dist, relative);
      await mkdir(dirname(destination), { recursive: true });
      await cp(source, destination);
    }
  }
}

await copyStyles(join(packageRoot, 'src'));
