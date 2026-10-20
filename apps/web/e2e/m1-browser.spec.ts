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
  await expect(page.getByText('No workspaces yet')).toBeVisible();
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
  const prefix = test.info().project.name === 'chromium-mobile' ? 'mobile-component-host' : 'desktop-component-host';
  await page.screenshot({ path: resolve(evidenceDir, `${prefix}-dark.png`), fullPage: true });
  const primary = page.getByRole('button', { name: /increment 0/i });
  const defaultBackground = await primary.evaluate((element) => getComputedStyle(element).backgroundColor);
  await primary.hover();
  const hoverBackground = await primary.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(hoverBackground).not.toBe(defaultBackground);
  await page.getByRole('button', { name: /switch to light/i }).click();
  await expect(gallery).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: /increment 0/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(consoleErrors).toEqual([]);
  const screenshotName = test.info().project.name === 'chromium-mobile' ? 'mobile-gallery-light.png' : 'desktop-component-host.png';
  await page.screenshot({ path: resolve(evidenceDir, screenshotName), fullPage: true });
});

test('planning and readiness remain manual truth states', async ({ page }) => {
  const suffix = Date.now().toString();
  const workspaceResponse = await page.request.post('/api/v1/workspaces', { data: { name: `Browser ${suffix}` } });
  const workspace = await workspaceResponse.json();
  const projectResponse = await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, { data: { name: `Planning ${suffix}` } });
  const project = await projectResponse.json();
  const featureResponse = await page.request.post(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/features`, { data: { title: `Feature ${suffix}`, goal: 'Review manual readiness' } });
  const feature = await featureResponse.json();
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Planning' })).toBeVisible();
  await expect(page.getByRole('link', { name: `Feature ${suffix}` })).toBeVisible();
  await page.getByRole('link', { name: `Feature ${suffix}` }).click();
  await expect(page.getByRole('heading', { name: 'Readiness' })).toBeVisible();
  await expect(page.getByText('NOT_READY')).toBeVisible();
  await expect(page.getByText(/not delivery, CI, deployment/i)).toBeVisible();
  const screenshotName = test.info().project.name === 'chromium-mobile' ? 'mobile-readiness.png' : 'desktop-planning.png';
  await page.screenshot({ path: resolve(evidenceDir, screenshotName), fullPage: true });
  await page.goto(`/repositories/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Repositories' })).toBeVisible();
  await expect(page.getByText(/never reads source content/i)).toBeVisible();
  expect(feature.id).toBeTruthy();
});
