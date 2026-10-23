import { mkdirSync } from 'node:fs';
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

async function seedSyntheticProject(page: Page, suffix: string) {
  const workspace = await postJson<{ id: string }>(page, '/api/v1/workspaces', {
    name: `UX 1.1 Visual ${suffix}`,
    description: 'Synthetic screenshot evidence only.',
  });
  const project = await postJson<{ id: string }>(
    page,
    `/api/v1/workspaces/${workspace.id}/projects`,
    { name: `Signal Console ${suffix}`, description: 'Observe reliable product signals.' },
  );
  await postJson<{ id: string }>(page, `/api/v1/workspaces/${workspace.id}/projects`, {
    name: `Dataset Studio ${suffix}`,
    description: 'Prepare trusted data for product experiments.',
  });
  await postJson<{ id: string }>(page, `/api/v1/workspaces/${workspace.id}/projects`, {
    name: `Release Observatory ${suffix}`,
    description: 'Track readiness and release confidence.',
  });
  const root = `/api/v1/workspaces/${workspace.id}/projects/${project.id}`;
  for (const name of ['research', 'tracking']) {
    await postJson<{ id: string }>(page, `/api/v1/workspaces/${workspace.id}/tags`, {
      name,
      color: name === 'research' ? '#d8874d' : '#6b7280',
    });
  }

  const epicTitles = [
    'Signal ingestion',
    'Dataset preparation',
    'Model validation',
    'Release telemetry',
    'Launch baseline',
  ];
  const statuses = ['backlog', 'ready', 'in_progress', 'verify', 'done'];
  const epics: Array<{ id: string; title: string }> = [];
  for (let index = 0; index < epicTitles.length; index += 1) {
    const epic = await postJson<{ id: string }>(page, `${root}/epics`, {
      title: `${epicTitles[index]} ${suffix}`,
      description: 'Make the end-to-end signal workflow observable and dependable.',
      priority: index === 2 ? 'high' : 'medium',
      tags: index === 2 ? ['research', 'tracking'] : [],
    });
    if (statuses[index] !== 'backlog')
      await patchJson(page, `${root}/epics/${epic.id}`, { status: statuses[index] });
    epics.push({ id: epic.id, title: `${epicTitles[index]} ${suffix}` });
  }

  const story = await postJson<{ id: string }>(page, `${root}/features`, {
    title: `Validate signal quality ${suffix}`,
    description: 'Measure incoming events against a stable baseline before promotion.',
    goal: 'Keep precision and recall within the agreed threshold.',
    epic_id: epics[2].id,
    priority: 'high',
    status: 'in_progress',
    kind: 'story',
    tags: ['research', 'tracking'],
    notes: 'Compare results against the frozen reference dataset.',
  });
  await postJson<Created>(page, `${root}/features/${story.id}/acceptance-criteria`, {
    description: 'Precision improves against the reference dataset.',
    position: 0,
  });
  await postJson<Created>(page, `${root}/features/${story.id}/acceptance-criteria`, {
    description: 'No regression appears in the recall threshold.',
    position: 1,
  });
  await postJson<Created>(page, `${root}/features/${story.id}/tasks`, {
    title: 'Compare metrics with reference',
    status: 'in_progress',
    position: 0,
  });

  const bug = await postJson<{ id: string }>(page, `${root}/features`, {
    title: `Confidence mismatch ${suffix}`,
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

  return { workspace, project, root, epic: epics[2], story, bug };
}

test('captures the ten UX 1.1 targets at desktop and mobile viewports', async ({ page }, info) => {
  const evidenceDirectory = process.env.FORGE_UX11_CAPTURE_DIR;
  if (!evidenceDirectory)
    throw new Error('Set FORGE_UX11_CAPTURE_DIR to the intended synthetic evidence directory.');
  const output = resolve(evidenceDirectory);
  mkdirSync(output, { recursive: true });
  const suffix = info.project.name;
  const { workspace, project, root, epic, story, bug } = await seedSyntheticProject(page, suffix);
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
      page.locator('#main').getByRole('link', { name: `Signal Console ${suffix}`, exact: true }),
    ).toBeVisible();
    await capture('01-mobile-workspace-home');
    await page.goto(projectBoardPath);
    await expect(page.getByRole('heading', { name: 'Project Board', exact: true })).toBeVisible();
    await expect(page.locator('#main')).toContainText(
      '5 total · 5 in workflow · 0 archived · 0 legacy',
    );
    await capture('02-mobile-project-board');
    await page.goto(epicBoardPath);
    await expect(page.getByRole('heading', { name: epic.title, exact: true })).toBeVisible();
    const mobileFilters = page.locator('summary').filter({ hasText: 'Filter Work Items' });
    await expect(mobileFilters).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Find Work Items' })).not.toBeVisible();
    await mobileFilters.click();
    await expect(page.getByRole('textbox', { name: 'Find Work Items' })).toBeVisible();
    await mobileFilters.click();
    await page.getByRole('tab', { name: 'In progress' }).click();
    await expect(page.locator('#main')).toContainText(`Validate signal quality ${suffix}`);
    await expect(
      page.getByRole('link', { name: `Validate signal quality ${suffix}`, exact: true }),
    ).toBeInViewport();
    await page.getByRole('tab', { name: 'Verify' }).click();
    await expect(page.locator('#main')).toContainText(`Confidence mismatch ${suffix}`);
    await page.getByRole('tab', { name: 'In progress' }).click();
    await capture('03-mobile-epic-board');
    await page.goto(storyDetailPath);
    await expect(
      page.getByRole('heading', { name: `Validate signal quality ${suffix}` }),
    ).toBeVisible();
    await capture('04-mobile-story-detail');
    await page.goto(bugDetailPath);
    await expect(
      page.getByRole('heading', { name: `Confidence mismatch ${suffix}` }),
    ).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Bug screenshot: confidence-mismatch.png' }),
    ).toBeVisible();
    await capture('05-mobile-bug-detail');
    await page.goto(projectBoardPath);
    await page.getByRole('button', { name: 'New Epic', exact: true }).click();
    const createEpicDialog = page.getByRole('dialog', { name: 'Create Epic' });
    await expect(createEpicDialog).toBeVisible();
    expect(
      await createEpicDialog.evaluate(
        (element) => Math.abs(element.getBoundingClientRect().right - window.innerWidth) < 4,
      ),
    ).toBe(true);
    await capture('06-mobile-create-epic');
    await page.goto(`/transfer/${workspace.id}/${project.id}/epics/${project.id}`);
    const transferDocument = {
      schema_version: 'forge-project-transfer-v2',
      project: { name: `Signal Console ${suffix}` },
      epics: [{ ref: 'epic:import', title: `Imported Epic ${suffix}` }],
      features: [],
      dependencies: [],
    };
    await page.locator('summary').filter({ hasText: 'Advanced JSON paste' }).click();
    await page.getByLabel('Advanced JSON document').fill(JSON.stringify(transferDocument, null, 2));
    await page.getByRole('button', { name: 'Review import' }).click();
    await expect(page.getByRole('heading', { name: 'Review planning changes' })).toBeVisible();
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
    await page.goto(epicBoardPath);
    await page.getByRole('tab', { name: 'In progress' }).click();
    await page
      .getByRole('banner', { name: 'Workspace controls' })
      .getByRole('combobox', { name: 'Appearance' })
      .selectOption('dark');
    await expect(page.locator('[data-testid="application-shell"]')).toHaveAttribute(
      'data-theme',
      'dark',
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.getByRole('heading', { name: epic.title, exact: true })).toBeInViewport();
    await capture('10-mobile-epic-board-390x844');
    return;
  }

  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Workspace' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Workspace' }).selectOption(workspace.id);
  await page.getByRole('combobox', { name: 'Appearance' }).selectOption('dark');
  await expect(
    page.locator('#main').getByRole('link', { name: `Signal Console ${suffix}`, exact: true }),
  ).toBeVisible();
  await capture('01-workspace-home-1440x960');
  await page.goto(projectBoardPath);
  await expect(page.getByRole('heading', { name: 'Project Board', exact: true })).toBeVisible();
  await expect(page.locator('#main')).toContainText(
    '5 total · 5 in workflow · 0 archived · 0 legacy',
  );
  const projectBoard = page.getByTestId('project-epic-board');
  expect(
    await projectBoard.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.right <= window.innerWidth - 16 && element.scrollWidth <= element.clientWidth;
    }),
  ).toBe(true);
  await capture('02-project-board-dark-1440x960');
  await page.goto(epicBoardPath);
  await expect(page.getByRole('heading', { name: epic.title, exact: true })).toBeVisible();
  await expect(page.locator('#main')).toContainText(`Validate signal quality ${suffix}`);
  await expect(page.locator('#main')).toContainText(`Confidence mismatch ${suffix}`);
  const epicBoard = page.getByTestId('epic-work-item-board');
  expect(
    await epicBoard.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.right <= window.innerWidth - 16 && element.scrollWidth <= element.clientWidth;
    }),
  ).toBe(true);
  await capture('03-epic-board-1440x960');
  await page.goto(storyDetailPath);
  await expect(
    page.getByRole('heading', { name: `Validate signal quality ${suffix}` }),
  ).toBeVisible();
  await capture('04-story-detail-1440x960');
  const overviewResponse = await page.request.get(`${root}/planning/overview`);
  expect(overviewResponse.ok()).toBeTruthy();
  const seededOverview = await overviewResponse.json();
  expect(
    seededOverview.epics
      .flatMap((item: { features: Array<{ title: string }> }) => item.features)
      .map((item: { title: string }) => item.title),
  ).toContain(`Confidence mismatch ${suffix}`);
  await page.goto(bugDetailPath);
  await expect(page.getByRole('heading', { name: `Confidence mismatch ${suffix}` })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Bug screenshot: confidence-mismatch.png' }),
  ).toBeVisible();
  await capture('05-bug-detail-1440x960');
  await page.goto(projectBoardPath);
  await page.getByRole('button', { name: 'New Epic', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Create Epic' })).toBeVisible();
  await capture('06-create-epic-dialog-1440x960');
  await page.goto(`/transfer/${workspace.id}/${project.id}/epics/${project.id}`);
  const transferDocument = {
    schema_version: 'forge-project-transfer-v2',
    project: { name: `Signal Console ${suffix}` },
    epics: [{ ref: 'epic:import', title: `Imported Epic ${suffix}` }],
    features: [],
    dependencies: [],
  };
  await page.locator('summary').filter({ hasText: 'Advanced JSON paste' }).click();
  await page.getByLabel('Advanced JSON document').fill(JSON.stringify(transferDocument, null, 2));
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByRole('heading', { name: 'Review planning changes' })).toBeVisible();
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
