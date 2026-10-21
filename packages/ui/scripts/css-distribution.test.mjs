import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const packageRoot = resolve(import.meta.dirname, '..');
const dist = resolve(packageRoot, 'dist');

function cssModuleFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return cssModuleFiles(path);
    return entry.name.endsWith('.module.css') ? [path] : [];
  });
}

test('aggregate UI CSS does not leak CSS Module selectors globally', () => {
  const aggregate = readFileSync(resolve(dist, 'styles.css'), 'utf8');

  const moduleFiles = cssModuleFiles(dist);
  assert.ok(moduleFiles.length > 0);
  const selectors = new Set(
    moduleFiles.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)].map(
        (match) => match[1],
      ),
    ),
  );
  for (const selector of selectors) {
    assert.doesNotMatch(aggregate, new RegExp(`\\.${selector}(?=[\\s,{:#>+~.])`));
  }
  for (const path of [
    'components/actions/Button/Button.module.css',
    'components/forms/FormField/FormField.module.css',
    'components/surfaces/Card/Card.module.css',
  ]) {
    assert.equal(existsSync(resolve(dist, path)), true, `${path} should be distributed`);
  }
});
