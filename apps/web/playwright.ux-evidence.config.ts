import { defineConfig } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import baseConfig from './playwright.config';

const webRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  ...baseConfig,
  testDir: join(webRoot, 'evidence'),
  testMatch: '**/ux11-capture.spec.ts',
  reporter: [['list']],
});
