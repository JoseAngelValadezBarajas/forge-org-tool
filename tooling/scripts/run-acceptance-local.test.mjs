import assert from 'node:assert/strict';
import test from 'node:test';
import { missingPrerequisites } from './run-acceptance-local.mjs';

test('acceptance preflight accepts the documented Node, Python, uv, npm and Chromium baseline', () => {
  assert.deepEqual(
    missingPrerequisites({
      nodeMajor: 24,
      pythonMajor: 3,
      pythonMinor: 12,
      npm: true,
      uv: true,
      chromium: true,
    }),
    [],
  );
});

test('acceptance preflight explains missing or unsupported local prerequisites', () => {
  assert.deepEqual(
    missingPrerequisites({
      nodeMajor: 25,
      pythonMajor: 3,
      pythonMinor: 11,
      npm: true,
      uv: false,
      chromium: false,
    }),
    [
      'Node.js 24 is required (found 25).',
      'Python 3.12 is required for the API test environment (found 3.11).',
      'uv is not available on PATH.',
      'Playwright Chromium is not installed; run npx playwright install chromium.',
    ],
  );
});
