import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Favorites', () => {
  test('marks a board as favorite and keeps it after a reload', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Favorite board');
    await page.getByRole('button', { name: 'Back to boards' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();

    const addFavorite = page.getByRole('button', { name: 'Add to favorites Favorite board' });
    await addFavorite.click();

    const removeFavorite = page.getByRole('button', {
      name: 'Remove from favorites Favorite board',
    });
    await expect(removeFavorite).toHaveAttribute('aria-pressed', 'true');
    await expect(removeFavorite).toBeEnabled();
    await page.waitForTimeout(500);

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
    await expect(removeFavorite).toHaveAttribute('aria-pressed', 'true');

    await removeFavorite.click();
    await expect(addFavorite).toHaveAttribute('aria-pressed', 'false');
  });

  test('toggles the favorite from list view without opening the board', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'List favorite board');
    await page.getByRole('button', { name: 'Back to boards' }).click();

    await page.getByRole('button', { name: 'List view' }).click();
    await expect(page.getByRole('listitem')).toHaveCount(1);

    await page.getByRole('button', { name: 'Add to favorites List favorite board' }).click();

    await expect(
      page.getByRole('button', { name: 'Remove from favorites List favorite board' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
  });
});
