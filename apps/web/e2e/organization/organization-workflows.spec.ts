import { expect, test } from '@playwright/test';

type Workspace = { id: string; name: string };

test('PA-ORG-001 workspace first-use and project lifecycle persist through SQLite', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const listResponse = await page.request.get('/api/v1/workspaces');
  expect(listResponse.ok()).toBeTruthy();
  let workspaces = (await listResponse.json()) as Workspace[];

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Organization' })).toBeVisible();

  let workspace: Workspace;
  if (workspaces.length === 0) {
    await expect(page.getByText('No workspaces yet')).toBeVisible();
    await page.getByLabel('Workspace name').fill(`Acceptance ${suffix}`);
    await page.getByRole('button', { name: 'Create Workspace' }).click();
    await expect(page.getByRole('combobox', { name: 'Workspace' })).toBeVisible();
    const createdResponse = await page.request.get('/api/v1/workspaces');
    workspaces = (await createdResponse.json()) as Workspace[];
    workspace = workspaces.find((item) => item.name === `Acceptance ${suffix}`)!;
    expect(workspace).toBeTruthy();
  } else {
    // UI exposes workspace creation only in first-use; isolate the rest of this journey
    // with a synthetic workspace created through the same production API/SQLite.
    const created = await page.request.post('/api/v1/workspaces', {
      data: { name: `Acceptance ${suffix}` },
    });
    expect(created.status()).toBe(201);
    workspace = (await created.json()) as Workspace;
    await page.reload();
    await page.getByRole('combobox', { name: 'Workspace' }).selectOption(workspace.id);
  }

  const projectName = `Lifecycle ${suffix}`;
  await page.getByLabel('Project name').fill(projectName);
  await page.getByLabel('Description').fill('Created through Organization UI');
  await page.getByRole('button', { name: 'Create Project' }).click();
  const projectHeading = page
    .getByRole('region', { name: 'Project summaries' })
    .getByRole('link', { name: projectName, exact: true });
  await expect(projectHeading).toBeVisible();

  const search = page.getByRole('searchbox', { name: 'Search projects' });
  await search.fill('missing acceptance text');
  await expect(page.getByText('No matching projects.')).toBeVisible();
  await search.fill(projectName);
  const card = page.locator('[data-state="Active"]').filter({
    has: page.getByRole('link', { name: projectName, exact: true }),
  });
  await expect(card).toContainText('Created through Organization UI');

  await card.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByRole('button', { name: 'Archive' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Show archived' }).check();
  const archivedCard = page.locator('[data-state="Archived"]').filter({
    has: page.getByRole('link', { name: projectName, exact: true }),
  });
  await expect(archivedCard.getByRole('button', { name: 'Restore' })).toBeVisible();

  const projectsResponse = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects?search=${encodeURIComponent(projectName)}&status=all`,
  );
  expect(projectsResponse.ok()).toBeTruthy();
  const projects = (await projectsResponse.json()) as Array<{
    id: string;
    name: string;
    status: string;
    description: string;
  }>;
  expect(projects).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: projectName, status: 'archived' })]),
  );

  await archivedCard.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByRole('button', { name: 'Restore' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Archive' })).toBeVisible();
  const persisted = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects?search=${encodeURIComponent(projectName)}&status=all`,
  );
  expect((await persisted.json())[0]).toMatchObject({ status: 'active' });
  await page.reload();
  await page.getByRole('combobox', { name: 'Workspace' }).selectOption(workspace.id);
  await search.fill(projectName);
  await expect(page.getByRole('button', { name: 'Archive' })).toBeVisible();
});
