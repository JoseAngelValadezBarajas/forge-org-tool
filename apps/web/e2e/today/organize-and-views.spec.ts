import { expect, test } from '@playwright/test';
import { createFeature, createProject, createWorkspace } from '../support/api';

test('PA-TODAY-003 Organize moves a captured task to another project and Epic, durably', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const workspace = await createWorkspace(page, `Organize ${suffix}`);
  const inbox = await createProject(page, workspace.id, 'Inbox');
  const atlas = await createProject(page, workspace.id, `Atlas ${suffix}`);
  const epic = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects/${atlas.id}/epics`, {
      data: { title: `Launch ${suffix}` },
    })
  ).json();
  const item = await createFeature(page, workspace.id, inbox.id, { title: `Fix login ${suffix}` });
  await page.addInitScript(
    (id) => localStorage.setItem('forge-active-workspace', id),
    workspace.id,
  );

  await page.goto('/?view=unorganized');
  await expect(page.getByRole('link', { name: `Fix login ${suffix}` })).toBeVisible();
  await page.getByRole('button', { name: `Organize Fix login ${suffix}` }).click();
  const dialog = page.getByRole('dialog', { name: /Organize task/ });
  await dialog.getByLabel('Project').selectOption(atlas.id);
  await dialog.getByLabel('Epic').selectOption(epic.id);
  await dialog.getByLabel('Priority').selectOption('high');
  await dialog.getByLabel('Tags').fill('auth, urgent');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText(`Organized “Fix login ${suffix}”`);

  // The backend, not the page, is the source of truth.
  const featuresUrl = (projectId: string) =>
    `/api/v1/workspaces/${workspace.id}/projects/${projectId}/features`;
  const inAtlas = (await (await page.request.get(featuresUrl(atlas.id))).json()) as Array<{
    id: string;
    project_id: string;
    epic_id: string | null;
    priority: string;
    tags: string[];
  }>;
  expect(inAtlas).toHaveLength(1);
  expect(inAtlas[0]).toMatchObject({
    id: item.id,
    project_id: atlas.id,
    epic_id: epic.id,
    priority: 'high',
    tags: ['auth', 'urgent'],
  });
  expect(await (await page.request.get(featuresUrl(inbox.id))).json()).toHaveLength(0);

  // It no longer counts as an unorganized Inbox item after a reload.
  await page.reload();
  await expect(page.getByRole('link', { name: `Fix login ${suffix}` })).toHaveCount(0);
});

test('PA-TODAY-004 the Blocked and Verify views show what waits and why', async ({ page }) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const workspace = await createWorkspace(page, `Views ${suffix}`);
  const project = await createProject(page, workspace.id, 'Inbox');
  const api = await createFeature(page, workspace.id, project.id, { title: `API ${suffix}` });
  const ui = await createFeature(page, workspace.id, project.id, { title: `UI ${suffix}` });
  await createFeature(page, workspace.id, project.id, {
    title: `Copy review ${suffix}`,
    status: 'verify',
  });
  const dependency = await page.request.post(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/dependencies`,
    { data: { blocking_feature_id: api.id, blocked_feature_id: ui.id } },
  );
  expect(dependency.status()).toBe(201);
  await page.addInitScript(
    (id) => localStorage.setItem('forge-active-workspace', id),
    workspace.id,
  );

  await page.goto('/');
  const views = page.getByRole('group', { name: 'Views' });
  await expect(views.getByRole('button', { name: /Blocked/ })).toContainText('1');
  await views.getByRole('button', { name: /Blocked/ }).click();
  const blocked = page.getByRole('region', { name: /Blocked/ });
  await expect(blocked.getByRole('link', { name: `UI ${suffix}` })).toBeVisible();
  await expect(blocked.getByText(`Blocked by API ${suffix}`)).toBeVisible();

  // A view is a link: it opens directly and survives a reload.
  await page.goto('/?view=verify');
  await expect(
    page
      .getByRole('region', { name: /Verify/ })
      .getByRole('link', { name: `Copy review ${suffix}` }),
  ).toBeVisible();
  await page.reload();
  await expect(views.getByRole('button', { name: /Verify/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
