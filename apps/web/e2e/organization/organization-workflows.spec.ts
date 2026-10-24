import { expect, test, type Locator } from '@playwright/test';

type Workspace = { id: string; name: string };

async function revealProjectActions(card: Locator) {
  const actions = card.locator('details');
  if (!(await actions.evaluate((element: HTMLDetailsElement) => element.open))) {
    await actions.locator('summary').click();
  }
}

test('PA-ORG-001 workspace first-use and project lifecycle persist through SQLite', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const listResponse = await page.request.get('/api/v1/workspaces');
  expect(listResponse.ok()).toBeTruthy();
  let workspaces = (await listResponse.json()) as Workspace[];

  await page.goto('/');

  const main = page.getByRole('main');
  await expect(
    main.getByRole('heading', {
      name: workspaces.length > 0 ? 'Your workspace, in focus' : 'No workspaces yet',
      exact: true,
    }),
  ).toBeVisible();
  if (workspaces[0]) {
    await expect(page.getByRole('combobox', { name: 'Workspace' })).toHaveValue(workspaces[0].id);
  }

  let workspace: Workspace;
  if (workspaces.length === 0) {
    await expect(page.getByText('No workspaces yet')).toBeVisible();
    const workspaceForm = page.getByRole('form', { name: 'Create first workspace' });
    await workspaceForm.getByLabel('Workspace name').fill(`Acceptance ${suffix}`);
    await workspaceForm.getByRole('button', { name: 'Create Workspace', exact: true }).click();
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
  const projectDialog = page.getByRole('dialog', { name: 'Create project', exact: true });
  await page.getByRole('button', { name: 'Create your first project', exact: true }).click();
  await expect(projectDialog).toBeVisible();
  await projectDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(projectDialog).toBeHidden();
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect(projectDialog).toBeVisible();
  await projectDialog.getByLabel('Project name', { exact: true }).fill(projectName);
  await projectDialog
    .getByRole('textbox', { name: 'Project description', exact: true })
    .fill('Created through Organization UI');
  await projectDialog.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(projectDialog).toBeHidden();
  const projectHeading = page
    .getByRole('region', { name: 'Projects', exact: true })
    .getByRole('link', { name: projectName, exact: true });
  await expect(projectHeading).toBeVisible();
  const siblingProjectNames = [`FormiAI ${suffix}`, `Taringa 2.0 ${suffix}`];
  for (const siblingName of siblingProjectNames) {
    await page.getByRole('button', { name: 'New project', exact: true }).click();
    await expect(projectDialog).toBeVisible();
    await projectDialog.getByLabel('Project name', { exact: true }).fill(siblingName);
    await projectDialog.getByRole('button', { name: 'Create project', exact: true }).click();
    await expect(projectDialog).toBeHidden();
    await expect(
      page.getByRole('region', { name: 'Projects', exact: true }).getByRole('link', {
        name: siblingName,
        exact: true,
      }),
    ).toBeVisible();
  }

  const projectFilters = page.getByRole('button', { name: 'Project filters' });
  await projectFilters.click();
  const search = page.getByRole('searchbox', { name: 'Search projects' });
  await search.fill('missing acceptance text');
  await expect(page.getByText('No projects match this search and archive filter.')).toBeVisible();
  await search.fill(projectName);
  const card = page.locator('[data-state="Active"]').filter({
    has: page.getByRole('link', { name: projectName, exact: true }),
  });
  await expect(card).toContainText('Created through Organization UI');

  await projectFilters.click();
  await revealProjectActions(card);
  await card.getByRole('button', { name: 'Archive' }).click();
  await projectFilters.click();
  await page.getByRole('checkbox', { name: 'Show archived' }).check();
  await projectFilters.click();
  const archivedCard = page.locator('[data-state="Archived"]').filter({
    has: page.getByRole('link', { name: projectName, exact: true }),
  });
  await revealProjectActions(archivedCard);
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
  await expect(page.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0);
  await revealProjectActions(card);
  await expect(page.getByRole('button', { name: 'Archive', exact: true })).toBeVisible();
  const persisted = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects?search=${encodeURIComponent(projectName)}&status=all`,
  );
  expect((await persisted.json())[0]).toMatchObject({ status: 'active' });
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Workspace' })).toHaveValue(workspace.id);
  await projectFilters.click();
  await search.fill(projectName);
  await projectFilters.click();
  const restoredCard = page.locator('[data-state="Active"]').filter({
    has: page.getByRole('link', { name: projectName, exact: true }),
  });
  await revealProjectActions(restoredCard);
  await expect(restoredCard.getByRole('button', { name: 'Archive' })).toBeVisible();

  const secondWorkspaceResponse = await page.request.post('/api/v1/workspaces', {
    data: { name: `Isolated ${suffix}` },
  });
  expect(secondWorkspaceResponse.status()).toBe(201);
  const secondWorkspace = await secondWorkspaceResponse.json();
  await page.reload();
  const workspaceSelector = page.getByRole('combobox', { name: 'Workspace' });
  await workspaceSelector.selectOption(secondWorkspace.id);
  await expect(projectHeading).toHaveCount(0);
  const secondProjectName = `Second workspace project ${suffix}`;
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  await expect(projectDialog).toBeVisible();
  await projectDialog.getByLabel('Project name', { exact: true }).fill(secondProjectName);
  await projectDialog.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(projectDialog).toBeHidden();
  await expect(
    page.getByRole('region', { name: 'Projects', exact: true }).getByRole('link', {
      name: secondProjectName,
      exact: true,
    }),
  ).toBeVisible();
  await workspaceSelector.selectOption(workspace.id);
  await expect(projectHeading).toBeVisible();
  for (const siblingName of siblingProjectNames) {
    await expect(
      page.getByRole('region', { name: 'Projects', exact: true }).getByRole('link', {
        name: siblingName,
        exact: true,
      }),
    ).toBeVisible();
  }

  await projectFilters.click();
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Workspace settings', exact: true })
    .click();
  await expect(page).toHaveURL(`/workspaces/${workspace.id}/settings`);
  await page.getByText('Workspace profile and status', { exact: true }).click();
  await page.getByRole('button', { name: 'Archive Workspace', exact: true }).click();
  await expect(page.getByText('Archived', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Projects', exact: true }).click();
  await expect(
    page.getByText('This Workspace is archived. Restore it in settings to create projects.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'New project', exact: true })).toHaveCount(0);
  expect(
    (await (await page.request.get(`/api/v1/workspaces/${workspace.id}`)).json()).archived_at,
  ).toEqual(expect.any(String));
  await page.getByRole('button', { name: 'Project filters', exact: true }).click();
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Workspace settings', exact: true })
    .click();
  await expect(page.getByText('Restore this Workspace to manage its shared tags.')).toBeVisible();
  await page.getByText('Workspace profile and status', { exact: true }).click();
  const restoreResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/v1/workspaces/${workspace.id}/restore`) &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Restore Workspace', exact: true }).click();
  const restoreResponse = await restoreResponsePromise;
  expect(restoreResponse.ok()).toBeTruthy();
  expect((await restoreResponse.json()).archived_at).toBeNull();
  await expect(page.getByRole('button', { name: 'Archive Workspace', exact: true })).toBeVisible();
  expect(
    (await (await page.request.get(`/api/v1/workspaces/${workspace.id}`)).json()).archived_at,
  ).toBeNull();
});

test('PA-ORG-002 Project Overview edits and status persist through Planning and Transfer navigation', async ({
  page,
}) => {
  const mobile = test.info().project.name === 'chromium-mobile';
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const workspaceResponse = await page.request.post('/api/v1/workspaces', {
    data: { name: `Overview ${suffix}` },
  });
  expect(workspaceResponse.status()).toBe(201);
  const workspace = await workspaceResponse.json();
  const projectResponse = await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
    data: { name: `Project ${suffix}` },
  });
  expect(projectResponse.status()).toBe(201);
  const project = await projectResponse.json();

  await page.goto('/');
  await page.getByRole('combobox', { name: 'Workspace' }).selectOption(workspace.id);
  const projectLink = page
    .getByRole('region', { name: 'Projects', exact: true })
    .getByRole('link', { name: project.name, exact: true });
  await expect(projectLink).toHaveAttribute('href', `/planning/${workspace.id}/${project.id}`);
  await projectLink.click();
  await expect(page).toHaveURL(`/planning/${workspace.id}/${project.id}`);
  await expect(page.getByTestId('project-board-title')).toBeVisible();
  if (mobile) {
    const boardMenu = page.locator('details').filter({
      has: page.locator('summary').filter({ hasText: /^Board/ }),
    });
    await boardMenu.locator('summary').click();
    await boardMenu.getByRole('link', { name: 'Project overview', exact: true }).click();
  } else {
    await page
      .getByTestId('app-topbar')
      .locator(`a[href="/projects/${workspace.id}/${project.id}"]`)
      .click();
  }
  await expect(page).toHaveURL(`/projects/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Project Overview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit project' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('project-overview.png'), fullPage: true });
  await page.getByRole('button', { name: 'Edit project' }).click();
  await page.getByLabel('Project name').fill(`Renamed ${suffix}`);
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(
    page
      .getByRole('region', { name: 'Project details' })
      .getByRole('heading', { name: `Renamed ${suffix}`, exact: true }),
  ).toBeVisible();
  expect(
    await (
      await page.request.get(`/api/v1/workspaces/${workspace.id}/projects/${project.id}`)
    ).json(),
  ).toMatchObject({ name: `Renamed ${suffix}`, status: 'active' });

  await page.getByRole('button', { name: 'Archive project' }).click();
  await expect(page.getByRole('dialog', { name: 'Archive project?' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm archive' }).click();
  await expect(page.getByText('Project archived')).toBeVisible();
  await page.reload();
  await expect(page.getByText('archived', { exact: true })).toBeVisible();
  expect(
    await (
      await page.request.get(`/api/v1/workspaces/${workspace.id}/projects/${project.id}`)
    ).json(),
  ).toMatchObject({ status: 'archived' });

  await page.getByRole('link', { name: 'Open planning board' }).click();
  await expect(page).toHaveURL(`/planning/${workspace.id}/${project.id}`);
  await expect(page.getByTestId('project-board-title')).toBeVisible();
  if (mobile) {
    const boardMenu = page.locator('details').filter({
      has: page.locator('summary').filter({ hasText: /^Board/ }),
    });
    await boardMenu.locator('summary').click();
    await boardMenu.getByRole('link', { name: 'Project overview', exact: true }).click();
  } else {
    await page
      .getByTestId('app-topbar')
      .locator(`a[href="/projects/${workspace.id}/${project.id}"]`)
      .click();
  }
  await expect(page.getByRole('heading', { name: 'Project Overview' })).toBeVisible();
  await page.getByRole('link', { name: 'Transfer / export' }).click();
  await expect(page).toHaveURL(`/transfer/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Project transfer' })).toBeVisible();
});
