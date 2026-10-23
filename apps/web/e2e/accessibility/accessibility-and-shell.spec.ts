import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('PA-A11Y-01 shell themes, keyboard command navigation, focus restoration and WCAG scan', async ({
  page,
}) => {
  const suffix = `${test.info().project.name}-${Date.now()}`;
  const workspace = await (
    await page.request.post('/api/v1/workspaces', { data: { name: `A11y ${suffix}` } })
  ).json();
  const project = await (
    await page.request.post(`/api/v1/workspaces/${workspace.id}/projects`, {
      data: { name: `Accessible project ${suffix}` },
    })
  ).json();

  await page.goto('/');
  const appearance = page.getByRole('combobox', { name: 'Appearance' });
  for (const theme of ['dark', 'light', 'system']) {
    await appearance.selectOption(theme);
    await expect(page.locator('[data-testid="application-shell"]')).toHaveAttribute(
      'data-theme',
      theme === 'system' ? /dark|light/ : theme,
    );
  }
  await appearance.selectOption('light');
  await page.reload();
  await expect(appearance).toHaveValue('light');
  await page.goto(`/planning/${workspace.id}/${project.id}`);

  const openPalette = page.getByRole('button', { name: 'Open command palette' });
  await openPalette.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  const commandSearch = page.getByRole('searchbox', { name: 'Search commands' });
  await expect(commandSearch).toBeFocused();
  await commandSearch.fill('Planning');
  const paletteScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(paletteScan.violations, JSON.stringify(paletteScan.violations, null, 2)).toEqual([]);
  await expect(dialog.getByRole('button', { name: 'Go to Planning' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(openPalette).toBeFocused();

  await openPalette.click();
  await page.getByRole('searchbox', { name: 'Search commands' }).fill('Planning');
  await page.getByRole('button', { name: 'Go to Planning' }).click();
  await expect(page).toHaveURL(`/planning/${workspace.id}/${project.id}`);
  await expect(page.getByRole('heading', { name: 'Planning', exact: true })).toBeVisible();
  const pageScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(pageScan.violations, JSON.stringify(pageScan.violations, null, 2)).toEqual([]);
});
