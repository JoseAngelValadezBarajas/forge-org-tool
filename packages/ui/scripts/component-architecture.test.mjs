import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = resolve(import.meta.dirname, '../src');
const components = resolve(source, 'components');
const categories = new Set([
  'actions',
  'data-display',
  'feedback',
  'forms',
  'layout',
  'navigation',
  'overlays',
  'status',
  'surfaces',
]);

test('UI source keeps components in canonical category directories', () => {
  const violations = [];

  if (existsSync(resolve(source, 'primitives'))) {
    violations.push('src/primitives is an abandoned component location');
  }

  for (const entry of readdirSync(components, { withFileTypes: true })) {
    if (!entry.isDirectory() || !categories.has(entry.name)) {
      violations.push(`src/components/${entry.name} must be a canonical category directory`);
    }
  }

  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.test.tsx')) {
      violations.push(`src/${entry.name} must be colocated with its component`);
    }
  }

  const sourceFiles = [];
  const collect = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) collect(path);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) sourceFiles.push(path);
    }
  };
  collect(source);

  for (const file of sourceFiles) {
    if (readFileSync(file, 'utf8').includes('/primitives/')) {
      violations.push(`${file.slice(source.length + 1)} imports from src/primitives`);
    }
  }

  assert.deepEqual(violations, []);
});

test('canonical category entries contain component directories only', () => {
  const violations = [];

  for (const category of categories) {
    const categoryPath = resolve(components, category);
    if (!existsSync(categoryPath)) continue;
    for (const entry of readdirSync(categoryPath, { withFileTypes: true })) {
      if (!entry.isDirectory() || !statSync(resolve(categoryPath, entry.name)).isDirectory()) {
        violations.push(`components/${category}/${entry.name} must be a component directory`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
