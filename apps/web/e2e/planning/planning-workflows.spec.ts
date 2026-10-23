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
  await page.getByLabel('Epic priority').selectOption('high');
  await page.getByLabel('Epic tags').fill('AI, Research');
  await page.getByRole('button', { name: 'Create Epic' }).click();
  const epicCard = page.locator('[data-state="backlog"]').filter({
    has: page.getByRole('link', { name: epicTitle, exact: true }),
  });
  await expect(epicCard).toContainText('Priority: high');
  await expect(epicCard.getByRole('list', { name: `${epicTitle} tags` })).toContainText('AI');

  const featureTitle = `Feature ${suffix}`;
  await page.getByLabel('Feature title').fill(featureTitle);
  await page.getByLabel('Epic for new feature').selectOption({ label: epicTitle });
  await page.getByLabel('Feature tags').fill('AI, Research');
  await page.getByRole('button', { name: 'Create Feature' }).click();
  const featureLink = page.getByRole('link', { name: featureTitle, exact: true });
  await expect(featureLink).toBeVisible();
  const untaggedTitle = `Untagged ${suffix}`;
  await page.getByLabel('Feature title').fill(untaggedTitle);
  await page.getByLabel('Epic for new feature').selectOption({ label: epicTitle });
  await page.getByRole('button', { name: 'Create Feature' }).click();
  const untaggedLink = page.getByRole('link', { name: untaggedTitle, exact: true });
  await expect(untaggedLink).toBeVisible();
  await page.getByLabel('Filter planning by tag').fill('research');
  await expect(featureLink).toBeVisible();
  await expect(untaggedLink).toHaveCount(0);
  await page.getByLabel('Filter planning by tag').fill('');

  await page.getByRole('searchbox', { name: 'Search planning' }).fill('no such planning result');
  await expect(featureLink).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search planning' }).fill(featureTitle);
  const featureStatus = page.getByLabel(`Status for ${featureTitle}`);
  const initialStatusTransition = page.waitForResponse(
    (response) =>
      response.url().includes('/features/') &&
      !response.url().includes('/tasks/') &&
      response.request().method() === 'PATCH' &&
      response.request().postData()?.includes('"status":"in_progress"') === true,
  );
  await featureStatus.selectOption('in_progress');
  expect((await initialStatusTransition).ok()).toBe(true);
  await expect(featureStatus).toHaveValue('in_progress');
  await page.getByRole('combobox', { name: 'Filter planning by status' }).selectOption('backlog');
  await expect(featureLink).toHaveCount(0);
  await page
    .getByRole('combobox', { name: 'Filter planning by status' })
    .selectOption('in_progress');
  await expect(featureLink).toBeVisible();

  const readyColumn = page.getByLabel('Planning board').getByTestId('kanban-column-ready');
  const statusTransition = page.waitForResponse(
    (response) =>
      response.url().includes('/features/') &&
      !response.url().includes('/tasks/') &&
      response.request().method() === 'PATCH' &&
      response.request().postData()?.includes('"status":"ready"') === true,
  );
  if (test.info().project.name === 'chromium-mobile') {
    await page.getByLabel(`Status for ${featureTitle}`).selectOption('ready');
  } else {
    await page.locator('[data-testid^="work-item-card-"]').dragTo(readyColumn);
  }
  expect((await statusTransition).ok()).toBe(true);
  const movedOverview = await (
    await page.request.get(
      `/api/v1/workspaces/${workspace.id}/projects/${project.id}/planning/overview`,
    )
  ).json();
  const movedFeature = movedOverview.epics
    .flatMap((epic: { features: Array<{ title: string; status: string }> }) => epic.features)
    .find((item: { title: string }) => item.title === featureTitle);
  expect(movedFeature).toMatchObject({ status: 'ready' });
  await page.getByRole('combobox', { name: 'Filter planning by status' }).selectOption('ready');
  await expect(page.getByLabel(`Status for ${featureTitle}`)).toHaveValue('ready');

  await featureLink.click();
  await expect(page.getByRole('heading', { name: 'Feature detail' })).toBeVisible();
  const featureId = new URL(page.url()).pathname.split('/').at(-1)!;
  await page.getByLabel('Task title').fill(`First task ${suffix}`);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(`First task ${suffix}`, { exact: true })).toBeVisible();
  await page.getByLabel('Task title').fill(`Second task ${suffix}`);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(`Second task ${suffix}`, { exact: true })).toBeVisible();
  await page.getByLabel('Acceptance criterion').fill(`Criterion ${suffix}`);
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await expect(page.getByText(`Criterion ${suffix}`, { exact: true })).toBeVisible();
  await page.getByLabel('Acceptance criterion').fill(`Second criterion ${suffix}`);
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await expect(page.getByText(`Second criterion ${suffix}`, { exact: true })).toBeVisible();
  const criterionPath = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${featureId}/acceptance-criteria`;
  const beforeReorder = await (await page.request.get(criterionPath)).json();
  expect(beforeReorder).toHaveLength(2);
  const firstCriterionRow = page.getByRole('listitem').last();
  const criterionReorder = page.waitForResponse(
    (response) =>
      response.url().includes('/acceptance-criteria/reorder') &&
      response.request().method() === 'POST',
  );
  await firstCriterionRow.getByRole('button', { name: 'Move criterion up' }).click();
  expect((await criterionReorder).ok()).toBe(true);
  let criteria = await (await page.request.get(criterionPath)).json();
  expect(criteria.map((item: { description: string }) => item.description)).toEqual(
    beforeReorder.map((item: { description: string }) => item.description).reverse(),
  );
  const primaryCriterion = page
    .getByRole('listitem')
    .filter({ has: page.getByText(`Criterion ${suffix}`, { exact: true }) });
  await primaryCriterion.getByRole('button', { name: 'Edit criterion' }).click();
  const safeCriterion = `Updated <script>no-run</script> ${suffix}`;
  await page.getByLabel(`Edit criterion Criterion ${suffix}`).fill(safeCriterion);
  await primaryCriterion.getByRole('button', { name: 'Save criterion' }).click();
  await expect(page.getByText(safeCriterion, { exact: true })).toBeVisible();
  await page.getByLabel('Work item notes').fill(`Notes **stay text**\nLine two ${suffix}`);
  await page.getByRole('button', { name: 'Save feature' }).click();
  await expect(page.getByLabel('Work item notes')).toHaveValue(
    `Notes **stay text**\nLine two ${suffix}`,
  );

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
  await expect(page.getByText(safeCriterion, { exact: true })).toBeVisible();

  const overview = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/planning/overview`,
  );
  const planning = await overview.json();
  const feature = planning.epics
    .flatMap(
      (epic: { features: Array<{ id: string; title: string; status: string }> }) => epic.features,
    )
    .find((item: { title: string }) => item.title === featureTitle);
  expect(feature).toMatchObject({ title: featureTitle, status: 'ready' });
  expect(feature.kind).toBe('story');
  const epic = planning.epics.find((item: { title: string }) => item.title === epicTitle);
  expect(epic).toMatchObject({ priority: 'high', tags: ['AI', 'Research'], feature_count: 2 });
  expect(feature.tags).toEqual(['AI', 'Research']);
  const tasksResponse = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${feature.id}/tasks`,
  );
  const tasks = await tasksResponse.json();
  expect(tasks.map((item: { title: string }) => item.title)).toEqual([
    `Second task ${suffix}`,
    `First task ${suffix}`,
  ]);
  expect(tasks[0].status).toBe('done');
  criteria = await (await page.request.get(criterionPath)).json();
  expect(criteria).toEqual(
    expect.arrayContaining([expect.objectContaining({ description: safeCriterion })]),
  );
  expect(feature.notes).toBe(`Notes **stay text**\nLine two ${suffix}`);
  await page.reload();
  await expect(page.getByText(`Second task ${suffix}`, { exact: true })).toBeVisible();
  await expect(page.getByText(safeCriterion, { exact: true })).toBeVisible();
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

test('PA-PLAN-004 creates a structured Bug with a durable screenshot from the product UI', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createProject(page, `Bug ${suffix}`);
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  await page.getByLabel('Feature title').fill(`Bug ${suffix}`);
  await page.getByRole('button', { name: 'Bug', exact: true }).click();
  await page.getByLabel('Feature tags').fill('Desktop, Regression');
  await page.getByLabel('Bug severity').selectOption('critical');
  await page.getByLabel('Steps to reproduce').fill('Open the workspace and select a project.');
  await page.getByLabel('Expected result').fill('The project opens.');
  await page.getByLabel('Actual result').fill('The view remains blank.');
  await page.getByRole('button', { name: 'Create Feature' }).click();

  const bugLink = page.getByRole('link', { name: `Bug ${suffix}`, exact: true });
  await expect(bugLink).toBeVisible();
  const planning = await (
    await page.request.get(
      `/api/v1/workspaces/${workspace.id}/projects/${project.id}/planning/overview`,
    )
  ).json();
  const bug = planning.unassigned_features.find(
    (item: { title: string }) => item.title === `Bug ${suffix}`,
  );
  expect(bug).toMatchObject({
    kind: 'bug',
    bug_severity: 'critical',
    steps_to_reproduce: 'Open the workspace and select a project.',
    expected_result: 'The project opens.',
    actual_result: 'The view remains blank.',
    tags: ['Desktop', 'Regression'],
  });

  await bugLink.click();
  await expect(page.getByRole('heading', { name: 'Feature detail' })).toBeVisible();
  const png = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082',
    'hex',
  );
  const upload = page.waitForResponse(
    (response) =>
      response.url().includes(`/features/${bug.id}/attachments`) &&
      response.request().method() === 'POST',
  );
  const screenshotPicker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add Bug screenshot' }).click();
  const fileChooser = await screenshotPicker;
  await fileChooser.setFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: png,
  });
  expect((await upload).ok()).toBe(true);
  await expect(page.getByRole('img', { name: 'Bug screenshot: synthetic.png' })).toBeVisible();
  await page.getByLabel('Work item notes').fill(`Bug report ${suffix}\nSecond line`);
  await page.getByRole('button', { name: 'Save feature' }).click();
  await page.reload();
  await expect(page.getByRole('img', { name: 'Bug screenshot: synthetic.png' })).toBeVisible();
  await expect(page.getByLabel('Work item notes')).toHaveValue(`Bug report ${suffix}\nSecond line`);
});

test('PA-PLAN-005 Epics and Work Items persist across all five workflow columns', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createProject(page, suffix);
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  const epicTitle = `Workflow Epic ${suffix}`;
  const storyTitle = `Workflow Story ${suffix}`;
  await page.getByLabel('Epic title').fill(epicTitle);
  await page.getByRole('button', { name: 'Create Epic' }).click();
  await page.getByLabel('Feature title').fill(storyTitle);
  await page.getByLabel('Epic for new feature').selectOption({ label: epicTitle });
  await page.getByRole('button', { name: 'Create Feature' }).click();
  await expect(page.getByRole('link', { name: storyTitle, exact: true })).toBeVisible();

  const overviewPath = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/planning/overview`;
  const initialOverview = await (await page.request.get(overviewPath)).json();
  const epic = initialOverview.epics.find((item: { title: string }) => item.title === epicTitle);
  const feature = epic.features.find((item: { title: string }) => item.title === storyTitle);
  const statuses = ['backlog', 'ready', 'in_progress', 'verify', 'done'];

  for (const status of statuses) {
    const response = page.waitForResponse(
      (item) =>
        item.url().includes(`/epics/${epic.id}`) &&
        item.request().method() === 'PATCH' &&
        item.request().postData()?.includes(`"status":"${status}"`) === true,
    );
    await page.getByLabel(`Status for Epic ${epicTitle}`).selectOption(status);
    expect((await response).ok()).toBeTruthy();
    const persisted = await (await page.request.get(overviewPath)).json();
    expect(persisted.epics.find((item: { id: string }) => item.id === epic.id).status).toBe(status);
  }

  for (const status of statuses) {
    const response = page.waitForResponse(
      (item) =>
        item.url().includes(`/features/${feature.id}`) &&
        item.request().method() === 'PATCH' &&
        item.request().postData()?.includes(`"status":"${status}"`) === true,
    );
    await page.getByLabel(`Status for ${storyTitle}`).selectOption(status);
    expect((await response).ok()).toBeTruthy();
    const persisted = await (await page.request.get(overviewPath)).json();
    const storedEpic = persisted.epics.find((item: { id: string }) => item.id === epic.id);
    expect(storedEpic.features.find((item: { id: string }) => item.id === feature.id).status).toBe(
      status,
    );
  }

  await page.reload();
  await expect(page.getByLabel(`Status for Epic ${epicTitle}`)).toHaveValue('done');
  await expect(page.getByLabel(`Status for ${storyTitle}`)).toHaveValue('done');
});
