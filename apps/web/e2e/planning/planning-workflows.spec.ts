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

async function createWorkspaceTags(page: Page, workspaceId: string, names: string[]) {
  await page.goto(`/workspaces/${workspaceId}/settings`);
  for (const name of names) {
    await page.getByRole('button', { name: 'New tag', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Edit workspace tags', exact: true });
    await editor.getByRole('textbox', { name: 'New tag name', exact: true }).fill(name);
    const created = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/workspaces/${workspaceId}/tags`) &&
        response.request().method() === 'POST',
    );
    await editor.getByRole('button', { name: 'Create workspace tag', exact: true }).click();
    expect((await created).status()).toBe(201);
    await expect(editor).not.toBeVisible();
    await expect(
      page.getByRole('region', { name: /^Tags in / }).getByText(`# ${name}`, { exact: true }),
    ).toBeVisible();
  }
}

async function openEpicDialog(page: Page) {
  await page.getByRole('button', { name: 'New Epic', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'New Epic', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'New Epic', exact: true })).toBeInViewport();
  return dialog;
}

async function openWorkItemDialog(page: Page) {
  if (page.url().includes('/epics/')) {
    await page.getByRole('button', { name: /New Work Item/ }).click();
    const dialog = page.getByRole('dialog', { name: /^Create Work Item$/i });
    await expect(dialog).toBeVisible();
    return dialog;
  }
  const boardMenu = page.locator('details').filter({
    has: page.locator('summary').filter({ hasText: /^Board/ }),
  });
  if (!(await boardMenu.evaluate((element: HTMLDetailsElement) => element.open))) {
    await boardMenu.locator('summary').press('Enter');
  }
  await expect(boardMenu).toHaveAttribute('open', '');
  await boardMenu.getByRole('button', { name: 'New work item', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /^Create work item$/i });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function closeProjectBoardMenu(page: Page) {
  const boardMenu = page.locator('details').filter({
    has: page.locator('summary').filter({ hasText: /^Board/ }),
  });
  if (await boardMenu.evaluate((element: HTMLDetailsElement) => element.open)) {
    await boardMenu.locator('summary').press('Enter');
  }
  await expect(boardMenu).not.toHaveAttribute('open', '');
}

function projectWorkItemStatus(page: Page, title: string) {
  const prefix = page.url().includes('/epics/')
    ? 'Status'
    : test.info().project.name === 'chromium-mobile'
      ? 'Mobile status'
      : 'Status';
  return page.getByRole('combobox', {
    name: `${prefix} for ${title}`,
    exact: true,
  });
}

test.skip('PA-PLAN-001 legacy work-item board contract', async ({ page }) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createProject(page, suffix);
  await createWorkspaceTags(page, workspace.id, ['AI', 'Research']);
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  await expect(
    page.getByRole('heading', { name: `Project ${suffix} · Epics`, exact: true }),
  ).toBeVisible();

  const epicTitle = `Epic ${suffix}`;
  const epicDialog = await openEpicDialog(page);
  await epicDialog.getByLabel('Epic title').fill(epicTitle);
  await epicDialog.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('high');
  await epicDialog.getByRole('checkbox', { name: 'Epic tag AI', exact: true }).check();
  await epicDialog.getByRole('checkbox', { name: 'Epic tag Research', exact: true }).check();
  await epicDialog.getByRole('button', { name: 'Create Epic', exact: true }).click();
  await expect(epicDialog).not.toBeVisible();
  const epicCard = page.locator('[data-state="backlog"]').filter({
    has: page.getByRole('link', { name: epicTitle, exact: true }),
  });
  if (test.info().project.name === 'chromium-mobile') {
    await expect(epicCard).toContainText('Priority: high');
    await expect(epicCard.getByRole('list', { name: `${epicTitle} tags` })).toContainText('AI');
  } else {
    await expect(epicCard).toContainText('EPIC · high');
    await expect(epicCard).toContainText('0 items · ai');
  }

  const featureTitle = `Feature ${suffix}`;
  const featureDialog = await openWorkItemDialog(page);
  await featureDialog.getByLabel('Feature title').fill(featureTitle);
  await featureDialog.getByLabel('Epic for new feature').selectOption({ label: epicTitle });
  await featureDialog.getByRole('checkbox', { name: 'Work item tag AI', exact: true }).check();
  await featureDialog
    .getByRole('checkbox', { name: 'Work item tag Research', exact: true })
    .check();
  await featureDialog.getByRole('button', { name: 'Create Feature', exact: true }).click();
  await expect(featureDialog).not.toBeVisible();
  await closeProjectBoardMenu(page);
  const featureLink = page.getByRole('link', { name: featureTitle, exact: true });
  await expect(featureLink).toBeVisible();
  const untaggedTitle = `Untagged ${suffix}`;
  const untaggedDialog = await openWorkItemDialog(page);
  await untaggedDialog.getByLabel('Feature title').fill(untaggedTitle);
  await untaggedDialog.getByLabel('Epic for new feature').selectOption({ label: epicTitle });
  await expect(
    untaggedDialog.getByRole('checkbox', { name: 'Work item tag AI', exact: true }),
  ).not.toBeChecked();
  await expect(
    untaggedDialog.getByRole('checkbox', { name: 'Work item tag Research', exact: true }),
  ).not.toBeChecked();
  await untaggedDialog.getByRole('button', { name: 'Create Feature', exact: true }).click();
  await expect(untaggedDialog).not.toBeVisible();
  await closeProjectBoardMenu(page);
  const untaggedLink = page.getByRole('link', { name: untaggedTitle, exact: true });
  await expect(untaggedLink).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter planning by tag' }).selectOption('Research');
  await expect(featureLink).toBeVisible();
  await expect(untaggedLink).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Filter planning by tag' }).selectOption('');

  await page.getByRole('searchbox', { name: 'Search planning' }).fill('no such planning result');
  await expect(featureLink).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search planning' }).fill(featureTitle);
  const featureStatus = projectWorkItemStatus(page, featureTitle);
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
    await featureStatus.selectOption('ready');
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
  await expect(featureStatus).toHaveValue('ready');

  await featureLink.click();
  await expect(page.getByRole('heading', { name: 'Work item detail', exact: true })).toBeVisible();
  const featureId = new URL(page.url()).pathname.split('/').at(-1)!;
  await page
    .locator('summary')
    .filter({ hasText: /^Add task$/ })
    .click();
  await page.getByLabel('Task title').fill(`First task ${suffix}`);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(`First task ${suffix}`, { exact: true })).toBeVisible();
  await page.getByLabel('Task title').fill(`Second task ${suffix}`);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByText(`Second task ${suffix}`, { exact: true })).toBeVisible();
  await page.getByText('Add acceptance criterion', { exact: true }).click();
  await page.getByLabel('Acceptance criterion').fill(`Criterion ${suffix}`);
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await expect(page.getByText(`Criterion ${suffix}`, { exact: true })).toBeVisible();
  await page.getByLabel('Acceptance criterion').fill(`Second criterion ${suffix}`);
  await page.getByRole('button', { name: 'Add criterion' }).click();
  await expect(page.getByText(`Second criterion ${suffix}`, { exact: true })).toBeVisible();
  const criterionPath = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${featureId}/acceptance-criteria`;
  const beforeReorder = await (await page.request.get(criterionPath)).json();
  expect(beforeReorder).toHaveLength(2);
  const firstCriterionRow = page.getByRole('listitem').filter({
    has: page.getByText(`Second criterion ${suffix}`, { exact: true }),
  });
  const criterionReorder = page.waitForResponse(
    (response) =>
      response.url().includes('/acceptance-criteria/reorder') &&
      response.request().method() === 'POST',
  );
  await firstCriterionRow.getByText('More criterion actions', { exact: true }).click();
  await firstCriterionRow.getByRole('button', { name: 'Move up', exact: true }).click();
  expect((await criterionReorder).ok()).toBe(true);
  let criteria = await (await page.request.get(criterionPath)).json();
  expect(criteria.map((item: { description: string }) => item.description)).toEqual(
    beforeReorder.map((item: { description: string }) => item.description).reverse(),
  );
  const primaryCriterion = page
    .getByRole('listitem')
    .filter({ has: page.getByText(`Criterion ${suffix}`, { exact: true }) });
  await primaryCriterion.getByText('More criterion actions', { exact: true }).click();
  await primaryCriterion.getByRole('button', { name: 'Edit', exact: true }).click();
  const safeCriterion = `Updated <script>no-run</script> ${suffix}`;
  await page.getByLabel(`Edit criterion Criterion ${suffix}`).fill(safeCriterion);
  await primaryCriterion.getByRole('button', { name: 'Save criterion' }).click();
  await expect(page.getByText(safeCriterion, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await page.getByLabel('Work item notes').fill(`Notes **stay text**\nLine two ${suffix}`);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Notes', exact: true })
      .getByText(`Notes **stay text**\nLine two ${suffix}`, { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await expect(page.getByLabel('Work item notes')).toHaveValue(
    `Notes **stay text**\nLine two ${suffix}`,
  );
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

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
  await expect(
    page
      .getByRole('region', { name: 'Notes', exact: true })
      .getByText(`Notes **stay text**\nLine two ${suffix}`, { exact: true }),
  ).toBeVisible();
});

test('PA-PLAN-001 current Epic Board filters and opens Epic detail', async ({ page }) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createProject(page, suffix);
  await createWorkspaceTags(page, workspace.id, ['Research']);
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  await expect(page.getByTestId('project-epic-board')).toHaveCSS('overflow-y', 'hidden');
  await expect(page.getByTestId('kanban-column-backlog').locator('[data-state]')).toHaveCSS(
    'overflow-y',
    'auto',
  );

  const epicTitle = `Epic ${suffix}`;
  const epicDialog = await openEpicDialog(page);
  await epicDialog.getByLabel('Epic title').fill(epicTitle);
  await epicDialog.getByRole('checkbox', { name: 'Epic tag Research', exact: true }).check();
  await epicDialog.getByRole('button', { name: 'Create Epic', exact: true }).click();
  await expect(epicDialog).not.toBeVisible();
  const epicCard = page.locator('[data-state="backlog"]').filter({
    has: page.getByRole('link', { name: epicTitle, exact: true }),
  });
  await expect(epicCard).toBeVisible();
  await expect(epicCard).toHaveAttribute('draggable', 'true');
  const movedEpic = page.waitForResponse(
    (response) => response.url().includes('/epics/') && response.request().method() === 'PATCH',
  );
  await epicCard.dragTo(page.getByTestId('kanban-column-ready').locator(':scope > div'), {
    sourcePosition: { x: 8, y: 8 },
  });
  expect((await movedEpic).status()).toBe(200);
  await expect(
    page.getByTestId('kanban-column-ready').getByRole('link', { name: epicTitle, exact: true }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter Epics by tag' }).selectOption('Research');
  await expect(
    page.getByTestId('kanban-column-ready').getByRole('link', { name: epicTitle, exact: true }),
  ).toBeVisible();

  await page.getByRole('combobox', { name: 'Filter Epics by tag' }).selectOption('');
  await page.getByRole('link', { name: epicTitle, exact: true }).click();
  await expect(page.getByRole('heading', { name: epicTitle, exact: true })).toBeVisible();
});

test('PA-PLAN-002 current board documents manual planning relationships', async ({ page }) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createProject(page, `Planning ${suffix}`);
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  const boardMenu = page.locator('details').filter({
    has: page.locator('summary').filter({ hasText: /^Board/ }),
  });
  await boardMenu.locator('summary').click();
  await expect(
    page.getByText('Planning status and dependencies are manual product records only.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Blocking feature')).toHaveCount(0);
  await expect(page.getByLabel('Blocked feature')).toHaveCount(0);
});

test('PA-PLAN-LEGACY Epic creation remains visible after a legacy database upgrade @legacy-epic', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.FORGE_E2E_EPIC_LEGACY_FIXTURE !== '1',
    'This acceptance runs only with its isolated upgraded legacy SQLite fixture.',
  );
  const workspaceId = 'legacy-workspace';
  const projectId = 'legacy-project';
  const overviewPath = `/api/v1/workspaces/${workspaceId}/projects/${projectId}/planning/overview`;
  await page.goto(`/planning/${workspaceId}/${projectId}`);
  await expect(
    page.getByRole('heading', { name: 'Legacy Board · Epics', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Legacy planning Epic' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Legacy planned Epic' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Archived Epics' })).toContainText('Archived Epic');
  await expect(page.getByRole('region', { name: 'Legacy Epics' })).toContainText('custom_legacy');
  await expect(page.getByRole('region', { name: 'Epic visibility summary' })).toContainText(
    '4 total · 2 in workflow · 1 archived · 1 legacy',
  );

  const before = await (await page.request.get(overviewPath)).json();
  expect(before.epics).toHaveLength(4);
  const epicDialog = await openEpicDialog(page);
  await epicDialog.getByLabel('Epic title').fill('testing');
  const createdResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/workspaces/${workspaceId}/projects/${projectId}/epics`) &&
      response.request().method() === 'POST',
  );
  await epicDialog.getByRole('button', { name: 'Create Epic', exact: true }).click();
  expect((await createdResponse).status()).toBe(201);
  await expect(epicDialog).not.toBeVisible();

  const createdCard = page.locator('[data-state="backlog"]').filter({
    has: page.getByRole('link', { name: 'testing', exact: true }),
  });
  await expect(createdCard).toBeVisible();
  await expect(page.getByRole('region', { name: 'Epic visibility summary' })).toContainText(
    '5 total · 3 in workflow · 1 archived · 1 legacy',
  );
  const freshEpicDialog = await openEpicDialog(page);
  await expect(freshEpicDialog.getByLabel('Epic title')).toHaveValue('');
  await freshEpicDialog.press('Escape');
  await expect(freshEpicDialog).not.toBeVisible();
  await expect(page).toHaveURL(`/planning/${workspaceId}/${projectId}`);
  await page.screenshot({
    path: process.env.FORGE_E2E_EVIDENCE_DIR
      ? `${process.env.FORGE_E2E_EVIDENCE_DIR}/upgraded-epic-board.png`
      : testInfo.outputPath('upgraded-epic-board.png'),
    fullPage: true,
  });
});

test.skip('PA-PLAN-002 legacy dependency panel contract', async ({ page }) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createProject(page, `Dependency ${suffix}`);
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  for (const title of [`Blocker ${suffix}`, `Blocked ${suffix}`]) {
    const dialog = await openWorkItemDialog(page);
    await dialog.getByLabel('Feature title').fill(title);
    await dialog.getByRole('button', { name: 'Create Feature', exact: true }).click();
    await expect(dialog).not.toBeVisible();
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
  const epicDialog = await openEpicDialog(page);
  await epicDialog.getByLabel('Epic title').fill(`Epic ${suffix}`);
  await epicDialog.getByRole('button', { name: 'Create Epic', exact: true }).click();
  await expect(epicDialog).not.toBeVisible();

  await page.getByRole('link', { name: `Epic ${suffix}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: `Epic ${suffix}`, exact: true })).toBeVisible();
  const epicBoard = page.getByRole('region', { name: 'Epic Board', exact: true });
  await expect(epicBoard).toBeVisible();
  const featureDialog = await openWorkItemDialog(page);
  await featureDialog.getByLabel('Work Item title').fill(`Feature ${suffix}`);
  await featureDialog.getByRole('button', { name: 'Create Work Item', exact: true }).click();
  await expect(featureDialog).not.toBeVisible();
  if (test.info().project.name === 'chromium-mobile') {
    const otherStatuses = page.locator('details').filter({
      has: page.locator('summary').filter({ hasText: /^Other workflow statuses/ }),
    });
    await otherStatuses.getByText('Other workflow statuses', { exact: true }).click();
    await expect(
      otherStatuses.getByRole('link', { name: `Feature ${suffix}`, exact: true }),
    ).toBeVisible();
  } else {
    await expect(
      epicBoard.getByRole('link', { name: `Feature ${suffix}`, exact: true }),
    ).toBeVisible();
  }
  await page.screenshot({ path: test.info().outputPath('epic-detail.png'), fullPage: true });
  await page.getByRole('button', { name: 'Edit Epic', exact: true }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit Epic', exact: true });
  await expect(editDialog.getByLabel('Epic title')).toHaveValue(`Epic ${suffix}`);
  await editDialog.getByLabel('Epic title').fill(`Updated Epic ${suffix}`);
  await editDialog.getByLabel('Epic status').selectOption('in_progress');
  await editDialog.getByRole('button', { name: 'Save Epic', exact: true }).click();
  await expect(editDialog).not.toBeVisible();
  await expect(page.getByText('Epic saved.')).toBeVisible();
  const overviewPath = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/planning/overview`;
  let overview = await (await page.request.get(overviewPath)).json();
  let epic = overview.epics.find(
    (item: { title: string }) => item.title === `Updated Epic ${suffix}`,
  );
  expect(epic).toMatchObject({ status: 'in_progress' });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: `Updated Epic ${suffix}`, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit Epic', exact: true }).click();
  await expect(editDialog.getByLabel('Epic title')).toHaveValue(`Updated Epic ${suffix}`);
  await expect(editDialog.getByLabel('Epic status')).toHaveValue('in_progress');
  await editDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(editDialog).not.toBeVisible();
  if (test.info().project.name === 'chromium-mobile') {
    await page.getByText('Other workflow statuses', { exact: true }).click();
  }
  await page.getByRole('link', { name: `Feature ${suffix}` }).click();
  await expect(page.getByRole('heading', { name: 'Work item detail', exact: true })).toBeVisible();
  overview = await (await page.request.get(overviewPath)).json();
  epic = overview.epics.find((item: { title: string }) => item.title === `Updated Epic ${suffix}`);
  expect(epic.features.map((item: { title: string }) => item.title)).toContain(`Feature ${suffix}`);
});

test('PA-PLAN-004 creates a structured Bug with a durable screenshot from the product UI', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createProject(page, `Bug ${suffix}`);
  await createWorkspaceTags(page, workspace.id, ['Desktop', 'Regression']);
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  const bugDialog = await openWorkItemDialog(page);
  await bugDialog.getByLabel('Feature title').fill(`Bug ${suffix}`);
  await bugDialog.getByRole('button', { name: 'Bug', exact: true }).click();
  await bugDialog.getByRole('checkbox', { name: 'Work item tag Desktop', exact: true }).check();
  await bugDialog.getByRole('checkbox', { name: 'Work item tag Regression', exact: true }).check();
  await bugDialog.getByLabel('Bug severity').selectOption('critical');
  await bugDialog.getByLabel('Steps to reproduce').fill('Open the workspace and select a project.');
  await bugDialog.getByLabel('Expected result').fill('The project opens.');
  await bugDialog.getByLabel('Actual result').fill('The view remains blank.');
  await bugDialog.getByRole('button', { name: 'Create Feature', exact: true }).click();
  await expect(bugDialog).not.toBeVisible();
  await closeProjectBoardMenu(page);

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

  await page.goto(`/planning/${workspace.id}/${project.id}/features/${bug.id}`);
  await expect(page.getByRole('heading', { name: 'Work item detail', exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await page.getByLabel('Work item notes').fill(`Bug report ${suffix}\nSecond line`);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Notes', exact: true })
      .getByText(`Bug report ${suffix}\nSecond line`, { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('img', { name: 'Bug screenshot: synthetic.png' })).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Notes', exact: true })
      .getByText(`Bug report ${suffix}\nSecond line`, { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
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
  const epicDialog = await openEpicDialog(page);
  await epicDialog.getByLabel('Epic title').fill(epicTitle);
  await epicDialog.getByRole('button', { name: 'Create Epic', exact: true }).click();
  await expect(epicDialog).not.toBeVisible();
  const featureDialog = await openWorkItemDialog(page);
  await featureDialog.getByLabel('Feature title').fill(storyTitle);
  await featureDialog.getByLabel('Epic for new feature').selectOption({ label: epicTitle });
  await featureDialog.getByRole('button', { name: 'Create Feature', exact: true }).click();
  await expect(featureDialog).not.toBeVisible();
  await closeProjectBoardMenu(page);

  const overviewPath = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/planning/overview`;
  const initialOverview = await (await page.request.get(overviewPath)).json();
  const epic = initialOverview.epics.find((item: { title: string }) => item.title === epicTitle);
  const feature = epic.features.find((item: { title: string }) => item.title === storyTitle);
  expect(epic.status).toBe('backlog');
  expect(feature.status).toBe('backlog');
  const statuses = ['ready', 'in_progress', 'verify', 'done'];

  for (const status of statuses) {
    const response = page.waitForResponse(
      (item) =>
        item.url().includes(`/epics/${epic.id}`) &&
        item.request().method() === 'PATCH' &&
        item.request().postData()?.includes(`"status":"${status}"`) === true,
    );
    if (test.info().project.name === 'chromium-mobile') {
      await page.getByLabel(`Status for Epic ${epicTitle}`).selectOption(status);
    } else {
      await page.getByRole('link', { name: epicTitle, exact: true }).click();
      await page.getByRole('button', { name: 'Edit Epic', exact: true }).click();
      const editDialog = page.getByRole('dialog', { name: 'Edit Epic', exact: true });
      await editDialog.getByLabel('Epic status').selectOption(status);
      await editDialog.getByRole('button', { name: 'Save Epic', exact: true }).click();
      await expect(editDialog).not.toBeVisible();
      await page.goto(`/planning/${workspace.id}/${project.id}`);
    }
    expect((await response).ok()).toBeTruthy();
    const persisted = await (await page.request.get(overviewPath)).json();
    expect(persisted.epics.find((item: { id: string }) => item.id === epic.id).status).toBe(status);
  }

  await page.goto(`/planning/${workspace.id}/${project.id}/features/${feature.id}`);
  for (const status of statuses) {
    const response = page.waitForResponse(
      (item) =>
        item.url().includes(`/features/${feature.id}`) &&
        item.request().method() === 'PATCH' &&
        item.request().postData()?.includes(`"status":"${status}"`) === true,
    );
    await page.getByRole('combobox', { name: 'Work item status' }).selectOption(status);
    expect((await response).ok()).toBeTruthy();
    const persisted = await (await page.request.get(overviewPath)).json();
    const storedEpic = persisted.epics.find((item: { id: string }) => item.id === epic.id);
    expect(storedEpic.features.find((item: { id: string }) => item.id === feature.id).status).toBe(
      status,
    );
  }

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Work item status' })).toHaveValue('done');
  await page.goto(`/planning/${workspace.id}/${project.id}`);
  if (test.info().project.name === 'chromium-mobile') {
    await expect(page.getByLabel(`Status for Epic ${epicTitle}`)).toHaveValue('done');
  } else {
    await expect(
      page.locator('[data-state="done"]').getByRole('link', { name: epicTitle, exact: true }),
    ).toBeVisible();
  }
});
