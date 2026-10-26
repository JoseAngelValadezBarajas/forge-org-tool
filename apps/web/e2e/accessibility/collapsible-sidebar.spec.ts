import { expect, test } from '@playwright/test';

test('PA-SHELL-02 collapsible sidebar preserves navigation and viewport geometry', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'chromium-mobile',
    'The desktop sidebar is hidden on mobile.',
  );

  const suffix = `${testInfo.project.name}-${Date.now()}`;
  const workspace = await (
    await page.request.post('/api/v1/workspaces', { data: { name: `Sidebar ${suffix}` } })
  ).json();
  const project = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
      data: { name: `Compact project ${suffix}` },
    })
  ).json();

  await page.goto(`/planning/${workspace.id}/${project.id}`);
  const sidebar = page.getByTestId('app-sidebar');
  const grid = page.getByTestId('app-shell-grid');
  const toggle = page.getByTestId('sidebar-toggle');
  const projectNavigation = page.getByRole('navigation', { name: 'Project navigation' });
  const projectLink = projectNavigation.getByRole('link', { name: project.name });

  await expect(toggle).toHaveAccessibleName('Collapse sidebar');
  await expect(projectLink).toHaveAttribute('aria-current', 'page');
  const expandedBox = await sidebar.boundingBox();
  expect(expandedBox).not.toBeNull();
  expect(expandedBox!.width).toBe(244);

  await toggle.click();

  await expect(toggle).toHaveAccessibleName('Expand sidebar');
  await expect(grid).toHaveAttribute('data-sidebar-collapsed', 'true');
  await expect(projectLink).toHaveAttribute('aria-current', 'page');
  await expect(projectLink.locator('[data-icon="Layers"]')).toBeVisible();
  const compactWorkspace = page.getByTestId('workspace-compact-control');
  const workspaceBox = await compactWorkspace.boundingBox();
  expect(workspaceBox).not.toBeNull();
  expect(workspaceBox!.width).toBe(40);
  const workspaceOverview = projectNavigation.getByRole('link', { name: 'Workspace Overview' });
  await expect(workspaceOverview.locator('[data-navigation-label]')).toHaveCount(1);
  await expect(workspaceOverview.locator('[data-navigation-label]')).toHaveCSS(
    'position',
    'absolute',
  );
  await expect(workspaceOverview.locator('[data-navigation-label]')).toHaveCSS('width', '1px');
  await expect(workspaceOverview.locator('[data-navigation-label]')).toHaveCSS(
    'clip',
    'rect(0px, 0px, 0px, 0px)',
  );
  await expect(projectLink.locator('[data-navigation-label]')).toHaveCSS(
    'clip',
    'rect(0px, 0px, 0px, 0px)',
  );
  const searchButton = projectNavigation.getByRole('button', { name: 'Open project search' });
  const expandProjectsButton = projectNavigation.getByRole('button', { name: 'Collapse projects' });
  await expect(searchButton).toBeVisible();
  await expect(expandProjectsButton).toBeVisible();
  const collapsedBox = await sidebar.boundingBox();
  expect(collapsedBox).not.toBeNull();
  expect(collapsedBox!.width).toBe(72);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await searchButton.click();
  const projectSearch = page.getByRole('searchbox', { name: 'Search projects' });
  await expect(projectSearch).toBeVisible();
  const searchBox = await projectSearch.locator('..').boundingBox();
  expect(searchBox).not.toBeNull();
  expect(searchBox!.width).toBe(200);

  await page.reload();
  await expect(page.getByTestId('sidebar-toggle')).toHaveAccessibleName('Expand sidebar');
  await expect(grid).toHaveAttribute('data-sidebar-collapsed', 'true');
});
