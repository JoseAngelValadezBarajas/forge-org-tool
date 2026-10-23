import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const evidenceDir =
  process.env.FORGE_E2E_EVIDENCE_DIR ??
  resolve(process.cwd(), '../../test-results/product-acceptance');

async function captureResponsiveEvidence(
  page: Page,
  route:
    | 'planning'
    | 'readiness'
    | 'run-detail'
    | 'handoff-detail'
    | 'repository-detail'
    | 'context-package-detail'
    | 'evidence-detail'
    | 'verification-detail'
    | 'candidate-detail',
  heading: string,
  widths: number[],
) {
  const originalViewport = page.viewportSize();
  const appearance = page.getByRole('combobox', { name: 'Appearance' });
  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
    const overflow = await page.evaluate(() => {
      const offenders = [
        document.documentElement,
        document.body,
        ...document.querySelectorAll('body *'),
      ]
        .filter((element) => !element.closest?.('[aria-label="Product navigation"]'))
        .map((element) => ({
          tag: element.tagName,
          className: typeof element.className === 'string' ? element.className : '',
          text: element.textContent?.trim().slice(0, 60),
          right: Math.round(element.getBoundingClientRect().right),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }))
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .slice(-20);
      return { scrollWidth: document.documentElement.scrollWidth, offenders };
    });
    expect(
      overflow.scrollWidth <= width,
      `${route} should not overflow at ${width}px: ${JSON.stringify(overflow.offenders)}`,
    ).toBe(true);
    for (const theme of ['dark', 'light'] as const) {
      await appearance.selectOption(theme);
      await expect(page.getByTestId('application-shell')).toHaveAttribute('data-theme', theme);
      await page.screenshot({
        path: resolve(evidenceDir, `${route}-${width}-${theme}.png`),
        fullPage: true,
      });
    }
  }
  if (originalViewport) await page.setViewportSize(originalViewport);
}

test(
  'project navigation connects planning, readiness, context and product workspaces',
  { tag: ['@smoke', '@visual'] },
  async ({ page }) => {
    test.setTimeout(120_000);
    page.on('requestfailed', (request) =>
      console.log(
        `UX-02 request failed: ${request.method()} ${request.url()} ${request.failure()?.errorText}`,
      ),
    );
    const suffix = test.info().project.name;
    const workspace = await (
      await page.request.post('/api/v1/workspaces', { data: { name: `UX-02 ${suffix}` } })
    ).json();
    const project = await (
      await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
        data: { name: `Workflow ${suffix}` },
      })
    ).json();
    const feature = await (
      await page.request.post(
        `/api/v1/workspaces/${workspace.id}/projects/${project.id}/features`,
        {
          data: { title: `Feature ${suffix}`, goal: 'Verify contextual product navigation' },
        },
      )
    ).json();
    expect(feature.id).toBeTruthy();

    await page.goto(`/planning/${workspace.id}/${project.id}`);
    await expect(page.getByRole('heading', { name: 'Planning', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: `Feature ${suffix}` })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Project');
    await mkdir(evidenceDir, { recursive: true });
    const widths = test.info().project.name === 'chromium-mobile' ? [390, 375] : [1440, 1280, 1024];
    const detailWidths = test.info().project.name === 'chromium-mobile' ? [390] : [1280];
    await captureResponsiveEvidence(page, 'planning', 'Planning', widths);

    await page.getByRole('link', { name: `Feature ${suffix}` }).click();
    await expect(page.getByRole('heading', { name: 'Feature detail' })).toBeVisible();
    await page.getByRole('link', { name: 'Readiness', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Readiness', exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Appearance' }).selectOption('dark');
    await expect(page.getByText(/^Outcome:/).or(page.getByRole('alert'))).toBeVisible();
    if (await page.getByRole('alert').isVisible()) {
      await page.getByRole('button', { name: 'Retry readiness evaluation' }).click();
    }
    await expect(page.getByText(/^Outcome:/)).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await captureResponsiveEvidence(page, 'readiness', 'Readiness', widths);
    const browserContext = page.context();
    await page.close();
    page = await browserContext.newPage();
    await page.goto(`/repositories/${workspace.id}/${project.id}`);

    const repositoryRoot = process.env.FORGE_E2E_REPOSITORY_ROOT;
    expect(repositoryRoot).toBeTruthy();
    await page.getByRole('link', { name: 'Repositories', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Repositories', exact: true })).toBeVisible();
    await page.getByLabel('Approved local Git root').fill(repositoryRoot!);
    await page.getByRole('button', { name: 'Connect Repository' }).click();
    const repositoryLink = page.getByRole('link', { name: /^View repository / });
    await expect(repositoryLink).toBeVisible();
    await page.getByRole('button', { name: 'Observe metadata' }).click();
    await expect(page.getByText(/Latest observation:/)).toBeVisible();
    await repositoryLink.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Repository detail', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Latest observation:/)).toBeVisible();
    await captureResponsiveEvidence(page, 'repository-detail', 'Repository detail', detailWidths);

    await page.getByRole('link', { name: 'Back to repositories' }).press('Enter');
    await page.getByRole('link', { name: 'Planning', exact: true }).click();
    await page.getByRole('link', { name: `Feature ${suffix}` }).click();
    await page.getByRole('link', { name: 'Context', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Feature context' })).toBeVisible();
    await page.getByRole('button', { name: `Link ${repositoryRoot}` }).click();
    await expect(page.getByRole('button', { name: `Unlink ${repositoryRoot}` })).toBeVisible();
    await page.getByRole('button', { name: 'Preview context package' }).click();
    await expect(page.getByText('Schema: forge-context-v1', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save context package' }).press('Enter');
    const packageLink = page.getByRole('link', { name: 'Open context package' });
    await expect(packageLink).toBeVisible();
    await packageLink.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Context package snapshot', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download JSON' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download Markdown' })).toBeVisible();
    await captureResponsiveEvidence(
      page,
      'context-package-detail',
      'Context package snapshot',
      detailWidths,
    );

    await page.getByRole('link', { name: 'Workbench', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Workbench', exact: true })).toBeVisible();
    const runTitle = `Manual run ${suffix}`;
    await page.getByLabel('Run title').fill(runTitle);
    await page.getByRole('button', { name: 'Record Run' }).click();
    await page.getByRole('link', { name: `View run ${runTitle}` }).press('Enter');
    await expect(
      page.getByRole('heading', { name: runTitle, exact: true, level: 2 }),
    ).toBeVisible();
    const eventTitle = `Reported event ${suffix}`;
    await page.getByLabel('Event type').fill('manual progress');
    await page.getByLabel('Event title').fill(eventTitle);
    await page.getByLabel('Event description').fill('Recorded by a human operator.');
    await page.getByRole('button', { name: 'Record activity event' }).click();
    await expect(page.getByText(eventTitle, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(eventTitle, { exact: true })).toBeVisible();
    await captureResponsiveEvidence(page, 'run-detail', runTitle, detailWidths);

    await page.getByRole('link', { name: 'Back to Workbench' }).press('Enter');
    const handoffTitle = `Handoff for ${runTitle}`;
    await page.getByRole('button', { name: `Create handoff for ${runTitle}` }).click();
    await page.getByLabel(`Summary for ${handoffTitle}`).fill('Human-reported handoff summary');
    await page.getByLabel(`Next actions for ${handoffTitle}`).fill('Review the recorded run.');
    await page.getByRole('button', { name: 'Save handoff details' }).click();
    await page.getByRole('button', { name: 'Mark handoff ready' }).click();
    await page.getByRole('link', { name: `Review handoff ${handoffTitle}` }).press('Enter');
    await expect(
      page.getByRole('heading', { name: handoffTitle, exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText('Human-reported handoff summary', { exact: true })).toBeVisible();
    await page.getByLabel('Acknowledged by').fill('UX-02 reviewer');
    await page.getByLabel('Acknowledged by').press('Enter');
    await expect(page.getByText(/Acknowledged by UX-02 reviewer for revision 1/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Revision 1 is acknowledged/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download JSON snapshot' })).toBeVisible();
    await captureResponsiveEvidence(page, 'handoff-detail', handoffTitle, detailWidths);

    await page.getByRole('link', { name: 'Back to workbench handoffs' }).press('Enter');
    await page.getByRole('link', { name: 'Delivery', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Delivery overview', exact: true }),
    ).toBeVisible();
    const evidenceTitle = `Reported evidence ${suffix}`;
    await page.getByLabel('Evidence title').fill(evidenceTitle);
    await page.getByLabel('Evidence summary').fill('A person reported this delivery reference.');
    await page.getByRole('button', { name: 'Record Evidence' }).click();
    await page.getByRole('link', { name: 'Open evidence detail' }).press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Evidence detail & provenance', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: evidenceTitle, exact: true })).toBeVisible();
    await captureResponsiveEvidence(
      page,
      'evidence-detail',
      'Evidence detail & provenance',
      detailWidths,
    );
    await page.getByRole('link', { name: /Back to delivery/ }).press('Enter');

    const verificationRule = page.getByRole('combobox', { name: 'Verification rule' });
    await expect(verificationRule.locator('option')).not.toHaveCount(0);
    await verificationRule.selectOption({ index: 0 });
    await page.getByRole('button', { name: 'Evaluate verification' }).click();
    const verificationLink = page.getByRole('link', { name: 'Open verification result' });
    await expect(verificationLink).toBeVisible();
    await verificationLink.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Verification result & trace', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('main')).toContainText('The current API exposes outcome');
    await captureResponsiveEvidence(
      page,
      'verification-detail',
      'Verification result & trace',
      detailWidths,
    );
    await page.getByRole('link', { name: /Back to delivery/ }).press('Enter');

    const candidateTitle = `Candidate ${suffix}`;
    await page.getByLabel('New candidate title').fill(candidateTitle);
    await page.getByLabel('New candidate summary').fill('Candidate under human review.');
    await page.getByRole('button', { name: 'Create Candidate' }).click();
    await page.getByRole('button', { name: `Preview gates for ${candidateTitle}` }).click();
    await page.getByRole('button', { name: 'Evaluate gates' }).click();
    await page.getByRole('button', { name: `Freeze ${candidateTitle}` }).click();
    await page.getByRole('link', { name: 'Candidate detail & history' }).press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Candidate detail & history', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: candidateTitle, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Saved revision history' })).toBeVisible();
    await captureResponsiveEvidence(
      page,
      'candidate-detail',
      'Candidate detail & history',
      detailWidths,
    );

    await page.getByRole('link', { name: 'Transfer', exact: true }).press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Project transfer', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Product navigation' })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('navigation', { name: 'Product navigation' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  },
);
