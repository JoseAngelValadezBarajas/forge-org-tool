import { expect, test } from '@playwright/test';
import { createFeature, createWorkspaceWithProject } from '../support/api';

function isoDate(offsetDays: number): string {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

test('PA-TODAY-001 Today captures a task with a date, shows urgency, and persists through SQLite', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createWorkspaceWithProject(page, {
    workspace: `Today ${suffix}`,
    project: 'Inbox',
  });
  await createFeature(page, workspace.id, project.id, {
    title: `Late invoice ${suffix}`,
    due_date: isoDate(-2),
  });
  await page.addInitScript(
    (id) => localStorage.setItem('forge-active-workspace', id),
    workspace.id,
  );

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();

  // The overdue item arrives from the API with its date.
  const overdue = page.getByRole('region', { name: /Overdue/ });
  await expect(overdue.getByRole('link', { name: `Late invoice ${suffix}` })).toBeVisible();
  await expect(overdue.getByText('2 days overdue')).toBeVisible();

  // One line, natural language, Enter: title and deadline are split for the user.
  const capture = page.getByRole('textbox', { name: 'Capture a task' });
  await capture.fill(`Pay hosting ${suffix} tomorrow`);
  await expect(page.getByText('Due Tomorrow')).toBeVisible();
  await capture.press('Enter');
  const soon = page.getByRole('region', { name: /Next 7 days/ });
  await expect(soon.getByRole('link', { name: `Pay hosting ${suffix}` })).toBeVisible();
  await expect(capture).toHaveValue('');

  // The deadline is durable: it comes back from SQLite after a full reload.
  await page.reload();
  await expect(
    page
      .getByRole('region', { name: /Next 7 days/ })
      .getByRole('link', { name: `Pay hosting ${suffix}` }),
  ).toBeVisible();

  // Completing removes it from Today and survives a reload.
  await page.getByRole('checkbox', { name: `Complete Late invoice ${suffix}` }).click();
  await expect(page.getByRole('link', { name: `Late invoice ${suffix}` })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: `Late invoice ${suffix}` })).toHaveCount(0);
  await expect(page.getByRole('link', { name: `Pay hosting ${suffix}` })).toBeVisible();

  // A task opens in the full work item view, so a quick capture can grow into a feature.
  await page.getByRole('link', { name: `Pay hosting ${suffix}` }).click();
  await expect(page).toHaveURL(new RegExp(`/planning/${workspace.id}/${project.id}/features/`));
});

test('PA-TODAY-002 the first screen has no setup: workspace tools stay one click away', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace } = await createWorkspaceWithProject(page, {
    workspace: `Home ${suffix}`,
    project: 'Inbox',
  });
  await page.addInitScript(
    (id) => localStorage.setItem('forge-active-workspace', id),
    workspace.id,
  );

  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Capture a task' })).toBeVisible();
  await expect(page.getByText('Nothing to do yet')).toBeVisible();

  const overviewLink = page
    .getByRole('link', { name: 'Workspace Overview' })
    .or(page.getByRole('link', { name: 'Projects' }));
  await overviewLink.first().click();
  await expect(page).toHaveURL(/\/overview$/);
});
