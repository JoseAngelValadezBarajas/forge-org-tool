import assert from 'node:assert/strict';
import test from 'node:test';
import { missingPrerequisites, npmInvocation } from './run-acceptance-local.mjs';

test('acceptance runner invokes npm without enabling deprecated Windows shell interpolation', () => {
  assert.deepEqual(
    npmInvocation({
      npmCli: null,
      platform: 'win32',
      comSpec: 'C:\\Windows\\System32\\cmd.exe',
      args: ['run', 'test:e2e:full'],
    }),
    {
      command: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'npm run test:e2e:full'],
    },
  );
});

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
