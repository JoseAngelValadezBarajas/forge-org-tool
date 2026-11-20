import { expect, test } from '@playwright/test';
import { createFeature, createWorkspace, createWorkspaceWithProject } from '../support/api';

test('PA-TRN-004 a finished import offers Open project and Import another', async ({ page }) => {
  test.setTimeout(60_000);
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createWorkspaceWithProject(page, {
    workspace: `Completion source ${suffix}`,
    project: `Completion ${suffix}`,
  });
  await createFeature(page, workspace.id, project.id, { title: `Item ${suffix}` });
  const exported = await (
    await page.request.get(
      `/api/v1/workspaces/${workspace.id}/projects/${project.id}/export?schema_version=forge-project-transfer-v2`,
    )
  ).json();
  const target = await createWorkspace(page, `Completion target ${suffix}`);

  await page.goto(`/transfer/${target.id}/${project.id}`);
  const chooseFile = async () =>
    page.getByLabel('Choose a project transfer file').setInputFiles({
      name: 'project-export.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(exported)),
    });
  await chooseFile();
  await page.getByRole('button', { name: 'Review import' }).click();
  await page.getByRole('button', { name: 'Confirm planning import' }).click();

  await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible();
  const created = page.getByRole('list', { name: 'Records created' });
  await expect(created).toContainText('features: 1');
  await expect(page.getByRole('link', { name: 'Open project' })).toHaveAttribute(
    'href',
    new RegExp(`^/projects/${target.id}/`),
  );

  // Import another: the finished import is cleared and the page is ready for a new file.
  await page.getByRole('button', { name: 'Import another' }).click();
  await expect(page.getByRole('heading', { name: 'Import complete' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Review import' })).toBeDisabled();

  // A new file can be reviewed straight away.
  await chooseFile();
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByRole('heading', { name: 'Review planning changes' })).toBeVisible();
});
