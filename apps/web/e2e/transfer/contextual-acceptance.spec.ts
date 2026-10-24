import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function downloadJson(page: Page, url: string, buttonName: string) {
  await page.goto(url);
  await page.locator('summary').filter({ hasText: 'Export existing' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: buttonName }).click();
  const download = await downloadPromise;
  return JSON.parse(await readFile((await download.path())!, 'utf8')) as {
    epics: Array<{ title: string }>;
    features: Array<{ title: string; tasks: Array<{ title: string }> }>;
  };
}

test('PA-TRN-003 contextual Epic, Work Item and Task transfer uses product UI destinations', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const workspace = await page.request.post('/api/v1/workspaces', {
    data: { name: `Context transfer ${suffix}` },
  });
  expect(workspace.status()).toBe(201);
  const workspaceData = await workspace.json();
  const project = await page.request.post(`/api/v1/workspaces/${workspaceData.id}/projects`, {
    data: { name: `Destination ${suffix}` },
  });
  expect(project.status()).toBe(201);
  const projectData = await project.json();

  await page.goto(`/transfer/workspaces/${workspaceData.id}`);
  const fullProjectDocument = {
    schema_version: 'forge-project-transfer-v2',
    project: { name: `Imported Project ${suffix}`, description: 'Workspace scoped' },
    epics: [],
    features: [],
    dependencies: [],
  };
  await page.getByLabel('Choose a project transfer file').setInputFiles({
    name: 'project.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fullProjectDocument)),
  });
  await page.getByRole('button', { name: 'Review import' }).click();
  await page.getByRole('button', { name: 'Confirm planning import' }).click();
  const importedProjectText = await page.getByText(/^Created project:/).textContent();
  const importedProjectId = importedProjectText!.split(': ').at(-1)!;
  expect(
    await (
      await page.request.get(`/api/v1/workspaces/${workspaceData.id}/projects/${importedProjectId}`)
    ).json(),
  ).toMatchObject({ name: `Imported Project ${suffix}` });

  await page.goto(`/planning/${workspaceData.id}/${projectData.id}`);
  const destinationEpicTitle = `Destination Epic ${suffix}`;
  await page.getByRole('button', { name: 'New Epic', exact: true }).click();
  await page.getByLabel('Epic title').fill(destinationEpicTitle);
  await page.getByRole('button', { name: 'Create Epic' }).click();
  await page.locator('summary').filter({ hasText: 'Board' }).click();
  await page.getByRole('button', { name: 'New work item', exact: true }).click();
  await page.getByLabel('Feature title').fill(`Destination Story ${suffix}`);
  await page.getByLabel('Epic for new feature').selectOption({ label: destinationEpicTitle });
  await page.getByRole('button', { name: 'Create Feature' }).click();

  const epicDocument = {
    schema_version: 'forge-project-transfer-v2',
    project: { name: 'Context transfer fixture' },
    epics: [
      { ref: 'epic:one', title: `Imported Epic ${suffix}`, priority: 'high', tags: ['Research'] },
    ],
    features: [
      {
        ref: 'feature:one',
        title: `Imported Story ${suffix}`,
        kind: 'story',
        priority: 'medium',
        status: 'ready',
        epic_ref: 'epic:one',
        tags: ['Research'],
        tasks: [],
        acceptance_criteria: [],
        notes: 'Imported through Epic scope',
      },
    ],
    dependencies: [],
  };

  await page.goto(`/projects/${workspaceData.id}/${projectData.id}`);
  await page.getByRole('link', { name: 'Import Epic' }).click();
  await page.getByLabel('Choose a project transfer file').setInputFiles({
    name: 'epic.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(epicDocument)),
  });
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByText(`Destination: epics (${projectData.id})`)).toBeVisible();
  await page.getByRole('button', { name: 'Confirm planning import' }).click();
  await expect(page.getByText(`Imported into project: ${projectData.id}`)).toBeVisible();

  const planningUrl = `/api/v1/workspaces/${workspaceData.id}/projects/${projectData.id}/planning/overview`;
  let overview = await (await page.request.get(planningUrl)).json();
  const importedEpic = overview.epics.find(
    (item: { title: string }) => item.title === `Imported Epic ${suffix}`,
  );
  expect(importedEpic).toBeTruthy();
  const epicPage = `/planning/${workspaceData.id}/${projectData.id}/epics/${importedEpic.id}`;
  const exportedEpic = await downloadJson(
    page,
    `/transfer/${workspaceData.id}/${projectData.id}/epics/${importedEpic.id}`,
    'Download epics export (JSON)',
  );
  expect(exportedEpic.epics.map((item) => item.title)).toEqual([`Imported Epic ${suffix}`]);
  expect(exportedEpic.features.map((item) => item.title)).toContain(`Imported Story ${suffix}`);
  await page.goto(epicPage);
  if (test.info().project.name === 'chromium-mobile') {
    await page.getByRole('link', { name: `Imported Story ${suffix}` }).click();
    await page.getByRole('link', { name: /Export Work Items/ }).click();
  } else {
    await page.getByRole('link', { name: 'Import / export Stories and Bugs' }).click();
  }
  const workItemsDocument = {
    schema_version: 'forge-project-transfer-v2',
    project: { name: 'Work item fixture' },
    epics: [],
    features: [
      {
        ref: 'feature:story',
        title: `Scoped Story ${suffix}`,
        kind: 'story',
        priority: 'high',
        status: 'backlog',
        tags: ['Research'],
        tasks: [],
        acceptance_criteria: [],
        notes: '',
      },
      {
        ref: 'feature:bug',
        title: `Scoped Bug ${suffix}`,
        kind: 'bug',
        priority: 'critical',
        bug_severity: 'high',
        status: 'backlog',
        tags: [],
        tasks: [],
        acceptance_criteria: [],
        steps_to_reproduce: 'Open the sample',
        expected_result: 'It works',
        actual_result: 'It failed',
      },
    ],
    dependencies: [],
  };
  await page.getByLabel('Choose a project transfer file').setInputFiles({
    name: 'work-items.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(workItemsDocument)),
  });
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByText(`Destination: work-items (${importedEpic.id})`)).toBeVisible();
  await page.getByRole('button', { name: 'Confirm planning import' }).click();
  await expect(page.getByText(`Imported into project: ${projectData.id}`)).toBeVisible();

  overview = await (await page.request.get(planningUrl)).json();
  const updatedEpic = overview.epics.find((item: { id: string }) => item.id === importedEpic.id);
  expect(updatedEpic.features.map((item: { title: string }) => item.title)).toEqual(
    expect.arrayContaining([`Scoped Story ${suffix}`, `Scoped Bug ${suffix}`]),
  );
  const exportedWorkItems = await downloadJson(
    page,
    `/transfer/${workspaceData.id}/${projectData.id}/work-items/${importedEpic.id}`,
    'Download work-items export (JSON)',
  );
  expect(exportedWorkItems.features.map((item) => item.title)).toEqual(
    expect.arrayContaining([`Scoped Story ${suffix}`, `Scoped Bug ${suffix}`]),
  );
  const importedStory = updatedEpic.features.find(
    (item: { title: string }) => item.title === `Scoped Story ${suffix}`,
  );
  await page.goto(`/planning/${workspaceData.id}/${projectData.id}/features/${importedStory.id}`);
  await expect(page.getByRole('heading', { name: 'Work item detail' })).toBeVisible();
  await page.getByRole('link', { name: 'Import / export Tasks' }).click();
  const taskDocument = {
    schema_version: 'forge-project-transfer-v2',
    project: { name: 'Task fixture' },
    epics: [],
    features: [
      {
        ref: 'feature:tasks',
        title: 'Ignored task context',
        kind: 'story',
        tasks: [
          { ref: 'task:first', title: `Imported task one ${suffix}`, status: 'todo', position: 0 },
          {
            ref: 'task:second',
            title: `Imported task two ${suffix}`,
            status: 'in_progress',
            position: 1,
          },
        ],
        acceptance_criteria: [],
      },
    ],
    dependencies: [],
  };
  await page.getByLabel('Choose a project transfer file').setInputFiles({
    name: 'tasks.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(taskDocument)),
  });
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByText(`Destination: tasks (${importedStory.id})`)).toBeVisible();
  await page.getByRole('button', { name: 'Confirm planning import' }).click();
  await expect(page.getByText(`Imported into project: ${projectData.id}`)).toBeVisible();
  const tasksResponse = await page.request.get(
    `/api/v1/workspaces/${workspaceData.id}/projects/${projectData.id}/features/${importedStory.id}/tasks`,
  );
  expect(tasksResponse.ok()).toBeTruthy();
  expect((await tasksResponse.json()).map((task: { title: string }) => task.title)).toEqual([
    `Imported task one ${suffix}`,
    `Imported task two ${suffix}`,
  ]);

  const downloadedDocument = await downloadJson(
    page,
    `/transfer/${workspaceData.id}/${projectData.id}/tasks/${importedStory.id}`,
    'Download tasks export (JSON)',
  );
  expect(downloadedDocument.features[0].tasks.map((task: { title: string }) => task.title)).toEqual(
    [`Imported task one ${suffix}`, `Imported task two ${suffix}`],
  );
});
