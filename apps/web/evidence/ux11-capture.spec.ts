import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type Created = { id: string };

async function postJson<T extends Created>(page: Page, path: string, body: unknown): Promise<T> {
  const response = await page.request.post(path, { data: body });
  expect(response.status(), `${path}: ${await response.text()}`).toBe(201);
  return (await response.json()) as T;
}

async function patchJson(page: Page, path: string, body: unknown) {
  const response = await page.request.patch(path, { data: body });
  expect(response.status(), `${path}: ${await response.text()}`).toBe(200);
  return response.json();
}

async function seedSyntheticProject(page: Page) {
  const workspace = await postJson<{ id: string }>(page, '/api/v1/workspaces', {
    name: 'Personal',
    description: 'Synthetic screenshot evidence only.',
  });
  const project = await postJson<{ id: string }>(
    page,
    `/api/v1/workspaces/${workspace.id}/projects`,
    { name: 'FormiAI', description: 'Observe reliable product signals.' },
  );
  await postJson<{ id: string }>(page, `/api/v1/workspaces/${workspace.id}/projects`, {
    name: 'Forge',
    description: 'Prepare trusted data for product experiments.',
  });
  await postJson<{ id: string }>(page, `/api/v1/workspaces/${workspace.id}/projects`, {
    name: 'Taringa 2.0',
    description: 'Track readiness and release confidence.',
  });
  const root = `/api/v1/workspaces/${workspace.id}/projects/${project.id}`;
  for (const name of ['ui/ux', 'docs', 'research', 'tracking', 'validation', 'complete']) {
    await postJson<{ id: string }>(page, `/api/v1/workspaces/${workspace.id}/tags`, {
      name,
      color: name === 'research' ? '#d8874d' : '#6b7280',
    });
  }

  const epicTitles = [
    'Frontend / UX',
    'Documentation',
    'Detection Research',
    'Tracking & Analytics',
    'MVP Frontend',
    'Initial Infrastructure',
  ];
  const statuses = ['backlog', 'backlog', 'ready', 'in_progress', 'verify', 'done'];
  const priorities = ['medium', 'high', 'high', 'high', 'medium', 'low'];
  const epics: Array<{ id: string; title: string }> = [];
  for (let index = 0; index < epicTitles.length; index += 1) {
    const epic = await postJson<{ id: string }>(page, `${root}/epics`, {
      title: epicTitles[index],
      description:
        index === 2
          ? 'Build reliable ant detection: models, datasets and validation.'
          : 'Make the end-to-end signal workflow observable and dependable.',
      priority: priorities[index],
      tags: [['ui/ux'], ['docs'], ['computer-vision'], ['tracking'], ['validation'], ['complete']][
        index
      ],
    });
    if (statuses[index] !== 'backlog')
      await patchJson(page, `${root}/epics/${epic.id}`, { status: statuses[index] });
    epics.push({ id: epic.id, title: epicTitles[index] });
  }

  const story = await postJson<{ id: string }>(page, `${root}/features`, {
    title: 'Improve detector V2 accuracy',
    description:
      'Improve detection accuracy on dense ant scenes while preserving inference speed. Evaluate precision, recall and edge cases before promotion.',
    goal: 'Keep precision and recall within the agreed threshold.',
    epic_id: epics[2].id,
    priority: 'high',
    status: 'in_progress',
    kind: 'story',
    tags: ['computer-vision', 'ml-research'],
    notes:
      'Latest experiment shows improvements in crowded frames. Compare against V2-E2 and attach evaluation observations here.',
  });
  await postJson<Created>(page, `${root}/features/${story.id}/acceptance-criteria`, {
    description: 'AP improves against the baseline on blind data.',
    position: 0,
  });
  await postJson<Created>(page, `${root}/features/${story.id}/acceptance-criteria`, {
    description: 'False positives remain below the agreed threshold.',
    position: 1,
  });
  await postJson<Created>(page, `${root}/features/${story.id}/acceptance-criteria`, {
    description: 'Dense-scene benchmark is documented.',
    position: 2,
  });
  await postJson<Created>(page, `${root}/features/${story.id}/tasks`, {
    title: 'Review model outputs',
    status: 'done',
    position: 0,
  });
  await postJson<Created>(page, `${root}/features/${story.id}/tasks`, {
    title: 'Compare metrics with GT',
    status: 'todo',
    position: 1,
  });
  await postJson<Created>(page, `${root}/features/${story.id}/tasks`, {
    title: 'Produce benchmark report',
    status: 'todo',
    position: 2,
  });

  const gpuStory = await postJson<{ id: string }>(page, `${root}/features`, {
    title: 'GPU batch inference',
    epic_id: epics[2].id,
    kind: 'story',
    status: 'ready',
    priority: 'medium',
    tags: ['CUDA'],
  });
  for (let position = 0; position < 3; position += 1) {
    await postJson<Created>(page, `${root}/features/${gpuStory.id}/acceptance-criteria`, {
      description: `Synthetic GPU acceptance criterion ${position + 1}`,
      position,
    });
  }

  const bug = await postJson<{ id: string }>(page, `${root}/features`, {
    title: 'Confidence mismatch',
    description: 'Confidence values diverge after seeking across timeline segments.',
    epic_id: epics[2].id,
    priority: 'high',
    status: 'verify',
    kind: 'bug',
    bug_severity: 'high',
    steps_to_reproduce: '1. Load a sequence.\n2. Seek between segments.\n3. Compare confidence.',
    expected_result: 'The overlay stays aligned with the current frame.',
    actual_result: 'The overlay displays the previous segment confidence.',
    tags: ['tracking'],
    notes: 'Observed on the synthetic browser fixture.',
  });
  const pngHex =
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082';
  const attachment = await page.request.post(`${root}/features/${bug.id}/attachments`, {
    data: {
      file_name: 'confidence-mismatch.png',
      content_type: 'image/png',
      data_base64: Buffer.from(pngHex, 'hex').toString('base64'),
    },
  });
  expect(attachment.status(), await attachment.text()).toBe(201);

  const additionalFeatureCounts = [4, 2, 6, 8, 3, 5];
  for (let epicIndex = 0; epicIndex < epics.length; epicIndex += 1) {
    const existing = epicIndex === 2 ? 3 : 0;
    for (let itemIndex = existing; itemIndex < additionalFeatureCounts[epicIndex]; itemIndex += 1) {
      const createdFeature = await postJson<Created>(page, `${root}/features`, {
        title:
          epicIndex === 2
            ? ['Dense-scene labeling', 'Bounding box drift', 'Baseline dataset'][
                itemIndex - existing
              ]!
            : `${epicTitles[epicIndex]} item ${itemIndex + 1}`,
        epic_id: epics[epicIndex].id,
        kind: epicIndex === 2 && itemIndex === 4 ? 'bug' : 'story',
        status: epicIndex === 2 && itemIndex === 5 ? 'done' : 'backlog',
        priority: epicIndex === 2 && itemIndex === 4 ? 'high' : 'medium',
        tags: epicIndex === 2 && itemIndex === 3 ? ['dataset'] : [],
        ...(epicIndex === 2 && itemIndex === 4
          ? {
              bug_severity: 'high',
              steps_to_reproduce:
                '1. Load an analyzed video.\n2. Seek between timeline segments.\n3. Observe box position.',
              expected_result: 'Bounding boxes stay synchronized with the current frame.',
              actual_result: 'The boxes drift after seeking.',
            }
          : {}),
      });
      if (epicIndex === 2 && itemIndex === 4) {
        const screenshotUpload = await page.request.post(
          `${root}/features/${createdFeature.id}/attachments`,
          {
            data: {
              file_name: 'bounding-box-drift.png',
              content_type: 'image/png',
              data_base64: Buffer.from(pngHex, 'hex').toString('base64'),
            },
          },
        );
        expect(screenshotUpload.status(), await screenshotUpload.text()).toBe(201);
      }
    }
  }

  return { workspace, project, root, epic: epics[2], story, bug };
}

test.skip(
  !process.env.FORGE_UX11_CAPTURE_DIR,
  'Run npm run test:e2e:ux11-visual to capture the exact Figma evidence set.',
);

test('captures the ten UX 1.1 targets at desktop and mobile viewports', async ({ page }, info) => {
  const evidenceDirectory = process.env.FORGE_UX11_CAPTURE_DIR;
  if (!evidenceDirectory)
    throw new Error('Set FORGE_UX11_CAPTURE_DIR to the intended synthetic evidence directory.');
  const output = resolve(evidenceDirectory);
  mkdirSync(output, { recursive: true });
  const suffix = info.project.name;
  const { workspace, project, root, epic, story, bug } = await seedSyntheticProject(page);
  const projectBoardPath = `/planning/${workspace.id}/${project.id}`;
  const epicBoardPath = `${projectBoardPath}/epics/${epic.id}`;
  const storyDetailPath = `${projectBoardPath}/features/${story.id}`;
  const bugDetailPath = `${projectBoardPath}/features/${bug.id}`;

  async function capture(name: string) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${output}/${name}.png`,
      animations: 'disabled',
    });
  }

  async function reviewContextualTransfer() {
    await page.getByRole('button', { name: 'Review import' }).click();
    await expect(page.getByRole('heading', { name: 'Import preview' })).toBeVisible();
    await page.locator('summary').filter({ hasText: 'Advanced JSON paste' }).click();
    await expect(page.getByLabel('Advanced JSON document')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Import an Epic' })).toHaveCSS(
      'font-size',
      '28px',
    );
  }

  if (info.project.name === 'chromium-mobile') {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('combobox', { name: 'Workspace' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Workspace' }).selectOption(workspace.id);
    await page
      .getByRole('banner', { name: 'Workspace controls' })
      .getByRole('combobox', { name: 'Appearance' })
      .selectOption('dark');

    await expect(
      page.locator('#main').getByRole('link', { name: 'FormiAI', exact: true }),
    ).toBeVisible();
    await capture('01-mobile-workspace-home');
    await page.goto(projectBoardPath);
    await expect(page.getByRole('heading', { name: 'FormiAI · Epics', exact: true })).toBeVisible();
    await expect(page.locator('#main')).toContainText(
      '6 total · 6 in workflow · 0 archived · 0 legacy',
    );
    await capture('02-mobile-project-board');
    await page.goto(epicBoardPath);
    await expect(page.getByRole('heading', { name: epic.title, exact: true })).toBeVisible();
    const mobileFilters = page.locator('summary').filter({ hasText: 'Filter Work Items' });
    await expect(mobileFilters).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Find Work Items' })).not.toBeVisible();
    await page.getByRole('tab', { name: /^In Progress/ }).click();
    await expect(page.locator('#main')).toContainText(story.title);
    await expect(page.getByRole('link', { name: story.title, exact: true })).toBeInViewport();
    await page.getByRole('tab', { name: 'Verify' }).click();
    await expect(page.locator('#main')).toContainText(bug.title);
    await page.getByRole('tab', { name: /^In Progress/ }).click();
    await capture('03-mobile-epic-board');
    await page.goto(storyDetailPath);
    await expect(page.getByRole('heading', { name: story.title })).toBeVisible();
    await capture('04-mobile-story-detail');
    await page.goto(bugDetailPath);
    await expect(page.getByRole('heading', { name: bug.title })).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Bug screenshot: confidence-mismatch.png' }),
    ).toBeVisible();
    await capture('05-mobile-bug-detail');
    await page.goto(projectBoardPath);
    await page.getByRole('button', { name: 'New Epic', exact: true }).click();
    const createEpicDialog = page.getByRole('dialog', { name: 'New Epic' });
    await expect(createEpicDialog).toBeVisible();
    expect(
      await createEpicDialog.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.left >= 16 && bounds.right <= window.innerWidth - 16;
      }),
    ).toBe(true);
    await capture('06-mobile-create-epic');
    await page.goto(`/transfer/${workspace.id}/${project.id}/epics/${project.id}`);
    const transferDocument = {
      schema_version: 'forge-project-transfer-v2',
      project: { name: 'FormiAI' },
      epics: [{ ref: 'epic:import', title: `Imported Epic ${suffix}` }],
      features: [],
      dependencies: [],
    };
    await page.locator('summary').filter({ hasText: 'Advanced JSON paste' }).click();
    await page.getByLabel('Advanced JSON document').fill(JSON.stringify(transferDocument, null, 2));
    await reviewContextualTransfer();
    await capture('07-mobile-contextual-transfer');
    await page.goto(`/workspaces/${workspace.id}/settings`);
    await expect(page.getByRole('heading', { name: 'Manage workspace tags' })).toBeVisible();
    await expect(page.getByLabel('Name for tag research')).toHaveValue('research');
    await expect(page.getByLabel('Name for tag tracking')).toHaveValue('tracking');
    await capture('08-mobile-workspace-settings');
    await page.goto(projectBoardPath);
    await page
      .getByRole('banner', { name: 'Workspace controls' })
      .getByRole('combobox', { name: 'Appearance' })
      .selectOption('light');
    await expect(page.locator('[data-testid="application-shell"]')).toHaveAttribute(
      'data-theme',
      'light',
    );
    await capture('09-mobile-project-board-light');
    await page
      .getByRole('banner', { name: 'Workspace controls' })
      .getByRole('combobox', { name: 'Appearance' })
      .selectOption('dark');
    await expect(page.locator('[data-testid="application-shell"]')).toHaveAttribute(
      'data-theme',
      'dark',
    );
    const overviewResponse = await page.request.get(`${root}/planning/overview`);
    expect(overviewResponse.ok()).toBe(true);
    const overview = await overviewResponse.json();
    const capturedEpic = overview.epics.find((item: { id: string }) => item.id === epic.id);
    for (const [title, status] of [
      ['Dense-scene labeling', 'done'],
      ['Bounding box drift', 'ready'],
    ]) {
      const feature = capturedEpic.features.find((item: { title: string }) => item.title === title);
      const response = await page.request.patch(`${root}/features/${feature.id}`, {
        data: { status },
      });
      expect(response.status(), await response.text()).toBe(200);
    }
    await page.goto(epicBoardPath);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByRole('heading', { name: epic.title, exact: true })).toBeInViewport();
    await expect(page.getByText('6 work items · 2 completed', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Ready 2' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.getByRole('article', { name: 'GPU batch inference', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'Bounding box drift', exact: true }),
    ).toContainText('Screenshot attached · Ready');
    await capture('10-mobile-epic-board-390x844');
    return;
  }

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Workspace' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Workspace' }).selectOption(workspace.id);
  await page.getByRole('combobox', { name: 'Appearance' }).selectOption('dark');
  await expect(
    page.locator('#main').getByRole('link', { name: 'FormiAI', exact: true }),
  ).toBeVisible();
  await capture('01-workspace-home-1440x960');
  await page.goto(projectBoardPath);
  await expect(page.getByRole('heading', { name: 'FormiAI · Epics', level: 1 })).toBeVisible();
  expect(await page.locator('aside').boundingBox()).toMatchObject({
    x: 0,
    y: 0,
    width: 244,
    height: 960,
  });
  expect(await page.getByTestId('app-topbar').boundingBox()).toMatchObject({
    x: 244,
    y: 0,
    width: 1196,
    height: 64,
  });
  await expect(page.locator('#main')).toContainText(
    '6 total · 6 in workflow · 0 archived · 0 legacy',
  );
  const projectBoard = page.getByLabel('Epic workflow board');
  expect(await projectBoard.boundingBox()).toMatchObject({
    x: 268,
    y: 280,
    width: 1148,
    height: 615,
  });
  // The rendered viewport is 1148px; the fifth 222px column extends 2px into scroll overflow.
  expect(
    await projectBoard.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      columnWidths: [...element.children].map((column) =>
        Math.round(column.getBoundingClientRect().width),
      ),
    })),
  ).toEqual({ clientWidth: 1148, scrollWidth: 1150, columnWidths: [222, 222, 222, 222, 222] });
  const rect = (locator: ReturnType<Page['locator']>) =>
    locator.evaluate((element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    });
  const boardHeading = page.getByTestId('project-board-heading');
  const primaryAction = page.getByRole('button', { name: 'New Epic' });
  const toolbar = page.getByLabel('Epic board filters');
  const firstCard = projectBoard.locator('[data-testid^="epic-card-"]').first();
  expect(await rect(page.locator('[data-node-id="344:89"] select'))).toEqual({
    x: 18,
    y: 128,
    width: 208,
    height: 48,
  });
  expect(await rect(page.locator('[data-node-id="344:106"]'))).toEqual({
    x: 268,
    y: 22,
    width: 760,
    height: 20,
  });
  expect(await rect(boardHeading)).toEqual({ x: 268, y: 88, width: 1148, height: 105 });
  expect(await rect(primaryAction)).toEqual({ x: 1210, y: 88, width: 160, height: 42 });
  expect(await rect(toolbar)).toEqual({ x: 268, y: 211, width: 1148, height: 51 });
  expect(await rect(firstCard)).toEqual({ x: 273, y: 340, width: 214, height: 146 });
  const measurementReport = {
    figmaNodeId: '344:82',
    viewport: { width: 1440, height: 960, deviceScaleFactor: 1, zoomPercent: 100 },
    actual: {
      sidebar: await rect(page.getByTestId('app-sidebar')),
      workspaceSelector: await rect(page.locator('[data-node-id="344:89"] select')),
      topbar: await rect(page.getByTestId('app-topbar')),
      breadcrumb: await rect(page.locator('[data-node-id="344:106"]')),
      search: await rect(page.locator('[data-node-id="344:107"]')),
      theme: await rect(page.locator('[data-node-id="344:109"]')),
      heading: await rect(boardHeading),
      eyebrow: await rect(page.getByTestId('project-board-eyebrow')),
      title: await rect(page.getByTestId('project-board-title')),
      description: await rect(page.getByTestId('project-board-description')),
      primaryAction: await rect(primaryAction),
      toolbar: await rect(toolbar),
      filters: await toolbar.locator(':scope > *').evaluateAll((elements) =>
        elements.map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }),
      ),
      board: await rect(projectBoard),
      columns: await projectBoard.locator(':scope > *').evaluateAll((elements) =>
        elements.map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }),
      ),
      cards: await projectBoard.locator('[data-testid^="epic-card-"]').evaluateAll((elements) =>
        elements.map((element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height, title: element.textContent?.trim() };
        }),
      ),
    },
    expectedFigma: {
      sidebar: { x: 0, y: 0, width: 244, height: 960 },
      topbar: { x: 244, y: 0, width: 1196, height: 64 },
      heading: { x: 268, y: 88, width: 1148, height: 105 },
      primaryAction: { x: 1210, y: 88, width: 160, height: 42 },
      toolbar: { x: 268, y: 211, width: 1148, height: 51 },
      board: { x: 268, y: 280, width: 1148, height: 615 },
      columns: { width: 222, height: 615, gap: 10, count: 5, aggregateContentWidth: 1150 },
      epicCard: { width: 214, height: 146 },
    },
    metadataOvershoot:
      'Figma frame width 1148px contains five 222px columns and four 10px gaps (1150px total); the parent clips the 2px excess.',
    humanReview: 'PENDING',
  };
  writeFileSync(
    resolve(output, '02-project-board-dark-1440x960-geometry.json'),
    `${JSON.stringify(measurementReport, null, 2)}\n`,
  );
  await capture('02-project-board-dark-1440x960');
  await page.goto(epicBoardPath);
  await expect(page.getByRole('heading', { name: epic.title, exact: true })).toBeVisible();
  await expect(page.locator('#main')).toContainText(story.title);
  await expect(page.locator('#main')).toContainText(bug.title);
  const epicBoard = page.getByTestId('epic-work-item-board');
  expect(
    await epicBoard.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.right <= window.innerWidth - 16 && element.scrollWidth <= element.clientWidth;
    }),
  ).toBe(true);
  await capture('03-epic-board-1440x960');
  await page.goto(storyDetailPath);
  await expect(page.getByRole('heading', { name: story.title })).toBeVisible();
  await capture('04-story-detail-1440x960');
  const overviewResponse = await page.request.get(`${root}/planning/overview`);
  expect(overviewResponse.ok()).toBeTruthy();
  const seededOverview = await overviewResponse.json();
  expect(
    seededOverview.epics
      .flatMap((item: { features: Array<{ title: string }> }) => item.features)
      .map((item: { title: string }) => item.title),
  ).toContain(bug.title);
  await page.goto(bugDetailPath);
  await expect(page.getByRole('heading', { name: bug.title })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Bug screenshot: confidence-mismatch.png' }),
  ).toBeVisible();
  await capture('05-bug-detail-1440x960');
  await page.goto(projectBoardPath);
  await page.getByRole('button', { name: 'New Epic', exact: true }).click();
  const createEpicDrawer = page.getByRole('dialog', { name: 'New Epic' });
  await expect(createEpicDrawer).toBeVisible();
  expect(await rect(createEpicDrawer)).toEqual({ x: 980, y: 205, width: 436, height: 658 });
  await writeFileSync(
    resolve(output, '06-create-epic-1440x960-geometry.json'),
    `${JSON.stringify(
      {
        figmaNodeId: '347:224',
        viewport: { width: 1440, height: 960, deviceScaleFactor: 1, zoomPercent: 100 },
        actual: {
          boardAndDrawer: await rect(page.locator('[data-node-id="347:282"]').locator('..')),
          drawer: await rect(createEpicDrawer),
        },
        expectedFigma: {
          boardAndDrawer: { x: 268, y: 205, width: 1148, height: 658 },
          board: { width: 695 },
          gap: 17,
          drawer: { x: 980, y: 205, width: 436, height: 658 },
        },
        humanReview: 'PENDING',
      },
      null,
      2,
    )}\n`,
  );
  await capture('06-create-epic-1440x960');
  await page.goto(`/transfer/${workspace.id}/${project.id}/epics/${project.id}`);
  const transferDocument = {
    schema_version: 'forge-project-transfer-v2',
    project: { name: 'FormiAI' },
    epics: [{ ref: 'epic:import', title: `Imported Epic ${suffix}` }],
    features: [],
    dependencies: [],
  };
  await page.locator('summary').filter({ hasText: 'Advanced JSON paste' }).click();
  await page.getByLabel('Advanced JSON document').fill(JSON.stringify(transferDocument, null, 2));
  await reviewContextualTransfer();
  await capture('07-contextual-transfer-preview-1440x960');
  await page.goto(`/workspaces/${workspace.id}/settings`);
  await expect(page.getByRole('heading', { name: 'Manage workspace tags' })).toBeVisible();
  await expect(page.getByLabel('Name for tag research')).toHaveValue('research');
  await expect(page.getByLabel('Name for tag tracking')).toHaveValue('tracking');
  await capture('08-workspace-tags-settings-1440x960');
  await page.goto(projectBoardPath);
  await page.getByRole('combobox', { name: 'Appearance' }).selectOption('light');
  await expect(page.locator('[data-testid="application-shell"]')).toHaveAttribute(
    'data-theme',
    'light',
  );
  await capture('09-project-board-light-1440x960');
});
