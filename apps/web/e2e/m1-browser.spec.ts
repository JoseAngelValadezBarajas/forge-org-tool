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
  await page.getByRole('button', { name: 'Switch to light', exact: true }).click();
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
  const secondFeature = await (await page.request.post(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/features`, { data: { title: `Second ${suffix}`, goal: 'Another manual item' } })).json();
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Planning', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: `Feature ${suffix}` })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search planning' }).fill(`Feature ${suffix}`);
  await expect(page.getByRole('link', { name: `Feature ${suffix}` })).toBeVisible();
  await expect(page.getByRole('link', { name: `Second ${suffix}` })).toBeHidden();
  await page.getByRole('searchbox', { name: 'Search planning' }).fill('');
  await page.getByRole('combobox', { name: `Priority for Feature ${suffix}` }).selectOption('critical');
  await expect(page.getByRole('combobox', { name: `Priority for Feature ${suffix}` })).toHaveValue('critical');
  await page.getByLabel('Blocking feature').selectOption(feature.id);
  await page.getByLabel('Blocked feature').selectOption(secondFeature.id);
  await page.getByRole('button', { name: 'Add dependency' }).click();
  await expect(page.getByText(new RegExp(`Feature ${suffix} blocks Second ${suffix}`))).toBeVisible();
  await page.getByRole('link', { name: 'Readiness' }).first().click();
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

test('delivery exposes deterministic gates and non-published truth', async ({ page }) => {
  const suffix = Date.now().toString();
  const workspace = await (await page.request.post('/api/v1/workspaces', { data: { name: `Delivery ${suffix}` } })).json();
  const project = await (await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, { data: { name: `Release ${suffix}` } })).json();
  await page.goto(`/delivery/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Delivery verification' })).toBeVisible();
  await expect(page.getByText('NOT_PUBLISHED')).toBeVisible();
  await expect(page.getByText(/not a deployment or publication/i)).toBeVisible();
  const screenshotName = test.info().project.name === 'chromium-mobile' ? 'mobile-delivery.png' : 'desktop-delivery.png';
  await page.screenshot({ path: resolve(evidenceDir, screenshotName), fullPage: true });
});

test('workbench records reported runs and keeps handoffs human-owned', async ({ page }) => {
  const suffix = Date.now().toString();
  const workspace = await (await page.request.post('/api/v1/workspaces', { data: { name: `Workbench ${suffix}` } })).json();
  const project = await (await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, { data: { name: `Runs ${suffix}` } })).json();
  await page.goto(`/workbench/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Workbench' })).toBeVisible();
  await page.getByLabel('Run title').fill(`Manual run ${suffix}`);
  await page.getByRole('button', { name: 'Record Run' }).click();
  await expect(page.getByText(`Manual run ${suffix}`)).toBeVisible();
  await expect(page.getByText(/human \/ manual/i)).toBeVisible();
  await page.getByRole('button', { name: `Create handoff for Manual run ${suffix}` }).click();
  await expect(page.getByText(`Handoff for Manual run ${suffix}`)).toBeVisible();
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
  await page.getByLabel(`Summary for Handoff for Manual run ${suffix}`).fill('Reported summary');
  await page.getByLabel(`Next actions for Handoff for Manual run ${suffix}`).fill('Review manually');
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'PATCH' && response.url().includes('/handoffs/')),
    page.getByRole('button', { name: 'Save handoff details' }).click(),
  ]);
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST' && response.url().includes('/ready')),
    page.getByRole('button', { name: 'Mark handoff ready' }).click(),
  ]);
  await expect(page.getByText('READY', { exact: true })).toBeVisible();
  await page.getByLabel(`Acknowledged by Handoff for Manual run ${suffix}`).fill('reviewer');
  await page.getByRole('button', { name: 'Acknowledge revision' }).click();
  await expect(page.getByText('ACKNOWLEDGED', { exact: true })).toBeVisible();
  await expect(page.getByText('Revision 1')).toBeVisible();
  await expect(page.getByRole('link', { name: 'JSON' })).toHaveAttribute('href', /\/handoffs\/.*\/revisions\/1\/download\?format=json/);
  await expect(page.getByRole('link', { name: 'Markdown' })).toHaveAttribute('href', /\/handoffs\/.*\/revisions\/1\/download\?format=markdown/);
  await expect(page.getByText(/does not execute agents/i)).toBeVisible();
  const screenshotName = test.info().project.name === 'chromium-mobile' ? 'mobile-workbench.png' : 'desktop-workbench.png';
  await page.screenshot({ path: resolve(evidenceDir, screenshotName), fullPage: true });
});

test('project transfer is planning-only and exposes reviewed fingerprints', async ({ page }) => {
  const suffix = Date.now().toString();
  const workspace = await (await page.request.post('/api/v1/workspaces', { data: { name: `Transfer ${suffix}` } })).json();
  const project = await (await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, { data: { name: `Export ${suffix}` } })).json();
  await page.goto(`/transfer/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Project transfer' })).toBeVisible();
  await expect(page.getByText(/planning records only/i)).toBeVisible();
  await page.getByRole('button', { name: 'Export project' }).click();
  await expect(page.getByText('forge-project-import-v1', { exact: true })).toBeVisible();
  await expect(page.getByText(/fingerprint/i)).toBeVisible();
  const screenshotName = test.info().project.name === 'chromium-mobile' ? 'mobile-transfer.png' : 'desktop-transfer.png';
  await page.screenshot({ path: resolve(evidenceDir, screenshotName), fullPage: true });
});

test('readiness records explicit planning context and repository metadata only', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  const suffix = Date.now().toString();
  const workspace = await (await page.request.post('/api/v1/workspaces', { data: { name: `Context ${suffix}` } })).json();
  const project = await (await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, { data: { name: `Review ${suffix}` } })).json();
  const feature = await (await page.request.post(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/features`, { data: { title: `Context feature ${suffix}`, goal: 'Review context' } })).json();
  await page.goto(`/readiness/${workspace.id}/${project.id}/${feature.id}`);
  await expect(page.getByRole('heading', { name: 'Readiness' })).toBeVisible();
  await page.getByLabel('Acceptance criterion').fill(`Criterion ${suffix}`);
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await page.getByLabel('Decision title').fill(`Decision ${suffix}`);
  await page.getByRole('button', { name: 'Link decision' }).click();
  await expect(page.locator('strong').filter({ hasText: `Decision ${suffix}` })).toBeVisible();
  await page.getByLabel('Invariant title').fill(`Invariant ${suffix}`);
  await page.getByRole('button', { name: 'Add invariant' }).click();
  await expect(page.locator('strong').filter({ hasText: `Decision ${suffix}` })).toBeVisible();
  await expect(page.locator('strong').filter({ hasText: `Invariant ${suffix}` })).toBeVisible();
  await page.getByRole('button', { name: `Acknowledge invariant Invariant ${suffix}` }).click();
  await expect(page.getByText(/Acknowledged revision/)).toBeVisible();
  await expect(page.getByText(/NOT_READY|READY_TO_START/)).toBeVisible();
  await page.goto(`/repositories/${workspace.id}/${project.id}`);
  await page.getByLabel('Approved local Git root').fill(resolve(process.cwd(), '../..'));
  await page.getByRole('button', { name: 'Connect Repository' }).click();
  await expect(page.getByText(/connected/i)).toBeVisible();
  await page.getByRole('button', { name: 'Observe metadata' }).click();
  await expect(page.getByText(/never reads source content/i)).toBeVisible();
  const approvedRoot = resolve(process.cwd(), '../..');
  await expect(page.getByText(new RegExp(`Latest observation:.*source content: no`))).toBeVisible();
  await page.goto(`/context/${workspace.id}/${project.id}/${feature.id}`);
  await expect(page.getByRole('heading', { name: 'Feature context' })).toBeVisible();
  await page.getByRole('button', { name: `Link ${approvedRoot}` }).click();
  await expect(page.getByRole('button', { name: `Unlink ${approvedRoot}` })).toBeVisible();
  await page.getByRole('button', { name: 'Preview context package' }).click();
  await expect(page.locator('p').filter({ hasText: /Schema:.*forge-context-v1/ })).toBeVisible();
  await expect(page.getByText(/source content/i).last()).toBeVisible();
  const saveButton = page.getByRole('button', { name: 'Save context package' });
  await saveButton.press('Enter');
  await expect(page.getByRole('link', { name: 'JSON' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Markdown' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect(consoleErrors).toEqual([]);
  const screenshotName = test.info().project.name === 'chromium-mobile' ? 'mobile-context-package.png' : 'desktop-context-package.png';
  await page.screenshot({ path: resolve(evidenceDir, screenshotName), fullPage: true });
});

test('planning feature detail manages tasks and acceptance criteria', async ({ page }) => {
  const suffix = Date.now().toString();
  const workspace = await (await page.request.post('/api/v1/workspaces', { data: { name: `Plan detail ${suffix}` } })).json();
  const project = await (await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, { data: { name: `Tasks ${suffix}` } })).json();
  const feature = await (await page.request.post(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/features`, { data: { title: `Feature ${suffix}`, goal: 'Manage planned work' } })).json();
  await page.goto(`/planning/${workspace.id}/${project.id}/features/${feature.id}`);
  await expect(page.getByRole('heading', { name: 'Feature detail' })).toBeVisible();
  await page.getByLabel('Task title').fill(`Task ${suffix}`);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(`Task ${suffix}`)).toBeVisible();
  await page.getByLabel('Task title').fill(`Second task ${suffix}`);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(`Second task ${suffix}`)).toBeVisible();
  await page.getByLabel('Acceptance criterion').fill(`Criterion ${suffix}`);
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await expect(page.getByText(`Criterion ${suffix}`)).toBeVisible();
  await page.getByRole('combobox', { name: `Status for Task ${suffix}` }).selectOption('in_progress');
  await expect(page.getByRole('combobox', { name: `Status for Task ${suffix}` })).toHaveValue('in_progress');
  await page.getByRole('button', { name: `Move Second task ${suffix} up` }).click();
  const screenshotName = test.info().project.name === 'chromium-mobile' ? 'mobile-feature-detail.png' : 'desktop-feature-detail.png';
  await page.screenshot({ path: resolve(evidenceDir, screenshotName), fullPage: true });
});

test('application shell exposes command palette and theme control', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+K');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go to Organization' })).toBeVisible();
  await page.getByRole('button', { name: 'Go to Organization' }).click();
  await page.getByRole('button', { name: /switch to light theme/i }).click();
  await expect(page.getByTestId('application-shell')).toHaveAttribute('data-theme', 'light');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeHidden();
});
