import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uiSource = path.join(repositoryRoot, 'packages/ui/src');
const publicEntry = readFileSync(path.join(uiSource, 'index.ts'), 'utf8');
const componentPaths = Array.from(
  publicEntry.matchAll(/from ['"]\.\/(components\/[^'"]+)['"]/g),
  ([, componentPath]) => componentPath,
);

test('every public UI component has a self-contained directory', () => {
  const violations = [];

  for (const componentPath of componentPaths) {
    const componentDirectory = path.join(uiSource, componentPath);
    const componentName = path.basename(componentPath);

    if (!existsSync(componentDirectory) || !statSync(componentDirectory).isDirectory()) {
      violations.push(`${componentPath} is not a component directory`);
      continue;
    }

    for (const file of [
      `${componentName}.tsx`,
      `${componentName}.module.css`,
      `${componentName}.test.tsx`,
      'index.ts',
    ]) {
      if (!existsSync(path.join(componentDirectory, file))) {
        violations.push(`${componentPath} is missing ${file}`);
      }
    }
  }

  assert.ok(componentPaths.length > 0, 'the package entrypoint should expose components');
  assert.deepEqual(violations, []);
});
