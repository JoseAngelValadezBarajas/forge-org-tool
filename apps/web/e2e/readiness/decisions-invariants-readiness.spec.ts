import { expect, test } from '@playwright/test';

test('PA-READY-001 decision history, invariant acknowledgement and readiness persist', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const workspaceResponse = await page.request.post('/api/v1/workspaces', {
    data: { name: `Readiness ${suffix}` },
  });
  expect(workspaceResponse.status()).toBe(201);
  const workspace = await workspaceResponse.json();
  const projectResponse = await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
    data: { name: `Project ${suffix}` },
  });
  const project = await projectResponse.json();
  const featureResponse = await page.request.post(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features`,
    { data: { title: `Feature ${suffix}`, goal: 'Validate a planning decision gate' } },
  );
  const feature = await featureResponse.json();

  await page.goto(`/readiness/${workspace.id}/${project.id}/${feature.id}`);
  await expect(page.getByRole('heading', { name: 'Readiness', exact: true })).toBeVisible();
  await expect(page.getByText('Outcome: NOT_READY')).toBeVisible();
  await expect(
    page.getByText(/not delivery, CI, deployment, or technical verification/i),
  ).toBeVisible();

  const criterion = `Acceptance criterion ${suffix}`;
  await page.getByLabel('Acceptance criterion').fill(criterion);
  const criterionCreateResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/acceptance-criteria') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Add criterion' }).click();
  expect((await criterionCreateResponse).status()).toBe(201);
  const criteriaResponse = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${feature.id}/acceptance-criteria`,
  );
  expect(await criteriaResponse.json()).toEqual(
    expect.arrayContaining([expect.objectContaining({ description: criterion })]),
  );

  const decision = `Decision ${suffix}`;
  await page.getByLabel('Decision title').fill(decision);
  await page.getByRole('button', { name: 'Link decision' }).click();
  const decisionCard = page.locator('article').filter({ hasText: decision });
  await expect(decisionCard).toContainText(decision);
  await page.getByRole('button', { name: 'Accept decision' }).click();
  await expect(decisionCard).toContainText('accepted');
  await expect(decisionCard.getByRole('button', { name: 'Accept decision' })).toHaveCount(0);
  await decisionCard
    .getByRole('button', { name: `Show decision revisions for ${decision}` })
    .click();
  await expect(page.getByRole('group', { name: `${decision} history` })).toContainText(decision);

  const invariant = `Invariant ${suffix}`;
  await page.getByLabel('Invariant title').fill(invariant);
  await page.getByRole('button', { name: 'Add invariant' }).click();
  const invariantCard = page.locator('article').filter({ hasText: invariant });
  await expect(invariantCard).toContainText(invariant);
  await invariantCard.getByRole('button', { name: 'Acknowledge invariant' }).click();
  await expect(invariantCard).toContainText('Acknowledged revision 1');

  const decisionsResponse = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/decisions`,
  );
  expect(await decisionsResponse.json()).toEqual(
    expect.arrayContaining([expect.objectContaining({ title: decision, status: 'accepted' })]),
  );
  const invariantsResponse = await page.request.get(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/invariants?feature_id=${feature.id}`,
  );
  expect(await invariantsResponse.json()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: invariant, revision: 1, acknowledged_revision: 1 }),
    ]),
  );
  const previewResponse = await page.request.post(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${feature.id}/readiness/preview`,
  );
  const preview = await previewResponse.json();
  expect(preview.outcome).toBe('READY_TO_START');
  expect(JSON.stringify(preview)).not.toMatch(/verified|ci.passed|deployed/i);

  await page.reload();
  await expect(page.getByText('Outcome: READY_TO_START')).toBeVisible();
  await expect(page.locator('article').filter({ hasText: decision })).toContainText('accepted');
  await expect(page.locator('article').filter({ hasText: invariant })).toContainText(
    'Acknowledged revision 1',
  );
});
