import { expect, test, type Locator, type Page } from '@playwright/test';

async function seed(page: Page) {
  async function post(path: string, data: unknown) {
    const response = await page.request.post(path, { data });
    expect(response.status(), await response.text()).toBe(201);
    return response.json();
  }
  const workspace = await post('/api/v1/workspaces', { name: `Personal ${Date.now()}` });
  const project = await post(`/api/v1/workspaces/${workspace.id}/projects`, { name: 'FormiAI' });
  const root = `/api/v1/workspaces/${workspace.id}/projects/${project.id}`;
  for (const name of ['computer-vision', 'ml-research', 'tracking']) {
    await post(`/api/v1/workspaces/${workspace.id}/tags`, { name, color: '#6b7280' });
  }
  const epic = await post(`${root}/epics`, {
    title: 'Detection Research',
    description: 'Build reliable ant detection: models, datasets and validation.',
    priority: 'high',
    tags: ['computer-vision'],
  });
  const story = await post(`${root}/features`, {
    epic_id: epic.id,
    title: 'Improve detector V2 accuracy',
    kind: 'story',
    description:
      'Improve detection accuracy on dense ant scenes while preserving inference speed. Evaluate precision, recall and edge cases before promotion.',
    priority: 'high',
    status: 'in_progress',
    tags: ['computer-vision', 'ml-research'],
    notes:
      'Latest experiment shows improvements in crowded frames. Compare against V2-E2 and attach evaluation observations here.',
  });
  for (const [index, description] of [
    'AP improves against the baseline on blind data',
    'False positives remain below the agreed threshold',
    'Dense-scene benchmark is documented',
  ].entries()) {
    await post(`${root}/features/${story.id}/acceptance-criteria`, {
      description,
      satisfied: index < 2,
      position: index,
    });
  }
  for (const [index, title] of [
    'Review model outputs',
    'Compare metrics with GT',
    'Produce benchmark report',
  ].entries()) {
    await post(`${root}/features/${story.id}/tasks`, {
      title,
      status: index === 0 ? 'done' : 'todo',
      position: index,
    });
  }
  const gpuStory = await post(`${root}/features`, {
    title: 'GPU batch inference',
    kind: 'story',
    status: 'ready',
    epic_id: epic.id,
    tags: ['CUDA'],
  });
  for (let index = 0; index < 3; index += 1) {
    await post(`${root}/features/${gpuStory.id}/acceptance-criteria`, {
      description: `Synthetic acceptance criterion ${index + 1}`,
      satisfied: index < 2,
      position: index,
    });
  }
  const bug = await post(`${root}/features`, {
    epic_id: epic.id,
    title: 'Bounding boxes drift during playback',
    kind: 'bug',
    priority: 'high',
    status: 'verify',
    bug_severity: 'high',
    tags: ['tracking'],
    steps_to_reproduce:
      'Load an analyzed video with tracking enabled\nJump between timeline segments repeatedly\nObserve bounding boxes after seeking',
    actual_result:
      'Bounding boxes lag behind moving ants after seeking, causing visible misalignment.',
    expected_result: 'Overlays stay synchronized with the current frame and tracking positions.',
    notes: 'Observed in Chromium and the installed Desktop app. Investigate frame timing.',
  });
  for (const [title, kind, status] of [
    ['Dense-scene labeling', 'story', 'backlog'],
    ['Bounding box drift', 'bug', 'backlog'],
    ['Baseline dataset', 'story', 'done'],
  ]) {
    await post(`${root}/features`, {
      title,
      kind,
      status,
      epic_id: epic.id,
      tags: [],
      ...(title === 'Bounding box drift' ? { priority: 'high' } : {}),
    });
  }
  const path = `/planning/${workspace.id}/${project.id}`;
  return { root, path, epic, story, bug };
}

async function geometry(
  locator: Locator,
  expected: { x: number; y: number; width: number; height: number },
) {
  await expect(locator).toBeVisible();
  const actual = await locator.boundingBox();
  expect(actual).not.toBeNull();
  await test.info().attach(`geometry-${locator.toString()}`, {
    body: JSON.stringify({ expected, actual }),
    contentType: 'application/json',
  });
  for (const dimension of ['x', 'y', 'width', 'height'] as const) {
    expect(actual![dimension], `${dimension}: ${JSON.stringify(actual)}`).toBe(expected[dimension]);
  }
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test.beforeEach(async ({ page }, info) => {
  await page.setViewportSize(
    info.project.name === 'chromium-mobile'
      ? { width: 390, height: 844 }
      : { width: 1440, height: 960 },
  );
});

test('UX-03 exact Epic board geometry, type filtering and durable status move', async ({
  page,
}, info) => {
  const { path, root, epic, story } = await seed(page);
  await page.goto(`${path}/epics/${epic.id}`);
  await expect(page.getByRole('heading', { name: epic.title, exact: true })).toBeVisible();
  if (info.project.name === 'chromium-desktop') {
    await geometry(page.getByRole('region', { name: 'Epic context' }), {
      x: 268,
      y: 211,
      width: 1148,
      height: 78,
    });
    await geometry(page.getByTestId('epic-work-item-board'), {
      x: 268,
      y: 368,
      width: 1148,
      height: 563,
    });
    await geometry(page.getByTestId('kanban-column-backlog'), {
      x: 268,
      y: 368,
      width: 222,
      height: 563,
    });
    await page.getByRole('combobox', { name: 'Filter Work Items by type' }).selectOption('bug');
    await expect(page.getByRole('link', { name: story.title, exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Bounding box drift', exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Filter Work Items by type' }).selectOption('all');
    const card = page.getByRole('article', { name: story.title, exact: true });
    await card.dragTo(page.getByTestId('kanban-column-ready'));
  } else {
    await page.getByRole('tab', { name: /in progress/i }).click();
    await page
      .getByRole('article', { name: story.title, exact: true })
      .getByText('Move', { exact: true })
      .click();
    await page
      .getByRole('combobox', { name: `Status for ${story.title}`, exact: true })
      .selectOption('ready');
  }
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`${root}/planning/overview`)).json()).epics
          .find((item: { id: string }) => item.id === epic.id)
          .features.find((item: { id: string }) => item.id === story.id).status,
    )
    .toBe('ready');
  await page.reload();
  if (info.project.name === 'chromium-mobile')
    await page.getByRole('tab', { name: /^ready\b/i }).click();
  await expect(page.getByRole('link', { name: story.title, exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('ux03-epic.png') });
});

test('UX-04 Story panels, criteria, task status and notes persist', async ({ page }, info) => {
  const { path, root, story } = await seed(page);
  await page.goto(`${path}/features/${story.id}`);
  const description = page.getByRole('region', { name: 'Description', exact: true });
  const criteria = page.getByRole('region', { name: 'Acceptance criteria', exact: true });
  const tasks = page.getByRole('region', { name: 'Tasks', exact: true });
  await expect(description).toBeVisible();
  if (info.project.name === 'chromium-desktop') {
    await geometry(description, { x: 268, y: 261, width: 751, height: 142 });
    await geometry(criteria, { x: 268, y: 419, width: 751, height: 215 });
    await geometry(page.getByRole('region', { name: 'Notes', exact: true }), {
      x: 268,
      y: 650,
      width: 751,
      height: 168,
    });
    await geometry(page.getByRole('region', { name: 'Properties', exact: true }), {
      x: 1037,
      y: 261,
      width: 379,
      height: 219,
    });
    await geometry(tasks, { x: 1037, y: 496, width: 379, height: 211 });
  }
  await page.screenshot({ path: info.outputPath('ux04-story.png') });
  const satisfaction = page.waitForResponse(
    (response) =>
      response.url().includes('/acceptance-criteria/') && response.request().method() === 'PATCH',
  );
  await criteria
    .getByRole('checkbox', { name: 'Satisfy Dense-scene benchmark is documented' })
    .click();
  expect((await satisfaction).ok()).toBe(true);
  await expect(
    criteria.getByRole('checkbox', { name: 'Satisfy Dense-scene benchmark is documented' }),
  ).toBeChecked();
  await tasks
    .getByRole('combobox', { name: 'Status for Compare metrics with GT' })
    .selectOption('done');
  await expect(
    tasks.getByRole('combobox', { name: 'Status for Compare metrics with GT' }),
  ).toHaveValue('done');
  await page.getByRole('combobox', { name: 'Work item status', exact: true }).selectOption('ready');
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`${root}/planning/overview`)).json()).epics[0].features.find(
          (item: { id: string }) => item.id === story.id,
        ).status,
    )
    .toBe('ready');
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Work item notes' })
    .fill('Synthetic persisted notes\nLine two');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('region', { name: 'Notes', exact: true })).toContainText(
    'Synthetic persisted notes',
  );
  await page.reload();
  await expect(page.getByRole('region', { name: 'Notes', exact: true })).toContainText(
    'Synthetic persisted notes',
  );
  await expect(
    tasks.getByRole('combobox', { name: 'Status for Compare metrics with GT' }),
  ).toHaveValue('done');
  await expect(
    criteria.getByRole('checkbox', { name: 'Satisfy Dense-scene benchmark is documented' }),
  ).toBeChecked();
  await noOverflow(page);
});

test('UX-05 Bug panels and real screenshot upload survive reload', async ({ page }, info) => {
  const { path, bug } = await seed(page);
  await page.goto(`${path}/features/${bug.id}`);
  const reproduce = page.getByRole('region', { name: 'How to reproduce', exact: true });
  await expect(reproduce).toBeVisible();
  if (info.project.name === 'chromium-desktop') {
    await geometry(reproduce, { x: 268, y: 261, width: 752, height: 256 });
    await geometry(page.getByRole('region', { name: 'Actual result', exact: true }), {
      x: 268,
      y: 530,
      width: 370,
      height: 194,
    });
    await geometry(page.getByRole('region', { name: 'Expected result', exact: true }), {
      x: 650,
      y: 530,
      width: 370,
      height: 194,
    });
    await geometry(page.getByRole('region', { name: 'Screenshots', exact: true }), {
      x: 1038,
      y: 261,
      width: 378,
      height: 286,
    });
    await geometry(page.getByRole('region', { name: 'Attach another screenshot', exact: true }), {
      x: 1038,
      y: 560,
      width: 378,
      height: 171,
    });
  }
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add Bug screenshot' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: await page.screenshot({ type: 'png' }),
  });
  const screenshot = page.getByRole('img', { name: 'Bug screenshot: synthetic.png' });
  await expect(screenshot).toBeVisible();
  await page.reload();
  await expect(screenshot).toBeVisible();
  expect(
    await screenshot.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('ux05-bug.png') });
});

test('UX-10 mobile Epic composition matches the exact reference coordinates', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium-mobile', 'The reference node is 390 × 844.');
  const { path, root, epic } = await seed(page);
  const overview = await (await page.request.get(`${root}/planning/overview`)).json();
  const items = overview.epics.find((item: { id: string }) => item.id === epic.id).features;
  for (const [title, status] of [
    ['Dense-scene labeling', 'done'],
    ['Bounding box drift', 'ready'],
  ]) {
    const item = items.find((item: { title: string }) => item.title === title);
    expect(
      (await page.request.patch(`${root}/features/${item.id}`, { data: { status } })).ok(),
    ).toBe(true);
  }
  const readyBug = items.find((item: { title: string }) => item.title === 'Bounding box drift');
  const upload = await page.request.post(`${root}/features/${readyBug.id}/attachments`, {
    data: {
      file_name: 'synthetic-reference.png',
      content_type: 'image/png',
      data_base64:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p3sAAAAASUVORK5CYII=',
    },
  });
  expect(upload.status(), await upload.text()).toBe(201);
  await page.goto(`${path}/epics/${epic.id}`);
  const heading = page.getByRole('heading', { name: epic.title, exact: true });
  await expect(heading).toBeVisible();
  await expect(page.getByText('6 work items · 2 completed', { exact: true })).toBeVisible();
  const tabs = page.getByRole('tablist', { name: 'Epic Work Item status' });
  await expect(tabs.getByRole('tab')).toHaveText(['Ready 2', 'In Progress 1', 'Verify 1']);
  await expect(tabs.getByRole('tab', { name: 'Ready 2' })).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.locator('summary').filter({ hasText: /^(Epic actions|Filter Work Items)$/ }),
  ).toHaveCount(0);
  await geometry(page.getByRole('navigation', { name: 'Breadcrumb' }), {
    x: 18,
    y: 88,
    width: 348,
    height: 19,
  });
  await geometry(heading, { x: 18, y: 121, width: 347, height: 37 });
  await geometry(page.getByText('6 work items · 2 completed', { exact: true }), {
    x: 18,
    y: 172,
    width: 347,
    height: 25,
  });
  await geometry(tabs, { x: 18, y: 211, width: 354, height: 46 });
  await geometry(page.getByRole('heading', { name: 'Ready', exact: true }), {
    x: 18,
    y: 271,
    width: 344,
    height: 30,
  });
  await geometry(page.getByRole('article', { name: 'GPU batch inference', exact: true }), {
    x: 18,
    y: 315,
    width: 354,
    height: 152,
  });
  await geometry(page.getByRole('article', { name: 'Bounding box drift', exact: true }), {
    x: 18,
    y: 481,
    width: 354,
    height: 152,
  });
  await expect(page.getByRole('article', { name: 'GPU batch inference' })).toContainText(
    '3 acceptance criteria · CUDA',
  );
  await expect(page.getByRole('article', { name: 'Bounding box drift' })).toContainText(
    'Screenshot attached · Ready',
  );
  await geometry(page.getByRole('button', { name: '+ New Work Item', exact: true }), {
    x: 18,
    y: 647,
    width: 194,
    height: 42,
  });
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath('ux10-mobile-epic.png') });
});
