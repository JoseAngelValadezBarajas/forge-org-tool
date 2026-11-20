import { expect, test, type Page } from '@playwright/test';
import { createFeature, createWorkspaceWithProject } from '../support/api';

// On desktop a task's actions appear while its row is hovered or focused, so reach them as a
// person does: point at the task, then use its button.
async function revealActions(page: Page, taskTitle: string) {
  await page.getByText(taskTitle, { exact: true }).hover();
}

test('PA-TASK-001 renames and deletes tasks with Undo, and the changes persist through SQLite', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createWorkspaceWithProject(page, {
    workspace: `Tasks ${suffix}`,
    project: `Task editing ${suffix}`,
  });
  const feature = await createFeature(page, workspace.id, project.id, {
    title: `Feature ${suffix}`,
  });
  const tasksUrl = `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features/${feature.id}/tasks`;
  await page.request.post(tasksUrl, { data: { title: `Write draft ${suffix}` } });
  await page.request.post(tasksUrl, { data: { title: `Review ${suffix}` } });

  await page.goto(`/planning/${workspace.id}/${project.id}/features/${feature.id}`);
  await expect(page.getByText(`Write draft ${suffix}`)).toBeVisible();

  // Rename inline: Enter saves.
  await revealActions(page, `Write draft ${suffix}`);
  await page.getByRole('button', { name: `Rename Write draft ${suffix}` }).click();
  const title = page.getByLabel(`Title for Write draft ${suffix}`);
  await title.fill(`Write final draft ${suffix}`);
  await title.press('Enter');
  await expect(page.getByText(`Write final draft ${suffix}`)).toBeVisible();
  await expect(page.getByText(`Write draft ${suffix}`, { exact: true })).toHaveCount(0);

  // Delete, then Undo brings it back.
  await revealActions(page, `Review ${suffix}`);
  await page.getByRole('button', { name: `Delete Review ${suffix}` }).click();
  await expect(page.getByRole('status')).toContainText(`Deleted “Review ${suffix}”`);
  await expect(page.getByText(`Review ${suffix}`, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(`Review ${suffix}`, { exact: true })).toBeVisible();

  // A real delete survives a reload.
  await revealActions(page, `Review ${suffix}`);
  await page.getByRole('button', { name: `Delete Review ${suffix}` }).click();
  await expect(page.getByText(`Review ${suffix}`, { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(`Write final draft ${suffix}`)).toBeVisible();
  await expect(page.getByText(`Review ${suffix}`, { exact: true })).toHaveCount(0);
  const remaining = (await (await page.request.get(tasksUrl)).json()) as Array<{ title: string }>;
  expect(remaining.map((task) => task.title)).toEqual([`Write final draft ${suffix}`]);
});
