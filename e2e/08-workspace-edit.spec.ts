import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

test.describe('Workspaces (owner edits a workspace)', () => {
  test('owner updates the name and description from the workspace card', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Editable board');

    await page.getByRole('button', { name: 'Back to boards' }).click();
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
    await expect(updatedCard).toContainText(/Created /);
    await expect(page.getByRole('heading', { level: 3, name: 'Editable board' })).toHaveCount(0);

    await updatedCard.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Renamed board' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('button', { name: 'Rename workspace' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Workspace name' })).toHaveCount(0);
  });

  test('creates a board with a type and shows its icon', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Travel board', 'Travel');

    await page.getByRole('button', { name: 'Back to boards' }).click();
    const card = page.getByRole('article').filter({ hasText: 'Travel board' });
    await expect(
      card.getByTestId('workspace-cover-card').locator('.lucide-calendar-days'),
    ).toBeVisible();
    await expect(
      card.getByTestId('workspace-type-badge').locator('.lucide-calendar-days'),
    ).toBeVisible();
  });

  test('owner changes the board type and the card shows its icon', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Typed board');

    await page.getByRole('button', { name: 'Back to boards' }).click();
    const card = page.getByRole('article').filter({ hasText: 'Typed board' });
    await card.getByRole('button', { name: 'Edit Typed board' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'Travel' }).click();
    await expect(dialog.getByRole('radio', { name: 'Travel' })).toBeChecked();
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(dialog).toBeHidden();
    const cover = card.getByTestId('workspace-cover-card');
    await expect(cover.locator('.lucide-calendar-days')).toBeVisible();
    await expect(
      card.getByTestId('workspace-type-badge').locator('.lucide-calendar-days'),
    ).toBeVisible();
  });

  test('orders boards by the most recent activity', async ({ page }) => {
    await registerUser(page);

    await createWorkspace(page, 'Older board');
    await page.getByRole('button', { name: 'Back to boards' }).click();

    await createWorkspace(page, 'Newer board');
    await page.getByRole('button', { name: 'Back to boards' }).click();

    const cards = page.getByRole('article');
    await expect(cards.first()).toContainText('Newer board');

    const olderCard = cards.filter({ hasText: 'Older board' });
    await olderCard.getByRole('button', { name: 'Open' }).click();
    await addElement(page, 'text');
    await page.getByRole('button', { name: 'Back to boards' }).click();

    await expect(cards.first()).toContainText('Older board');
  });
});
