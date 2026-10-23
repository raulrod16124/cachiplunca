import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Workspace grid/list toggle', () => {
  test('switches between grid and list without losing search results', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Alpha board');
    await page.getByRole('button', { name: 'Back to boards' }).click();

    await createWorkspace(page, 'Beta board');
    await page.getByRole('button', { name: 'Back to boards' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(2);

    const gridToggle = page.getByRole('button', { name: 'Grid view' });
    const listToggle = page.getByRole('button', { name: 'List view' });

    await expect(gridToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(listToggle).toHaveAttribute('aria-pressed', 'false');

    await listToggle.click();

    await expect(listToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(gridToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('list')).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByRole('heading', { level: 3, name: 'Alpha board' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Beta board' })).toBeVisible();

    const search = page.getByRole('searchbox', { name: 'Search boards' });
    await search.fill('Alpha');

    await expect(page.getByRole('listitem')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 3, name: 'Alpha board' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Beta board' })).toHaveCount(0);

    await gridToggle.click();

    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 3, name: 'Alpha board' })).toBeVisible();
    await expect(search).toHaveValue('Alpha');
  });

  test('keeps the toggle usable in a narrow viewport', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Narrow board');
    await page.getByRole('button', { name: 'Back to boards' }).click();

    await page.setViewportSize({ width: 390, height: 800 });
    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();

    const listToggle = page.getByRole('button', { name: 'List view' });
    await expect(listToggle).toBeVisible();
    await listToggle.click();

    await expect(listToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('listitem')).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
});
