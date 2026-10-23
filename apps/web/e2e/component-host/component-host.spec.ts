import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const evidenceDirectory =
  process.env.FORGE_E2E_EVIDENCE_DIR ??
  resolve(process.cwd(), '../../test-results/product-acceptance');

test(
  'development Component Host renders supported previews in dark and light themes',
  { tag: '@smoke' },
  async ({ page }) => {
    const viewport = test.info().project.name === 'chromium-mobile' ? 'mobile' : 'desktop';
    await mkdir(evidenceDirectory, { recursive: true });
    await page.goto('/__components');
    await expect(page.getByRole('heading', { name: 'Component Host' })).toBeVisible();
    const host = page.locator('main [data-theme]').filter({
      has: page.getByText('A development-only catalog of actual exported React components'),
    });
    for (const theme of ['dark', 'light'] as const) {
      await page.getByRole('combobox', { name: 'Preview theme' }).selectOption(theme);
      await expect(host).toHaveAttribute('data-theme', theme);
      await expect(page.locator('[data-product-pattern="project-card"]')).toBeVisible();
      await expect(page.locator('[data-product-pattern="epic-card"]')).toBeVisible();
      await expect(page.locator('[data-product-pattern="criterion-item"]')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: resolve(evidenceDirectory, `component-host-${viewport}-${theme}.png`),
        fullPage: true,
      });
    }
  },
);
