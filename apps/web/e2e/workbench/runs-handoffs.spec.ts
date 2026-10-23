import { expect, test } from '@playwright/test';

test('PA-RUN-01 record chronological run events and reject an invalid event without persistence', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Organization', exact: true })).toBeVisible();
  const workspace = await (
    await page.request.post('/api/v1/workspaces', { data: { name: `Run acceptance ${suffix}` } })
  ).json();
  const project = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
      data: { name: `Run timeline ${suffix}` },
    })
  ).json();

  await page.goto(`/workbench/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Workbench', exact: true })).toBeVisible();
  const runTitle = `Reported run ${suffix}`;
  await page.getByLabel('Run title').fill(runTitle);
  await page.getByRole('button', { name: 'Record Run' }).click();
  await page.getByRole('link', { name: `View run ${runTitle}` }).press('Enter');
  await expect(page.getByRole('heading', { name: runTitle, exact: true, level: 2 })).toBeVisible();
  await expect(page.getByText('Reported · not independently verified')).toBeVisible();
  const runsUrl = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/runs`;
  const run = (await page.request.get(runsUrl).then((response) => response.json()))[0];
  expect(run).toMatchObject({ title: runTitle, status: 'PLANNED', executor_type: 'human' });

  const addEvent = async (title: string, occurredAt: string) => {
    await page.getByLabel('Event type').fill('progress');
    await page.getByLabel('Event title').fill(title);
    await page.getByLabel('Event description').fill('A human reported this event.');
    await page.getByLabel('When it occurred (optional)').fill(occurredAt);
    await page.getByRole('button', { name: 'Record activity event' }).click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  };
  await addEvent(`Later event ${suffix}`, '2026-10-21T12:00');
  await addEvent(`Earlier event ${suffix}`, '2026-10-20T12:00');
  const timeline = page.getByRole('list', { name: 'Activity timeline' });
  await expect(timeline.locator('li').first()).toContainText(`Earlier event ${suffix}`);
  await expect(timeline.locator('li').last()).toContainText(`Later event ${suffix}`);

  const eventsUrl = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/runs/${run.id}/events`;
  const beforeInvalidEvent = await page.request.get(eventsUrl).then((response) => response.json());
  expect(beforeInvalidEvent).toHaveLength(2);
  const invalidEvent = await page.request.post(eventsUrl, {
    data: {
      event_type: 'progress',
      title: '',
      description: 'Invalid event must not be persisted',
      expected_version: run.version + 2,
    },
  });
  expect(invalidEvent.status()).toBe(422);
  const afterInvalidEvent = await page.request.get(eventsUrl).then((response) => response.json());
  expect(afterInvalidEvent).toHaveLength(beforeInvalidEvent.length);
  await page.reload();
  await expect(timeline.locator('li').first()).toContainText(`Earlier event ${suffix}`);
  await expect(timeline.locator('li').last()).toContainText(`Later event ${suffix}`);
});

test('PA-HANDOFF-01 revise a draft, publish and acknowledge its immutable handoff revision', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Organization', exact: true })).toBeVisible();
  const workspace = await (
    await page.request.post('/api/v1/workspaces', {
      data: { name: `Handoff acceptance ${suffix}` },
    })
  ).json();
  const project = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
      data: { name: `Handoff history ${suffix}` },
    })
  ).json();
  const run = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/runs`, {
      data: { title: `Run for handoff ${suffix}` },
    })
  ).json();
  await page.goto(`/workbench/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Workbench', exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Create handoff for ${run.title}` }).click();
  await expect(
    page.getByRole('textbox', { name: `Summary for Handoff for ${run.title}` }),
  ).toBeVisible();
  const draftTitle = `Handoff for ${run.title}`;
  const summary = page.getByRole('textbox', { name: `Summary for ${draftTitle}` });
  const nextActions = page.getByRole('textbox', { name: `Next actions for ${draftTitle}` });
  const waitForHandoffUpdate = () =>
    page.waitForResponse(
      (response) =>
        response
          .url()
          .includes(`/api/v1/workspaces/${workspace.id}/projects/${project.id}/handoffs/`) &&
        response.request().method() === 'PATCH',
    );
  await summary.fill('First draft summary.');
  await nextActions.fill('First draft action.');
  const firstSave = waitForHandoffUpdate();
  await page.getByRole('button', { name: 'Save handoff details' }).click();
  expect((await firstSave).ok()).toBe(true);
  await summary.fill(`Final reviewed summary ${suffix}.`);
  await nextActions.fill(`Review the persisted run ${suffix}.`);
  await expect(summary).toHaveValue(`Final reviewed summary ${suffix}.`);
  await expect(nextActions).toHaveValue(`Review the persisted run ${suffix}.`);
  const secondSave = waitForHandoffUpdate();
  await page.getByRole('button', { name: 'Save handoff details' }).click();
  expect((await secondSave).ok()).toBe(true);
  await page.getByRole('button', { name: 'Mark handoff ready' }).click();

  const handoffsUrl = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/handoffs`;
  const handoffs = await page.request.get(handoffsUrl).then((response) => response.json());
  const handoff = handoffs.find((item: { run_id: string }) => item.run_id === run.id);
  expect(handoff).toMatchObject({ status: 'READY', current_revision: 1 });
  const revisionsUrl = `${handoffsUrl}/${handoff.id}/revisions`;
  const revisions = await page.request.get(revisionsUrl).then((response) => response.json());
  expect(revisions).toHaveLength(1);
  expect(revisions[0]).toMatchObject({
    revision: 1,
    summary: `Final reviewed summary ${suffix}.`,
    next_actions: `Review the persisted run ${suffix}.`,
  });

  await page.getByRole('link', { name: `Review handoff ${draftTitle}` }).press('Enter');
  await expect(
    page
      .locator('header')
      .filter({ hasText: 'Immutable handoff' })
      .getByRole('heading', { name: draftTitle, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(`Final reviewed summary ${suffix}.`, { exact: true })).toBeVisible();
  await page.getByLabel('Acknowledged by').fill('Acceptance reviewer');
  await page.getByRole('button', { name: 'Acknowledge revision 1' }).click();
  await expect(
    page.locator('main').getByText(/^Acknowledged by Acceptance reviewer for revision 1/),
  ).toBeVisible();
  const ackResponse = await page.request.post(`${handoffsUrl}/${handoff.id}/acknowledge`, {
    data: { expected_revision: 1, acknowledged_by: 'Duplicate reviewer' },
  });
  expect(ackResponse.status()).toBe(409);

  const currentHandoffs = await page.request.get(handoffsUrl).then((response) => response.json());
  expect(currentHandoffs.find((item: { id: string }) => item.id === handoff.id).status).toBe(
    'ACKNOWLEDGED',
  );
  const updateAfterReady = await page.request.patch(`${handoffsUrl}/${handoff.id}`, {
    data: { expected_version: handoff.version, summary: 'Attempt to rewrite a published snapshot' },
  });
  expect(updateAfterReady.status()).toBe(422);
  const readyAfterAck = await page.request.post(`${handoffsUrl}/${handoff.id}/ready`, {
    data: { expected_version: handoff.version },
  });
  expect(readyAfterAck.status()).toBe(422);
  expect(await page.request.get(revisionsUrl).then((response) => response.json())).toEqual(
    revisions,
  );
  await page.reload();
  await expect(page.getByText(/Revision 1 is acknowledged/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download JSON snapshot' })).toBeVisible();
});
