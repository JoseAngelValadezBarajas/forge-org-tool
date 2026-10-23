import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('evidence provenance, invalidation, verification trace, and release manifest remain truthful', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const suffix = test.info().project.name;
  const workspace = await (
    await page.request.post('/api/v1/workspaces', {
      data: { name: `Delivery acceptance ${suffix}` },
    })
  ).json();
  const project = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
      data: { name: `Release ${suffix}` },
    })
  ).json();
  const base = `/api/v1/workspaces/${workspace.id}/projects/${project.id}`;

  await page.goto(`/delivery/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Delivery overview' })).toBeVisible();
  if (test.info().project.name === 'chromium-mobile') {
    await expect
      .poll(() => page.evaluate(() => [window.innerWidth, window.innerHeight]))
      .toEqual([390, 844]);
  }
  await page.getByLabel('Evidence title').fill(`Reported ${suffix}`);
  await page
    .getByLabel('Evidence summary')
    .fill('Operator-reported evidence; not independently verified.');
  await page.getByRole('button', { name: 'Record Evidence' }).click();
  const evidenceRow = page.locator('article').filter({ hasText: `Reported ${suffix}` });
  await expect(evidenceRow).toContainText('REPORTED / ACTIVE');

  const evidence = await (await page.request.get(`${base}/evidence`)).json();
  expect(evidence).toHaveLength(1);
  expect(evidence[0]).toMatchObject({
    title: `Reported ${suffix}`,
    provenance: 'REPORTED',
    status: 'ACTIVE',
  });
  await evidenceRow.getByRole('button', { name: 'Invalidate' }).click();
  await expect(evidenceRow).toContainText('REPORTED / INVALIDATED');
  expect((await (await page.request.get(`${base}/evidence`)).json())[0].status).toBe('INVALIDATED');

  const candidate = await (
    await page.request.post(`${base}/release-candidates`, {
      data: { title: `Candidate ${suffix}`, summary: 'Synthetic candidate' },
    })
  ).json();
  await page.getByLabel('Verification rule').selectOption('verified-evidence-present');
  if (test.info().project.name === 'chromium-mobile') {
    await expect.poll(() => page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  }
  await page.getByRole('button', { name: 'Preview verification' }).click();
  await expect(page.getByText('BLOCKED', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('No active VERIFIED evidence is present')).toBeVisible();
  await page.getByRole('button', { name: 'Evaluate verification' }).click();
  await expect(page.getByRole('heading', { name: 'Saved verification results' })).toBeVisible();
  // Clear the transient preview card before opening the persisted history entry.
  // On mobile, the nested summary card can cover the history link's hit target;
  // reloading verifies the saved result is independently reachable from history.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Saved verification results' })).toBeVisible();
  await page.getByRole('link', { name: 'Open verification result' }).click();
  await expect(page.getByRole('heading', { name: 'Verification result & trace' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Delivery overview' })).toBeVisible();
  const verifications = await (await page.request.get(`${base}/verifications`)).json();
  expect(verifications).toHaveLength(1);
  expect(verifications[0]).toMatchObject({
    outcome: 'BLOCKED',
    rule_id: 'verified-evidence-present',
    stale: false,
  });

  const verified = await page.request.post(`${base}/evidence`, {
    data: {
      title: `Verified ${suffix}`,
      summary: 'Synthetic checked result',
      provenance: 'VERIFIED',
      reference_kind: 'test',
      reference_value: 'acceptance://verified',
    },
  });
  expect(verified.ok()).toBeTruthy();
  expect((await (await page.request.get(`${base}/verifications`)).json())[0].stale).toBe(true);
  const freeze = await page.request.post(`${base}/release-candidates/${candidate.id}/freeze`, {
    data: { expected_revision: candidate.revision },
  });
  expect(freeze.ok()).toBeTruthy();
  const frozen = await freeze.json();
  const gates = await (
    await page.request.post(`${base}/release-candidates/${candidate.id}/gates/evaluate`)
  ).json();
  expect(gates).toMatchObject({ outcome: 'PASS', candidate_revision: frozen.revision });
  await page.reload();
  await expect(page.getByText(`Candidate ${suffix}`, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Candidate detail & history' }).click();
  await expect(page.getByRole('heading', { name: 'Candidate detail & history' })).toBeVisible();
  await page.goto(`/delivery/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Delivery overview' })).toBeVisible();
  const mobileDocument = await page.evaluate(() => ({
    viewportWidth: window.visualViewport?.width ?? window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (test.info().project.name === 'chromium-mobile') {
    expect(mobileDocument.scrollWidth).toBeLessThanOrEqual(mobileDocument.viewportWidth);
    await page.evaluate(() =>
      window.scrollTo({ left: 0, top: window.scrollY, behavior: 'instant' }),
    );
  }
  await page.getByRole('button', { name: `Preview gates for Candidate ${suffix}` }).click();
  const evaluateGates = page.getByRole('button', { name: 'Evaluate gates' });
  await evaluateGates.scrollIntoViewIfNeeded();
  const evaluateGatesOwnsHitTarget = await evaluateGates.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    return (
      document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2) ===
      button
    );
  });
  expect(evaluateGatesOwnsHitTarget).toBe(true);
  await evaluateGates.click({ timeout: 8_000 });
  await expect(page.getByRole('button', { name: 'Save NOT_PUBLISHED manifest' })).toBeEnabled();
  const manifestSaveResponse = page.waitForResponse(
    (response) =>
      response.url().includes(`/release-candidates/${candidate.id}/manifest`) &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save NOT_PUBLISHED manifest' }).click();
  const savedManifestResponse = await manifestSaveResponse;
  expect(savedManifestResponse.status()).toBe(201);
  const savedManifest = await savedManifestResponse.json();
  expect(savedManifest.status).toBe('NOT_PUBLISHED');
  await expect(page.getByText('NOT_PUBLISHED', { exact: true }).last()).toBeVisible();

  const manifestResponse = await page.request.get(
    `${base}/release-candidates/${candidate.id}/manifest?manifest_id=${savedManifest.id}`,
  );
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest.status).toBe('NOT_PUBLISHED');
  const jsonDownloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'JSON' }).click();
  const jsonDownload = await jsonDownloadPromise;
  const jsonPath = await jsonDownload.path();
  expect(jsonPath).toBeTruthy();
  const bytes = await readFile(jsonPath!);
  expect(bytes.toString('utf8')).toContain('NOT_PUBLISHED');
  expect(JSON.parse(bytes.toString('utf8'))).toMatchObject({
    status: 'NOT_PUBLISHED',
    schema_version: 'forge-release-manifest-v1',
  });
  const markdownDownloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Markdown' }).click();
  const markdownDownload = await markdownDownloadPromise;
  const markdownPath = await markdownDownload.path();
  expect(markdownPath).toBeTruthy();
  const markdown = await readFile(markdownPath!, 'utf8');
  expect(markdown).toContain('not a publication or deployment');
});
