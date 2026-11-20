import { expect, test, type Page } from '@playwright/test';
import { createWorkspaceWithProject } from '../support/api';

type Feature = {
  title: string;
  status: string;
  priority: string;
  kind: string;
  due_date: string | null;
  epic_id: string | null;
  tags: string[];
  bug_severity: string | null;
};

async function importFile(
  page: Page,
  workspaceId: string,
  projectId: string,
  file: { name: string; mimeType: string; content: string },
) {
  await page.goto(`/transfer/${workspaceId}/${projectId}`);
  await page.getByLabel('Choose a project transfer file').setInputFiles({
    name: file.name,
    mimeType: file.mimeType,
    buffer: Buffer.from(file.content),
  });
  await expect(page.getByRole('status', { name: 'Converted file' })).toBeVisible();
  await page.getByRole('button', { name: 'Review import' }).click();
  await expect(page.getByRole('heading', { name: 'Review planning changes' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm planning import' }).click();
  await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible();
}

async function importedProject(page: Page, workspaceId: string, name: string) {
  const projects = (await (
    await page.request.get(`/api/v1/workspaces/${workspaceId}/projects`)
  ).json()) as Array<{ id: string; name: string }>;
  const project = projects.find((candidate) => candidate.name === name);
  expect(project, `project ${name} was created`).toBeTruthy();
  const features = (await (
    await page.request.get(`/api/v1/workspaces/${workspaceId}/projects/${project!.id}/features`)
  ).json()) as Feature[];
  return { project: project!, features };
}

test('PA-TRN-005 imports a CSV from a spreadsheet through the real review flow', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createWorkspaceWithProject(page, {
    workspace: `CSV ${suffix}`,
    project: 'Existing',
  });
  const name = `Sprint ${suffix}`;
  const csv = [
    'Title;Description;Status;Priority;Type;Due;Tags;Epic',
    'Fix login;Users cannot sign in;In Progress;High;Bug;2026-12-01;auth, urgent;Launch',
    'Write docs;;To Do;;;;docs;Launch',
    ';;;;;;;',
    'Plan Q1;;Done;Low;;;;',
  ].join('\n');

  await importFile(page, workspace.id, project.id, {
    name: `${name}.csv`,
    mimeType: 'text/csv',
    content: csv,
  });

  const { features } = await importedProject(page, workspace.id, name);
  const byTitle = Object.fromEntries(features.map((feature) => [feature.title, feature]));
  expect(Object.keys(byTitle).sort()).toEqual(['Fix login', 'Plan Q1', 'Write docs']);
  expect(byTitle['Fix login']).toMatchObject({
    status: 'in_progress',
    priority: 'high',
    kind: 'bug',
    bug_severity: 'medium',
    due_date: '2026-12-01',
    tags: ['auth', 'urgent'],
  });
  expect(byTitle['Fix login'].epic_id).toBeTruthy();
  expect(byTitle['Write docs'].epic_id).toBe(byTitle['Fix login'].epic_id);
  expect(byTitle['Plan Q1']).toMatchObject({ status: 'done', priority: 'low', epic_id: null });
});

test('PA-TRN-006 imports GitHub issues exported with gh, grouping milestones into Epics', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const { workspace, project } = await createWorkspaceWithProject(page, {
    workspace: `GitHub ${suffix}`,
    project: 'Existing',
  });
  const repository = `acme/app-${suffix}`;
  const issues = [
    {
      number: 7,
      title: 'Login fails on Safari',
      body: 'Steps to reproduce…',
      state: 'OPEN',
      labels: [{ name: 'bug' }, { name: 'priority: high' }, { name: 'auth' }],
      milestone: { title: 'v1.0', dueOn: '2026-12-15T00:00:00Z' },
      url: `https://github.com/${repository}/issues/7`,
    },
    {
      number: 8,
      title: 'Add dark mode',
      body: null,
      state: 'CLOSED',
      labels: [{ name: 'enhancement' }],
      milestone: null,
      url: `https://github.com/${repository}/issues/8`,
    },
    {
      number: 9,
      title: 'Fix typo in README',
      state: 'OPEN',
      labels: [],
      pull_request: { url: 'x' },
      url: `https://github.com/${repository}/pull/9`,
    },
  ];

  await importFile(page, workspace.id, project.id, {
    name: 'issues.json',
    mimeType: 'application/json',
    content: JSON.stringify(issues),
  });

  const { features } = await importedProject(page, workspace.id, `${repository} issues`);
  expect(features.map((feature) => feature.title).sort()).toEqual([
    'Add dark mode',
    'Login fails on Safari',
  ]);
  const byTitle = Object.fromEntries(features.map((feature) => [feature.title, feature]));
  expect(byTitle['Login fails on Safari']).toMatchObject({
    kind: 'bug',
    priority: 'high',
    status: 'backlog',
    due_date: '2026-12-15',
    tags: ['auth'],
  });
  expect(byTitle['Login fails on Safari'].epic_id).toBeTruthy();
  expect(byTitle['Add dark mode']).toMatchObject({
    kind: 'story',
    status: 'done',
    tags: ['enhancement'],
    epic_id: null,
  });
});
