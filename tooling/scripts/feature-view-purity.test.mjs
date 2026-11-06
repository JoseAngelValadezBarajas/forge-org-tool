import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const featuresDir = path.resolve(import.meta.dirname, '../../apps/web/src/features');

function pageFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(full);
    return /Page\.tsx$/.test(entry.name) ? [full] : [];
  });
}

// Frontend counterpart of the hexagonal backend rule (ADR-0003): a feature page is a view.
// State, effects and API calls live in a sibling use*.ts hook.
test('feature pages are views: no effects, no API calls', () => {
  const offenders = [];
  for (const file of pageFiles(featuresDir)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of [
      /\buseEffect\b/,
      /\borganizationApi\b/,
      /\bgetApiJson\b/,
      /\bsendJson\b/,
      /\bfetch\(/,
    ]) {
      if (pattern.test(source)) offenders.push(`${path.relative(featuresDir, file)}: ${pattern}`);
    }
  }
  assert.deepEqual(offenders, []);
});

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

// Platform capabilities (Tauri) are adapters under src/platform; features never import them.
test('features do not import Tauri packages directly', () => {
  const offenders = sourceFiles(featuresDir).filter((file) =>
    /from\s+['"]@tauri-apps\//.test(fs.readFileSync(file, 'utf8')),
  );
  assert.deepEqual(
    offenders.map((file) => path.relative(featuresDir, file)),
    [],
  );
});
