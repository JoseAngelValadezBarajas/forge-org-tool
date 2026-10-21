import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('emitted tokens cover every static CSS reference', () => {
  const css = readFileSync(resolve('packages/tokens/src/tokens.css'), 'utf8');
  const references = [
    ...readFileSync('packages/ui/src/primitives/Shared.module.css', 'utf8').matchAll(
      /var\((--forge-[\w-]+)/g,
    ),
  ].map((match) => match[1]);
  const declared = new Set([...css.matchAll(/(--forge-[\w-]+)\s*:/g)].map((match) => match[1]));
  assert.ok(references.length > 0);
  assert.deepEqual(
    references.filter((token) => !declared.has(token)),
    [],
  );
});
