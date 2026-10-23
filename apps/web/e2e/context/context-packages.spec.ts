import { expect, test } from '@playwright/test';

test('PA-CONTEXT-01 preview, save immutable history, detect changed preview and download both formats', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Organization', exact: true })).toBeVisible();
  const workspace = await (
    await page.request.post('/api/v1/workspaces', {
      data: { name: `Context acceptance ${suffix}` },
    })
  ).json();
  const project = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
      data: { name: `Context snapshots ${suffix}` },
    })
  ).json();
  const feature = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/features`, {
      data: { title: `Context feature ${suffix}`, goal: 'Preserve immutable context snapshots' },
    })
  ).json();
  const approvedRoot = process.env.FORGE_E2E_REPOSITORY_ROOT;
  expect(approvedRoot).toBeTruthy();

  await page.goto(`/repositories/${workspace.id}/${project.id}`);
  await page.getByLabel('Approved local Git root').fill(approvedRoot!);
  await page.getByRole('button', { name: 'Connect Repository' }).click();
  await expect(page.getByRole('link', { name: /^View repository / })).toBeVisible();
  const repositories = await (
    await page.request.get(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/repositories`)
  ).json();
  const repository = repositories[0];

  await page.goto(`/context/${workspace.id}/${project.id}/${feature.id}`);
  await expect(page.getByRole('heading', { name: 'Feature context', exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Link ${approvedRoot}` }).click();
  await expect(page.getByRole('button', { name: `Unlink ${approvedRoot}` })).toBeVisible();
  const featureLinksUrl = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${feature.id}/repositories`;
  expect(await (await page.request.get(featureLinksUrl)).json()).toEqual([
    expect.objectContaining({ id: repository.id }),
  ]);

  const initialPreviewRequest = page.waitForResponse(
    (response) =>
      response.url().includes(`/features/${feature.id}/context/preview`) &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Preview context package' }).click();
  await expect(page.getByText('Schema: forge-context-v1', { exact: true })).toBeVisible();
  const initialPreviewResponse = await initialPreviewRequest;
  expect(initialPreviewResponse.ok()).toBe(true);
  const initialPreview = await initialPreviewResponse.json();
  await expect(
    page.getByText(`Fingerprint: ${initialPreview.fingerprint}`, { exact: true }),
  ).toBeVisible();
  const mobileDocumentWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(mobileDocumentWidth.scrollWidth).toBeLessThanOrEqual(mobileDocumentWidth.clientWidth);
  const packagesUrl = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${feature.id}/context/packages`;
  const firstSave = page.waitForResponse(
    (response) => response.url().endsWith(packagesUrl) && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save context package' }).click();
  expect((await firstSave).ok()).toBe(true);
  await expect(page.getByRole('link', { name: 'Open context package' })).toBeVisible();
  const firstPackage = (await page.request.get(packagesUrl).then((response) => response.json()))[0];
  expect(firstPackage).toMatchObject({
    fingerprint: initialPreview.fingerprint,
    schema_version: 'forge-context-v1',
  });

  const featureUpdate = await page.request.patch(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${feature.id}`,
    { data: { title: `Revised context feature ${suffix}` } },
  );
  expect(featureUpdate.ok()).toBe(true);
  const changedPreviewRequest = page.waitForResponse(
    (response) =>
      response.url().includes(`/features/${feature.id}/context/preview`) &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Preview context package' }).click();
  const changedPreviewResponse = await changedPreviewRequest;
  expect(changedPreviewResponse.ok()).toBe(true);
  const changedPreview = await changedPreviewResponse.json();
  expect(changedPreview.fingerprint).not.toBe(firstPackage.fingerprint);
  await expect(
    page.getByText(`Fingerprint: ${changedPreview.fingerprint}`, { exact: true }),
  ).toBeVisible();
  const secondSave = page.waitForResponse(
    (response) => response.url().endsWith(packagesUrl) && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save context package' }).click();
  expect((await secondSave).ok()).toBe(true);

  const historyResponse = await page.request.get(packagesUrl);
  expect(historyResponse.ok()).toBe(true);
  const history = await historyResponse.json();
  expect(history).toHaveLength(2);
  const storedOriginalResponse = await page.request.get(`${packagesUrl}/${firstPackage.id}`);
  expect(storedOriginalResponse.ok()).toBe(true);
  expect(await storedOriginalResponse.json()).toMatchObject({
    id: firstPackage.id,
    fingerprint: initialPreview.fingerprint,
  });
  expect(history.map((item: { fingerprint: string }) => item.fingerprint)).toContain(
    initialPreview.fingerprint,
  );
  expect(history.map((item: { fingerprint: string }) => item.fingerprint)).toContain(
    changedPreview.fingerprint,
  );

  const detailUrl = `/context/${workspace.id}/${project.id}/${feature.id}/packages/${firstPackage.id}`;
  await page.goto(detailUrl);
  await expect(
    page.getByRole('heading', { name: 'Context package snapshot', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(firstPackage.fingerprint, { exact: true })).toBeVisible();
  const jsonLink = page.getByRole('link', { name: 'Download JSON' });
  const markdownLink = page.getByRole('link', { name: 'Download Markdown' });
  await expect(jsonLink).toBeVisible();
  await expect(markdownLink).toBeVisible();
  const [jsonDownload, markdownDownload] = await Promise.all([
    page.request.get(await jsonLink.getAttribute('href')!),
    page.request.get(await markdownLink.getAttribute('href')!),
  ]);
  expect(jsonDownload.ok()).toBe(true);
  expect(markdownDownload.ok()).toBe(true);
  const downloadedJson = await jsonDownload.json();
  expect(JSON.stringify(downloadedJson)).toContain(`Context feature ${suffix}`);
  expect(await markdownDownload.text()).toContain(`Context feature ${suffix}`);
  expect(downloadedJson).not.toHaveProperty('source_content');
});
