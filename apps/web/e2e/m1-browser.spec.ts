import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const evidenceDir = resolve(process.cwd(), '../../docs/evidence/m1');

test('desktop shell is truthful and has no horizontal overflow', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await mkdir(evidenceDir, { recursive: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Organization' })).toBeVisible();
  await expect(page.getByText(/does not display fictitious project data/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(consoleErrors).toEqual([]);
  await page.screenshot({ path: resolve(evidenceDir, 'desktop-organization.png'), fullPage: true });
});

test('mobile gallery switches from dark to light with no browser errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.goto('/__components');
  const gallery = page.locator('main [data-theme]').filter({ has: page.getByText('A development-only catalog of actual exported React components') });
  await expect(gallery).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: /switch to light/i }).click();
  await expect(gallery).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: /increment 0/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(consoleErrors).toEqual([]);
  const screenshotName = test.info().project.name === 'chromium-mobile' ? 'mobile-gallery-light.png' : 'desktop-component-host.png';
  await page.screenshot({ path: resolve(evidenceDir, screenshotName), fullPage: true });
});
