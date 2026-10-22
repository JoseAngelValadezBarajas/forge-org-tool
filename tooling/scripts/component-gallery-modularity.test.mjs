import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const gallery = path.join(root, 'apps/web/src/app/component-gallery');

test('Component Host delegates its route, category inventory, shell, and synthetic fixtures to owned modules', () => {
  const requiredModules = [
    'shell/ComponentGalleryShell.tsx',
    'catalog/types.ts',
    'catalog/foundations.tsx',
    'catalog/actions.tsx',
    'catalog/forms.tsx',
    'catalog/navigation.tsx',
    'catalog/surfaces-data.tsx',
    'catalog/feedback-overlays.tsx',
    'catalog/product-patterns.tsx',
    'catalog/icons.tsx',
    'catalog/parity-status.ts',
    'catalog/inventory.ts',
    'previews/fixtures.tsx',
    'previews/foundations.tsx',
    'previews/icons.tsx',
    'shell/ComponentGalleryLayout.tsx',
  ];

  assert.deepEqual(
    requiredModules.filter((file) => !existsSync(path.join(gallery, file))),
    [],
    'each Component Host responsibility should have an owned module',
  );

  const entry = readFileSync(path.join(gallery, 'ComponentGallery.tsx'), 'utf8');
  assert.ok(entry.split(/\r?\n/).length < 160, 'entry should remain a thin route component');
  const content = readFileSync(path.join(gallery, 'ComponentGalleryContent.tsx'), 'utf8');
  for (const module of [
    'catalog/inventory',
    'previews/fixtures',
    'previews/foundations',
    'previews/icons',
    'shell/ComponentGalleryLayout',
  ]) {
    assert.ok(content.includes(module), `host content should consume ${module}`);
  }
  const app = readFileSync(path.join(root, 'apps/web/src/app/App.tsx'), 'utf8');
  assert.doesNotMatch(app, /import\s+\{\s*ComponentGallery\s*\}\s+from/);
  assert.match(app, /import\.meta\.env\.DEV[\s\S]*?lazy\(/);
});
