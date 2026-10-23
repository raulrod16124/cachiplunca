import { expect, test, type Page } from '@playwright/test';
import { registerUser } from '../helpers/auth';
import { createWorkspace } from '../helpers/workspace';
import {
  disableAnimations,
  dynamicMaskLocators,
  setLanguage,
  setTheme,
  waitForStable,
} from './helpers/visual';

async function favoriteWorkspace(page: Page, name: string): Promise<void> {
  await createWorkspace(page, name);
  await page.getByRole('button', { name: 'Back to boards' }).click();
  await page.getByRole('button', { name: `Add to favorites ${name}` }).click();

  const removeFavorite = page.getByRole('button', { name: `Remove from favorites ${name}` });
  await expect(removeFavorite).toHaveAttribute('aria-pressed', 'true');
  await expect(removeFavorite).toBeEnabled();
}

test.describe('visual baseline — favorites', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setLanguage(page, 'en');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`empty theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await page.goto('/favorites');
      await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`favorites-empty-${theme}.png`, {
        mask: [page.locator('[data-testid="skeleton"]')],
      });
    });

    test(`populated theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await favoriteWorkspace(page, 'Favorite baseline');
      await page.getByRole('link', { name: 'Favorites' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 3, name: 'Favorite baseline' }),
      ).toBeVisible();
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`favorites-populated-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`narrow 390 theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await favoriteWorkspace(page, 'Favorite narrow');
      await page.getByRole('link', { name: 'Favorites' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible();
      await page.setViewportSize({ width: 390, height: 800 });
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`favorites-narrow-390-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });
  }
});
