import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function cssFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.isFile() && entry.name.endsWith('.css') ? [path] : [];
  });
}

test('emitted tokens cover every static CSS reference', () => {
  const css = readFileSync(resolve('packages/tokens/src/tokens.css'), 'utf8');
  const references = cssFiles(resolve('packages/ui/src')).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/var\((--forge-[\w-]+)/g)].map((match) => match[1]),
  );
  const declared = new Set([...css.matchAll(/(--forge-[\w-]+)\s*:/g)].map((match) => match[1]));
  assert.ok(references.length > 0);
  assert.deepEqual(
    references.filter((token) => !declared.has(token)),
    [],
  );
});
