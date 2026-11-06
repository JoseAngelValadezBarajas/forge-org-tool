import { expect, test, type Page } from '@playwright/test';
import { createFeature, createWorkspaceWithProject } from '../support/api';

const VIEWPORTS = [
  { name: 'small phone', width: 360, height: 740 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
];

async function seed(page: Page) {
  const suffix = Date.now();
  const { workspace, project } = await createWorkspaceWithProject(page, {
    workspace: `Responsive ${suffix}`,
    project: `Responsive project ${suffix}`,
  });
  const epicResponse = await page.request.post(
    `/api/v1/workspaces/${workspace.id}/projects/${project.id}/epics`,
    {
      data: {
        title: 'A deliberately long Epic title that must wrap on narrow screens',
        priority: 'high',
      },
    },
  );
  const epic = (await epicResponse.json()) as { id: string };
  const feature = await createFeature(page, workspace.id, project.id, {
    epic_id: epic.id,
    title: 'A deliberately long Work Item title that must wrap on narrow screens too',
    kind: 'story',
  });
  const base = `${workspace.id}/${project.id}`;
  return [
    '/',
    '/workspaces/manage',
    '/settings/storage',
    `/workspaces/${workspace.id}/settings`,
    `/projects/${base}`,
    `/planning/${base}`,
    `/planning/${base}/epics/${epic.id}`,
    `/planning/${base}/features/${feature.id}`,
    `/transfer/${base}`,
  ];
}

// Responsive contract: at every supported width no route scrolls the page sideways.
// Wide boards may scroll inside their own container, never the document.
test('no route overflows the page horizontally at any supported width @responsive', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'viewports are set explicitly below');
  test.setTimeout(120_000);
  const routes = await seed(page);
  const overflows: string[] = [];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      if (scrollWidth > clientWidth) {
        overflows.push(
          `${viewport.name} ${viewport.width}px ${route}: ${scrollWidth} > ${clientWidth}`,
        );
      }
    }
  }
  expect(overflows).toEqual([]);
});
