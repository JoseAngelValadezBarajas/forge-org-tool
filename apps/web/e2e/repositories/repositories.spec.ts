import { expect, test } from '@playwright/test';

test('PA-REPO-01 authorize a synthetic Git root, observe metadata and disconnect safely', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Organization', exact: true })).toBeVisible();
  const workspaceResponse = await page.request.post('/api/v1/workspaces', {
    data: { name: `Repository acceptance ${suffix}` },
  });
  expect(workspaceResponse.ok()).toBe(true);
  const workspace = await workspaceResponse.json();
  const projectResponse = await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
    data: { name: `Synthetic repository ${suffix}` },
  });
  expect(projectResponse.ok()).toBe(true);
  const project = await projectResponse.json();
  const approvedRoot = process.env.FORGE_E2E_REPOSITORY_ROOT;
  expect(
    approvedRoot,
    'The isolated Playwright fixture must authorize a synthetic Git root',
  ).toBeTruthy();

  await page.goto(`/repositories/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Repositories', exact: true })).toBeVisible();
  await page.getByLabel('Approved local Git root').fill(process.cwd());
  await page.getByRole('button', { name: 'Connect Repository' }).click();
  await expect(page.getByRole('alert')).toContainText('outside the approved roots');
  expect(
    await page.request
      .get(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/repositories`)
      .then(async (response) => {
        expect(response.ok()).toBe(true);
        return response.json();
      }),
  ).toEqual([]);

  await page.getByLabel('Approved local Git root').fill(approvedRoot!);
  await page.getByRole('button', { name: 'Connect Repository' }).click();
  const repositoryLink = page.getByRole('link', { name: /^View repository / });
  await expect(repositoryLink).toBeVisible();
  const repositoriesResponse = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/repositories`,
  );
  expect(repositoriesResponse.ok()).toBe(true);
  const [repository] = await repositoriesResponse.json();
  expect(repository.root_path).toBe(approvedRoot);
  expect(repository.status).toBe('connected');

  await page.getByRole('button', { name: 'Observe metadata' }).click();
  await expect(page.getByText(/Latest observation:/)).toBeVisible();
  await expect(page.getByText('not read', { exact: true })).toBeVisible();
  const observationsResponse = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/repositories/${repository.id}/observations`,
  );
  expect(observationsResponse.ok()).toBe(true);
  const observations = await observationsResponse.json();
  expect(observations).toHaveLength(1);
  expect(observations[0]).toMatchObject({ status: 'ok', source_content_read: false });
  expect(observations[0].branch).toBe('main');
  await repositoryLink.press('Enter');
  await expect(page.getByRole('heading', { name: 'Repository detail', exact: true })).toBeVisible();
  await expect(page.getByText(observations[0].head_sha, { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Back to repositories' }).click();
  const disconnectRequest = page.waitForResponse(
    (response) =>
      response.url().includes(`/repositories/${repository.id}/disconnect`) &&
      response.request().method() === 'POST',
  );
  await page
    .getByRole('button', { name: `Disconnect ${approvedRoot!.split(/[\\/]/).at(-1)}` })
    .click();
  const disconnectResponse = await disconnectRequest;
  expect(disconnectResponse.ok()).toBe(true);
  expect(await disconnectResponse.json()).toMatchObject({
    id: repository.id,
    status: 'disconnected',
  });
  const disconnectedResponse = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/repositories`,
  );
  expect(disconnectedResponse.ok()).toBe(true);
  expect(await disconnectedResponse.json()).toEqual([
    expect.objectContaining({ id: repository.id, status: 'disconnected' }),
  ]);
  await expect(page.getByText('disconnected', { exact: true })).toBeVisible();
});
