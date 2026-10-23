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

  test('navigates to favorites, filters, searches and removes a favorite', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Favorite board');
    await page.getByRole('button', { name: 'Back to boards' }).click();
    await createWorkspace(page, 'Other board');
    await page.getByRole('button', { name: 'Back to boards' }).click();

    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
    await page.getByRole('button', { name: 'Add to favorites Favorite board' }).click();
    await expect(
      page.getByRole('button', { name: 'Remove from favorites Favorite board' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('link', { name: 'Favorites' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Favorites' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('heading', { level: 3, name: 'Favorite board' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Other board' })).toHaveCount(0);

    await page.getByRole('button', { name: 'List view' }).click();
    await expect(page.getByRole('listitem')).toHaveCount(1);

    await page.getByRole('searchbox', { name: 'Search boards' }).fill('Favorite');
    await expect(page.getByRole('heading', { name: 'Favorite board' })).toBeVisible();

    await page.getByRole('button', { name: 'Remove from favorites Favorite board' }).click();
    await expect(page.getByRole('heading', { name: 'No favorite boards yet' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Favorite board' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Browse boards' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Favorite board' })).toBeVisible();
  });

  test('requires authentication to open favorites', async ({ page }) => {
    await page.goto('/favorites');
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  });
});
