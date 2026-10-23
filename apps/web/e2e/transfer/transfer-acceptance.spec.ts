import { expect, test } from '@playwright/test';

test('PA-TRN-001 exports real planning data, downloads bytes, imports through UI, and rejects invalid documents without writes', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const suffix = test.info().project.name;
  const workspace = await (
    await page.request.post('/api/v1/workspaces', { data: { name: `Transfer source ${suffix}` } })
  ).json();
  const project = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
      data: { name: `Export ${suffix}`, description: 'Transfer fixture' },
    })
  ).json();
  const feature = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/features`, {
      data: { title: `Feature ${suffix}`, goal: 'Preserve transfer state' },
    })
  ).json();
  await page.request.post(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${feature.id}/tasks`,
    { data: { title: `Task ${suffix}` } },
  );

  await page.goto(`/transfer/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Project transfer' })).toBeVisible();
  const downloadWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download project export' }).click();
  const download = await downloadWait;
  await expect(page.getByRole('heading', { name: 'Export ready' })).toBeVisible();
  expect(download.suggestedFilename()).toBe('project-export.json');
  const path = await download.path();
  expect(path).toBeTruthy();
  const rawBytes = await (await import('node:fs/promises')).readFile(path!);
  const document = JSON.parse(rawBytes.toString('utf8'));
  expect(document).toMatchObject({
    schema_version: 'forge-project-transfer-v2',
    project: { name: `Export ${suffix}` },
  });
  expect(document.features[0].title).toBe(`Feature ${suffix}`);
  expect(document.features[0].tasks[0].title).toBe(`Task ${suffix}`);

  const targetWorkspace = await (
    await page.request.post('/api/v1/workspaces', { data: { name: `Transfer target ${suffix}` } })
  ).json();
  await page.goto(`/transfer/${targetWorkspace.id}/${project.id}`);
  await page.getByLabel('Choose a project transfer file').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: rawBytes,
  });
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByRole('heading', { name: 'Review planning changes' })).toBeVisible();
  await expect(page.getByText(/Fingerprint:/)).toBeVisible();
  await page.getByRole('button', { name: 'Confirm planning import' }).click();
  await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible();
  const importedProjectId = await page.getByText(/Created project:/).textContent();
  expect(importedProjectId).toContain('Created project:');
  const targetProjects = await (
    await page.request.get(`/api/v1/workspaces/${targetWorkspace.id}/projects`)
  ).json();
  const imported = targetProjects.find((item: { id: string }) =>
    importedProjectId?.includes(item.id),
  );
  expect(imported).toBeTruthy();
  const importedFeatures = await (
    await page.request.get(
      `/api/v1/workspaces/${targetWorkspace.id}/projects/${imported.id}/features`,
    )
  ).json();
  expect(importedFeatures.map((item: { title: string }) => item.title)).toContain(
    `Feature ${suffix}`,
  );

  const before = targetProjects.length;
  const duplicatePreview = await (
    await page.request.post(`/api/v1/workspaces/${targetWorkspace.id}/projects/import/preview`, {
      data: document,
    })
  ).json();
  const duplicateCommit = await page.request.post(
    `/api/v1/workspaces/${targetWorkspace.id}/projects/import`,
    { data: { document, expected_fingerprint: duplicatePreview.fingerprint } },
  );
  expect(duplicateCommit.ok()).toBe(false);
  expect(
    await (await page.request.get(`/api/v1/workspaces/${targetWorkspace.id}/projects`)).json(),
  ).toHaveLength(before);
  const valid = document;
  const invalidDocuments: Array<[string, unknown]> = [
    ['schema', { ...valid, schema_version: 'forge-project-import-v999' }],
    ['fingerprint', valid],
    ['duplicate ref', { ...valid, features: [...valid.features, valid.features[0]] }],
    [
      'cycle',
      {
        ...valid,
        features: [
          { ref: 'a', title: 'A', tasks: [], acceptance_criteria: [] },
          { ref: 'b', title: 'B', tasks: [], acceptance_criteria: [] },
        ],
        dependencies: [
          { blocking_feature_ref: 'a', blocked_feature_ref: 'b' },
          { blocking_feature_ref: 'b', blocked_feature_ref: 'a' },
        ],
      },
    ],
  ];
  for (const [label, invalid] of invalidDocuments) {
    const preview = await page.request.post(
      `/api/v1/workspaces/${targetWorkspace.id}/projects/import/preview`,
      { data: invalid },
    );
    if (label === 'fingerprint') {
      expect(preview.ok(), label).toBeTruthy();
      const previewBody = await preview.json();
      const rejected = await page.request.post(
        `/api/v1/workspaces/${targetWorkspace.id}/projects/import`,
        {
          data: { document: invalid, expected_fingerprint: '0'.repeat(64) },
        },
      );
      expect(rejected.ok(), label).toBe(false);
      expect(
        await (await page.request.get(`/api/v1/workspaces/${targetWorkspace.id}/projects`)).json(),
      ).toHaveLength(before);
      expect(previewBody.fingerprint).not.toBe('0'.repeat(64));
    } else {
      expect(preview.ok(), label).toBe(false);
    }
    expect(
      await (await page.request.get(`/api/v1/workspaces/${targetWorkspace.id}/projects`)).json(),
    ).toHaveLength(before);
  }

  await page.getByText('Advanced JSON paste').click();
  await page
    .getByLabel('Advanced JSON document')
    .fill(JSON.stringify({ ...valid, schema_version: 'forge-project-import-v999' }));
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByRole('alert')).toContainText('Unsupported project import schema');
  await expect(page.getByRole('heading', { name: 'Review planning changes' })).toHaveCount(0);
  expect(
    await (await page.request.get(`/api/v1/workspaces/${targetWorkspace.id}/projects`)).json(),
  ).toHaveLength(before);

  await page.getByLabel('Advanced JSON document').fill(JSON.stringify(valid));
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByRole('heading', { name: 'Review planning changes' })).toBeVisible();

  await page.getByLabel('Advanced JSON document').fill('{ invalid json');
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review planning changes' })).toHaveCount(0);
});
