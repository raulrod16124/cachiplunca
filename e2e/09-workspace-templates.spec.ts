import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Workspace templates', () => {
  test('creates a retrospective workspace with prebuilt elements', async ({ page }) => {
    await registerUser(page);

    await page.getByRole('button', { name: 'Create board' }).first().click();
    await page.getByLabel('Name').fill('Sprint retrospective');
    await page.getByRole('radio', { name: 'Retrospective' }).check();
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByRole('heading', { level: 3, name: 'Sprint retrospective' })).toBeVisible(
      { timeout: 20000 },
    );

    const card = page.getByRole('article').filter({ hasText: 'Sprint retrospective' }).first();
    await card.getByRole('button', { name: 'Open' }).click();

    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(10);
    await expect(page.getByText('What went well')).toBeVisible();
    await expect(page.getByText('Add release checklist')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'This board is empty' })).toHaveCount(0);
  });

  test('offers a CTA to add the first note on a blank board', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Blank board');

    await expect(page.getByRole('heading', { name: 'This board is empty' })).toBeVisible();
    await page.getByRole('button', { name: 'Add a note' }).click();

    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'This board is empty' })).toHaveCount(0);
  });
});
