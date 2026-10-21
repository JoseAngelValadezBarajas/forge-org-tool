import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const packageRoot = resolve(import.meta.dirname, '..');
const uiRoot = resolve(packageRoot, '..', 'ui');

async function cssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await cssFiles(path)));
    else if (entry.name.endsWith('.css')) files.push(path);
  }
  return files;
}

test('every shared UI token reference is emitted by the token package', async () => {
  const [tokenCss, files] = await Promise.all([
    readFile(join(packageRoot, 'src', 'tokens.css'), 'utf8'),
    cssFiles(join(uiRoot, 'src')),
  ]);
  const emitted = new Set(tokenCss.match(/--forge-[a-z0-9-]+(?=:)/g) ?? []);
  const referenced = new Set();
  for (const file of files) {
    const css = await readFile(file, 'utf8');
    for (const token of css.match(/--forge-[a-z0-9-]+/g) ?? []) referenced.add(token);
  }

  assert.deepEqual(
    [...referenced].filter((token) => !emitted.has(token)).sort(),
    [],
    'shared UI references an un-emitted design token',
  );
});
