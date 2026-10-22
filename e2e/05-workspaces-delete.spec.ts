import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Workspaces (owner deletes a workspace)', () => {
  test('owner cancels and then confirms deletion from the workspace card', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Delete me');

    await page.getByRole('button', { name: 'Back to boards' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();

    const card = page.getByRole('article').filter({ hasText: 'Delete me' });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Delete Delete me' }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Delete me');

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Delete Delete me' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Delete board' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'No boards yet' })).toBeVisible({
      timeout: 20000,
    });
    await expect(card).toHaveCount(0);
  });
});
