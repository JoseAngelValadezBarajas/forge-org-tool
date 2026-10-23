import { expect, test, type Page } from '@playwright/test';

async function createProject(page: Page, suffix: string) {
  const workspaceResponse = await page.request.post('/api/v1/workspaces', {
    data: { name: `Planning ${suffix}` },
  });
  expect(workspaceResponse.status()).toBe(201);
  const workspace = await workspaceResponse.json();
  const projectResponse = await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
    data: { name: `Project ${suffix}` },
  });
  expect(projectResponse.status()).toBe(201);
  const project = await projectResponse.json();
  return { workspace, project };
}

test('PA-PLAN-001 create, filter, transition, order tasks and persist planning records', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createProject(page, suffix);
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Planning', exact: true })).toBeVisible();

  const epicTitle = `Epic ${suffix}`;
  await page.getByLabel('Epic title').fill(epicTitle);
  await page.getByRole('button', { name: 'Create Epic' }).click();
  await expect(page.getByRole('heading', { name: epicTitle, exact: true })).toBeVisible();

  const featureTitle = `Feature ${suffix}`;
  await page.getByLabel('Feature title').fill(featureTitle);
  await page.getByLabel('Epic for new feature').selectOption({ label: epicTitle });
  await page.getByRole('button', { name: 'Create Feature' }).click();
  const featureLink = page.getByRole('link', { name: featureTitle, exact: true });
  await expect(featureLink).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search planning' }).fill('no such planning result');
  await expect(featureLink).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search planning' }).fill(featureTitle);
  const featureStatus = page.getByLabel(`Status for ${featureTitle}`);
  await featureStatus.selectOption('in_progress');
  await expect(featureStatus).toHaveValue('in_progress');
  await page.getByRole('combobox', { name: 'Filter planning by status' }).selectOption('backlog');
  await expect(featureLink).toHaveCount(0);
  await page
    .getByRole('combobox', { name: 'Filter planning by status' })
    .selectOption('in_progress');
  await expect(featureLink).toBeVisible();

  await featureLink.click();
  await expect(page.getByRole('heading', { name: 'Feature detail' })).toBeVisible();
  await page.getByLabel('Task title').fill(`First task ${suffix}`);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(`First task ${suffix}`, { exact: true })).toBeVisible();
  await page.getByLabel('Task title').fill(`Second task ${suffix}`);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(`Second task ${suffix}`, { exact: true })).toBeVisible();
  await page.getByLabel('Acceptance criterion').fill(`Criterion ${suffix}`);
  await page.getByRole('button', { name: 'Add criterion' }).click();

  const reorderResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/tasks/reorder') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: `Move Second task ${suffix} up` }).click();
  const reorderedTasks = await (await reorderResponse).json();
  expect(reorderedTasks.map((item: { title: string }) => item.title)).toEqual([
    `Second task ${suffix}`,
    `First task ${suffix}`,
  ]);
  const taskItems = page
    .locator('article')
    .filter({ has: page.getByRole('combobox', { name: /^Status for/ }) });
  await expect(taskItems.first()).toContainText(`Second task ${suffix}`);
  const taskStatusResponse = page.waitForResponse(
    (response) =>
      response
        .url()
        .includes(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/`) &&
      response.url().includes('/tasks/') &&
      response.request().method() === 'PATCH',
  );
  await page.getByLabel(`Status for Second task ${suffix}`).selectOption('done');
  expect((await taskStatusResponse).ok()).toBe(true);
  await expect(taskItems.first()).toContainText('done');
  await expect(page.getByText(`Criterion ${suffix}`, { exact: true })).toBeVisible();

  const overview = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/planning/overview`,
  );
  const planning = await overview.json();
  const feature = planning.epics
    .flatMap(
      (epic: { features: Array<{ id: string; title: string; status: string }> }) => epic.features,
    )
    .find((item: { title: string }) => item.title === featureTitle);
  expect(feature).toMatchObject({ title: featureTitle, status: 'in_progress' });
  const tasksResponse = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${feature.id}/tasks`,
  );
  const tasks = await tasksResponse.json();
  expect(tasks.map((item: { title: string }) => item.title)).toEqual([
    `Second task ${suffix}`,
    `First task ${suffix}`,
  ]);
  expect(tasks[0].status).toBe('done');
  const criteriaResponse = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${feature.id}/acceptance-criteria`,
  );
  expect(await criteriaResponse.json()).toEqual(
    expect.arrayContaining([expect.objectContaining({ description: `Criterion ${suffix}` })]),
  );
  await page.reload();
  await expect(page.getByText(`Second task ${suffix}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Criterion ${suffix}`, { exact: true })).toBeVisible();
});

test('PA-PLAN-002 dependencies reject self-links and retain valid relationships', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createProject(page, `Dependency ${suffix}`);
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  for (const title of [`Blocker ${suffix}`, `Blocked ${suffix}`]) {
    await page.getByLabel('Feature title').fill(title);
    await page.getByRole('button', { name: 'Create Feature' }).click();
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  }
  await page.getByLabel('Blocking feature').selectOption({ label: `Blocker ${suffix}` });
  await page.getByLabel('Blocked feature').selectOption({ label: `Blocker ${suffix}` });
  await page.getByRole('button', { name: 'Add dependency' }).click();
  const dependenciesPath = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/dependencies`;
  expect(await (await page.request.get(dependenciesPath)).json()).toHaveLength(0);

  await page.getByLabel('Blocked feature').selectOption({ label: `Blocked ${suffix}` });
  await page.getByRole('button', { name: 'Add dependency' }).click();
  await expect(
    page.getByText(new RegExp(`Blocker ${suffix} blocks Blocked ${suffix}`)),
  ).toBeVisible();
  expect(await (await page.request.get(dependenciesPath)).json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        blocking_feature_id: expect.any(String),
        blocked_feature_id: expect.any(String),
      }),
    ]),
  );
  await page.reload();
  await expect(
    page.getByText(new RegExp(`Blocker ${suffix} blocks Blocked ${suffix}`)),
  ).toBeVisible();
});

test('PA-PLAN-003 Epic detail edits and linked Feature navigation persist', async ({ page }) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createProject(page, `Epic detail ${suffix}`);
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  await page.getByLabel('Epic title').fill(`Epic ${suffix}`);
  await page.getByRole('button', { name: 'Create Epic' }).click();
  await page.getByLabel('Feature title').fill(`Feature ${suffix}`);
  await page.getByLabel('Epic for new feature').selectOption({ label: `Epic ${suffix}` });
  await page.getByRole('button', { name: 'Create Feature' }).click();

  await page.getByRole('link', { name: `Epic ${suffix}` }).click();
  await expect(page.getByRole('heading', { name: 'Epic detail' })).toBeVisible();
  await expect(page.getByLabel('Epic title')).toHaveValue(`Epic ${suffix}`);
  await page.screenshot({ path: test.info().outputPath('epic-detail.png'), fullPage: true });
  await page.getByLabel('Epic title').fill(`Updated Epic ${suffix}`);
  await page.getByLabel('Epic status').selectOption('in_progress');
  await page.getByRole('button', { name: 'Save Epic' }).click();
  await expect(page.getByText('Epic saved.')).toBeVisible();
  const overviewPath = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/planning/overview`;
  let overview = await (await page.request.get(overviewPath)).json();
  let epic = overview.epics.find(
    (item: { title: string }) => item.title === `Updated Epic ${suffix}`,
  );
  expect(epic).toMatchObject({ status: 'in_progress' });
  await page.reload();
  await expect(page.getByLabel('Epic title')).toHaveValue(`Updated Epic ${suffix}`);
  await page.getByRole('link', { name: `Feature ${suffix}` }).click();
  await expect(page.getByRole('heading', { name: 'Feature detail' })).toBeVisible();
  overview = await (await page.request.get(overviewPath)).json();
  epic = overview.epics.find((item: { title: string }) => item.title === `Updated Epic ${suffix}`);
  expect(epic.features.map((item: { title: string }) => item.title)).toContain(`Feature ${suffix}`);
});
