import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const syntheticPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==',
  'base64',
);

test('PA-TRN-002 ZIP export/import preserves a Bug screenshot across workspaces', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const workspace = await (
    await page.request.post('/api/v1/workspaces', { data: { name: `Package source ${suffix}` } })
  ).json();
  const project = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
      data: { name: `Package project ${suffix}` },
    })
  ).json();
  const bug = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/features`, {
      data: {
        title: `Screenshot bug ${suffix}`,
        kind: 'bug',
        bug_severity: 'high',
        actual_result: 'The crash screen appears',
        expected_result: 'The project opens',
      },
    })
  ).json();

  await page.goto(`/planning/${workspace.id}/${project.id}/features/${bug.id}`);
  await expect(page.getByRole('textbox', { name: 'Edit feature title' })).toHaveValue(
    `Screenshot bug ${suffix}`,
  );
  const screenshotPicker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add Bug screenshot' }).click();
  const fileChooser = await screenshotPicker;
  await fileChooser.setFiles({
    name: 'crash-screen.png',
    mimeType: 'image/png',
    buffer: syntheticPng,
  });
  await expect(page.getByRole('img', { name: 'Bug screenshot: crash-screen.png' })).toBeVisible();

  await page.goto(`/transfer/${workspace.id}/${project.id}`);
  const packageDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP package with screenshots' }).click();
  const download = await packageDownload;
  expect(download.suggestedFilename()).toBe('forge-project-transfer-v2.zip');
  const archivePath = await download.path();
  expect(archivePath).toBeTruthy();
  const archive = await readFile(archivePath!);

  const targetWorkspace = await (
    await page.request.post('/api/v1/workspaces', { data: { name: `Package target ${suffix}` } })
  ).json();
  await page.goto(`/transfer/${targetWorkspace.id}/${project.id}`);
  await page.getByLabel('Choose a project transfer file').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/zip',
    buffer: archive,
  });
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByRole('heading', { name: 'Review planning changes' })).toBeVisible();
  await expect(page.getByText('attachments: 1')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm planning import' }).click();
  const imported = page.getByText(/Created project:/);
  await expect(imported).toBeVisible();
  const importedProjectId = (await imported.textContent())!.replace('Created project: ', '');

  const importedItems = await (
    await page.request.get(
      `/api/v1/workspaces/${targetWorkspace.id}/projects/${importedProjectId}/features`,
    )
  ).json();
  const importedBug = importedItems.find((item: { kind: string }) => item.kind === 'bug');
  expect(importedBug.actual_result).toBe('The crash screen appears');
  const attachmentPath =
    `/api/v1/workspaces/${targetWorkspace.id}/projects/${importedProjectId}` +
    `/features/${importedBug.id}/attachments`;
  const attachments = await (await page.request.get(attachmentPath)).json();
  expect(attachments).toHaveLength(1);
  const imageResponse = await page.request.get(`${attachmentPath}/${attachments[0].id}/content`);
  expect(imageResponse.ok()).toBeTruthy();
  expect(
    createHash('sha256')
      .update(await imageResponse.body())
      .digest('hex'),
  ).toBe(createHash('sha256').update(syntheticPng).digest('hex'));

  await page.goto(
    `/planning/${targetWorkspace.id}/${importedProjectId}/features/${importedBug.id}`,
  );
  await expect(page.getByRole('img', { name: 'Bug screenshot: crash-screen.png' })).toBeVisible();
});
