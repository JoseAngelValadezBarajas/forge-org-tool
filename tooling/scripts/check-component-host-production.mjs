import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const assets = resolve(root, 'apps/web/dist/assets');
const bundleText = readdirSync(assets)
  .filter((file) => /\.(js|css)$/.test(file))
  .map((file) => readFileSync(resolve(assets, file), 'utf8'))
  .join('\n');

for (const forbidden of ['/__components', 'Component Host', 'host-epic', 'preview-only']) {
  assert.ok(!bundleText.includes(forbidden), 'production asset unexpectedly contains ' + forbidden);
}

console.log('Production Component Host route, UI, and synthetic fixture exclusion: PASS');
