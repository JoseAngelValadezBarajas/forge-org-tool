/* global document */
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

let server;
let browser;
let port;
let artifacts;
const pageErrors = new WeakMap();

async function freePort() {
  const listener = createServer();
  await new Promise((resolve, reject) =>
    listener.listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve())),
  );
  const { port: selected } = listener.address();
  await new Promise((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  );
  return selected;
}

before(async () => {
  artifacts = await mkdtemp(join(tmpdir(), 'forge-ux01-ux08-'));
  port = await freePort();
  server = spawn(
    process.execPath,
    [
      resolve(
        fileURLToPath(new URL('../../../../../node_modules/vite/bin/vite.js', import.meta.url)),
      ),
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    { cwd: resolve(fileURLToPath(new URL('../../../', import.meta.url))), stdio: 'ignore' },
  );
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Vite exited with code ${server.exitCode}`);
    try {
      const response = await globalThis.fetch(origin);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      await delay(250);
    }
  }
  if (!ready) throw new Error('Isolated Vite server did not become ready.');
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolveExit) => server.once('exit', resolveExit));
  }
  process.stdout.write(`Browser artifacts: ${artifacts}\n`);
});

async function fixturePage({ width = 1440, projectCount = 3, tagCount = 5 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 960 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  pageErrors.set(page, errors);
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    let payload = [];
    if (url.pathname === '/api/v1/workspaces') {
      payload = [
        {
          id: 'w1',
          name: 'Personal',
          description: null,
          status: 'active',
          archived_at: null,
          created_at: '',
          updated_at: '',
        },
      ];
    } else if (url.pathname.endsWith('/projects')) {
      payload = Array.from({ length: projectCount }, (_, index) => ({
        id: `p${index + 1}`,
        workspace_id: 'w1',
        name: ['FormiAI', 'Forge', 'Taringa 2.0'][index] ?? `Additional project ${index}`,
        description:
          'A project with a persisted description that can wrap without hiding its actions',
        status: 'active',
        archived_at: null,
        created_at: '',
        updated_at: '',
      }));
    } else if (url.pathname.endsWith('/planning/overview')) {
      payload = { epics: [], unassigned_features: [] };
    } else if (url.pathname.endsWith('/tags')) {
      payload = Array.from({ length: tagCount }, (_, index) => ({
        id: `tag${index}`,
        workspace_id: 'w1',
        name:
          ['research', 'computer-vision', 'frontend', 'tracking', 'bug'][index] ??
          `additional-tag-${index}`,
        color: '#d8874d',
        created_at: '',
      }));
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
  return page;
}

async function closeVerifiedPage(page) {
  assert.deepEqual(pageErrors.get(page), [], 'No browser runtime errors');
  await page.context().close();
}

async function assertAccessibleContent(page) {
  const results = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  assert.deepEqual(
    results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })),
    [],
    'Workspace content accessibility',
  );
}

test('Workspace Home and Tags keep the approved 1440x960 Figma content geometry', async () => {
  const page = await fixturePage();
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.getByRole('heading', { name: 'Your workspace, in focus' }).waitFor();
  await page.getByRole('article').last().waitFor();
  await page.evaluate(() => document.fonts.ready);
  const home = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    const cards = [...document.querySelectorAll('[aria-label="Projects"] > *')].map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect();
      return { x, y, width, height };
    });
    return {
      heading: rect('main h1'),
      toolbar: rect('section[aria-labelledby="projects-heading"] > header'),
      summary: rect('[aria-label="Workspace summary"]'),
      cards,
      recent: rect('[aria-labelledby="continue-working-heading"]'),
      description: rect('article p'),
      cardSummary: rect('article p + p'),
      recentItem: rect('[aria-labelledby="continue-working-heading"] a'),
    };
  });
  assertRect(home.heading, { x: 268, y: 113, width: 900, height: 39 }, 'Workspace Home title');
  assertRect(home.toolbar, { x: 268, y: 211, width: 1148, height: 45 }, 'Projects toolbar');
  assertRect(home.summary, { x: 268, y: 274, width: 1148, height: 116 }, 'Workspace metrics');
  assertRect(home.cards[0], { x: 268, y: 408, width: 343, height: 196 }, 'First Project card');
  assertRect(home.cards[1], { x: 630, y: 408, width: 343, height: 196 }, 'Second Project card');
  assertRect(home.cards[2], { x: 992, y: 408, width: 343, height: 196 }, 'Third Project card');
  assertRect(home.recent, { x: 268, y: 628, width: 1148, height: 195 }, 'Continue working');
  assertRect(home.description, { x: 285, y: 495, width: 306, height: 40 }, 'Project description');
  assertRect(home.cardSummary, { x: 285, y: 545, width: 309, height: 22 }, 'Project counts');
  assertRect(home.recentItem, { x: 287, y: 687, width: 535, height: 104 }, 'Continuation card');
  await page.screenshot({ path: join(artifacts, 'workspace-home-desktop.png') });
  await assertAccessibleContent(page);

  await page.goto(`http://127.0.0.1:${port}/workspaces/w1/settings`);
  await page.getByRole('heading', { name: 'Manage workspace tags' }).waitFor();
  const tags = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    const firstTag = document.querySelector('section[aria-label^="Tags in"] li');
    const { x, y, width, height } = firstTag.getBoundingClientRect();
    return {
      heading: rect('main h1'),
      newTag: rect('button[aria-label="New tag"]'),
      layout: rect('[aria-label="Workspace tag composition"]'),
      catalog: rect('section[aria-label^="Tags in"]'),
      guidance: rect('aside[aria-labelledby="tag-guidance-heading"]'),
      firstTag: { x, y, width, height },
    };
  });
  assertRect(tags.heading, { x: 274, y: 119, width: 900, height: 42 }, 'Workspace Tags title');
  assertRect(tags.newTag, { x: 1219, y: 95, width: 161, height: 42 }, 'New Tag action');
  assertRect(
    tags.layout,
    { x: 274, y: 210, width: 1136, height: 593 },
    'Workspace tag composition',
  );
  assertRect(tags.catalog, { x: 274, y: 210, width: 712, height: 593 }, 'Workspace tag catalog');
  assertRect(tags.guidance, { x: 1004, y: 210, width: 406, height: 593 }, 'Tag guidance');
  assertRect(tags.firstTag, { x: 295, y: 319, width: 666, height: 78 }, 'First workspace tag row');
  await page.screenshot({ path: join(artifacts, 'workspace-tags-desktop.png') });
  await assertAccessibleContent(page);
  await writeFile(
    join(artifacts, 'geometry.json'),
    JSON.stringify({ viewport: { width: 1440, height: 960 }, home, tags }, null, 2),
  );
  process.stdout.write(`Verified desktop geometry: ${JSON.stringify({ home, tags })}\n`);
  await closeVerifiedPage(page);
});

test('additional projects and tags grow their layouts without overlapping the following content', async () => {
  const page = await fixturePage({ projectCount: 7, tagCount: 8 });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.getByRole('article').nth(6).waitFor();
  const lastProject = await page.getByRole('article').last().boundingBox();
  const continuation = await page.getByRole('region', { name: 'Continue working' }).boundingBox();
  assert.ok(
    continuation.y >= lastProject.y + lastProject.height,
    'Continue working must follow every project row',
  );
  await page.goto(`http://127.0.0.1:${port}/workspaces/w1/settings`);
  await page.locator('section[aria-label^="Tags in"] li').nth(7).waitFor();
  const lastTag = await page.locator('section[aria-label^="Tags in"] li').last().boundingBox();
  const catalog = await page.locator('section[aria-label^="Tags in"]').boundingBox();
  const profile = await page
    .getByText('Workspace profile and status', { exact: true })
    .boundingBox();
  assert.ok(
    catalog.y + catalog.height >= lastTag.y + lastTag.height,
    'The catalog must contain all tags',
  );
  assert.ok(
    profile.y >= lastTag.y + lastTag.height,
    'Workspace controls must follow every tag row',
  );
  await closeVerifiedPage(page);
});

for (const width of [1280, 1024, 800, 390]) {
  test(`Workspace layouts and tag editing fit a ${width}px viewport`, async () => {
    const page = await fixturePage({ width });
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.getByRole('article').last().waitFor();
    for (const card of await page.getByRole('article').all()) {
      const bounds = await card.boundingBox();
      assert.ok(
        bounds.x >= 0 && bounds.x + bounds.width <= width,
        `Project card stays within ${width}px`,
      );
    }
    if (width === 390)
      await page.screenshot({ path: join(artifacts, 'workspace-home-mobile.png'), fullPage: true });
    await page.goto(`http://127.0.0.1:${port}/workspaces/w1/settings`);
    await page.locator('section[aria-label^="Tags in"] li').last().waitFor();
    const contentFits = await page
      .locator('[aria-label="Workspace tag composition"]')
      .evaluate((element) => element.scrollWidth <= element.clientWidth);
    assert.ok(contentFits, `Tag composition stays within ${width}px`);
    if (width === 390)
      await page.screenshot({ path: join(artifacts, 'workspace-tags-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'New tag', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Edit workspace tags' });
    await editor.waitFor();
    assert.ok(
      await editor
        .getByLabel('New tag name', { exact: true })
        .evaluate((element) => document.activeElement === element),
      'New tag starts with its name field focused',
    );
    assert.ok(
      await editor.evaluate((element) => element.scrollWidth <= element.clientWidth),
      `Tag editor fits ${width}px without horizontal scrolling`,
    );
    const editorBounds = await editor.boundingBox();
    for (const button of await editor.getByRole('button').all()) {
      const bounds = await button.boundingBox();
      assert.ok(
        bounds.x >= editorBounds.x &&
          bounds.x + bounds.width <= editorBounds.x + editorBounds.width,
        `Every editor action fits ${width}px`,
      );
    }
    await assertAccessibleContent(page);
    if (width === 390)
      await page.screenshot({ path: join(artifacts, 'workspace-tag-editor-mobile.png') });
    await page.keyboard.press('Escape');
    await editor.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'New tag', exact: true }).click();
    await editor.waitFor();
    await editor.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Edit tag tracking', exact: true }).click();
    await editor.waitFor();
    assert.ok(
      await editor
        .getByLabel('Name for tag tracking', { exact: true })
        .evaluate((element) => document.activeElement === element),
      'Editing a row focuses that tag',
    );
    await closeVerifiedPage(page);
  });
}

function assertRect(actual, expected, label) {
  if (!actual) throw new Error(`${label} was not rendered`);
  for (const key of ['x', 'y', 'width', 'height']) {
    if (actual[key] !== expected[key]) {
      throw new Error(`${label} ${key}: expected ${expected[key]}, received ${actual[key]}`);
    }
  }
}
