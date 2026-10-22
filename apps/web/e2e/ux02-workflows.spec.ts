import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const evidenceDir = resolve(process.cwd(), '../../docs/evidence/ux02');

test('project navigation connects planning, readiness, context and product workspaces', async ({
  page,
}) => {
  const suffix = test.info().project.name;
  const workspace = await (
    await page.request.post('/api/v1/workspaces', { data: { name: `UX-02 ${suffix}` } })
  ).json();
  const project = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
      data: { name: `Workflow ${suffix}` },
    })
  ).json();
  const feature = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/features`, {
      data: { title: `Feature ${suffix}`, goal: 'Verify contextual product navigation' },
    })
  ).json();

  await page.goto(`/planning/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Planning', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: `Feature ${suffix}` })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Project');
  if (test.info().project.name === 'chromium-desktop') {
    await mkdir(evidenceDir, { recursive: true });
    await page.screenshot({ path: resolve(evidenceDir, 'desktop-planning.png'), fullPage: true });
  }

  await page.getByRole('link', { name: `Feature ${suffix}` }).click();
  await expect(page.getByRole('heading', { name: 'Feature detail' })).toBeVisible();
  await page.getByRole('link', { name: 'Readiness', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Readiness', exact: true })).toBeVisible();
  await expect(page.getByText(/^Outcome:/)).toBeVisible();
  if (test.info().project.name === 'chromium-desktop') {
    await page.screenshot({ path: resolve(evidenceDir, 'desktop-readiness.png'), fullPage: true });
  }
  await page.getByRole('link', { name: 'Context' }).click();
  await expect(page.getByRole('heading', { name: 'Feature context' })).toBeVisible();

  for (const [label, heading] of [
    ['Workbench', 'Workbench'],
    ['Delivery', 'Delivery overview'],
    ['Repositories', 'Repositories'],
    ['Transfer', 'Project transfer'],
  ]) {
    await page.getByRole('link', { name: label, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Product navigation' })).toBeVisible();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Product navigation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
