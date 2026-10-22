import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Workspaces (owner edits a workspace)', () => {
  test('owner updates the name and description from the workspace card', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Editable board');

    await page.getByRole('button', { name: 'Back to workspaces' }).click();
    const card = page.getByRole('article').filter({ hasText: 'Editable board' });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Edit Editable board' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Name')).toHaveValue('Editable board');

    await dialog.getByLabel('Name').fill('Renamed board');
    await dialog.getByLabel('Description').fill('Updated description');
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(dialog).toBeHidden();
    const updatedCard = page.getByRole('article').filter({ hasText: 'Renamed board' });
    await expect(
      updatedCard.getByRole('heading', { level: 3, name: 'Renamed board' }),
    ).toBeVisible();
    await expect(updatedCard).toContainText('Updated description');
    await expect(page.getByRole('heading', { level: 3, name: 'Editable board' })).toHaveCount(0);

    await updatedCard.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Renamed board' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('button', { name: 'Rename workspace' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Workspace name' })).toHaveCount(0);
  });
});
