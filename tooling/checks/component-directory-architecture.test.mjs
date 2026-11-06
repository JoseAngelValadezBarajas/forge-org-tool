import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const uiDist = path.join(repositoryRoot, 'node_modules/@corefoundry-labs/forge-ui/dist');
const publicEntry = readFileSync(path.join(uiDist, 'index.d.ts'), 'utf8');
const componentPaths = Array.from(
  publicEntry.matchAll(/from ['"]\.\/(components\/[^'"]+)['"]/g),
  ([, componentPath]) => componentPath,
);

// ThemeScope styles itself through inline custom properties and ships no CSS module.
const withoutStylesheet = new Set(['components/layout/ThemeScope']);

test('installed UI artifact exposes self-contained component directories', () => {
  const violations = [];

  for (const componentPath of componentPaths) {
    const componentDirectory = path.join(uiDist, componentPath);
    const componentName = path.basename(componentPath);

    if (!existsSync(componentDirectory) || !statSync(componentDirectory).isDirectory()) {
      violations.push(`${componentPath} is not a component directory`);
      continue;
    }

    const required = [`${componentName}.js`, `${componentName}.module.css`, 'index.js'].filter(
      (file) => !(withoutStylesheet.has(componentPath) && file.endsWith('.module.css')),
    );
    for (const file of required) {
      if (!existsSync(path.join(componentDirectory, file))) {
        violations.push(`${componentPath} is missing ${file}`);
      }
    }
  }

  assert.ok(componentPaths.length > 0, 'the package entrypoint should expose components');
  assert.deepEqual(violations, []);
});
