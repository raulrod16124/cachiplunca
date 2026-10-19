import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

test.describe('Workspaces (owner duplicates a workspace)', () => {
  test('owner duplicates a board and the copy is independent', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Duplicate me');

    await addElement(page, 'note');
    await addElement(page, 'task');
    const items = page.locator('[data-testid^="canvas-item-"]');
    await expect(items).toHaveCount(2);

    await page.getByRole('button', { name: 'Back to workspaces' }).click();
    const sourceCard = page.getByRole('article').filter({ hasText: 'Duplicate me' });
    await expect(sourceCard).toBeVisible();

    await sourceCard.getByRole('button', { name: 'Duplicate Duplicate me' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Copy of Duplicate me' })).toBeVisible(
      { timeout: 20000 },
    );
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible();
    await expect(items).toHaveCount(2);

    await page.getByRole('button', { name: 'Back to workspaces' }).click();
    await expect(
      page.getByRole('heading', { level: 3, name: 'Duplicate me', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 3, name: 'Copy of Duplicate me', exact: true }),
    ).toBeVisible();
  });
});
