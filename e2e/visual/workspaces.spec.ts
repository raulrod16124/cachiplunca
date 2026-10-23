import { expect, test } from '@playwright/test';
import { registerUser } from '../helpers/auth';
import { createWorkspace } from '../helpers/workspace';
import {
  disableAnimations,
  dynamicMaskLocators,
  setLanguage,
  setTheme,
  waitForStable,
} from './helpers/visual';

test.describe('visual baseline — workspaces', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setLanguage(page, 'en');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`empty theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await page.goto('/workspaces');
      await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`workspaces-empty-${theme}.png`, {
        mask: [page.locator('[data-testid="skeleton"]')],
      });
    });

    test(`populated theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Baseline workspace');
      await page.goto('/workspaces');
      await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`workspaces-populated-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`narrow 390 theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Narrow workspace');
      await page.goto('/workspaces');
      await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
      await page.setViewportSize({ width: 390, height: 800 });
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`workspaces-narrow-390-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`list theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'List workspace');
      await page.goto('/workspaces');
      await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
      await setTheme(page, theme);
      await waitForStable(page);
      await page.getByRole('button', { name: 'List view' }).click();
      await expect(page.getByRole('button', { name: 'List view' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page).toHaveScreenshot(`workspaces-list-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`narrow 390 list theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Narrow list workspace');
      await page.goto('/workspaces');
      await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
      await page.setViewportSize({ width: 390, height: 800 });
      await setTheme(page, theme);
      await waitForStable(page);
      await page.getByRole('button', { name: 'List view' }).click();
      await expect(page.getByRole('button', { name: 'List view' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page).toHaveScreenshot(`workspaces-narrow-390-list-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });
  }

  test('narrow viewport', async ({ page }) => {
    await registerUser(page);
    await page.goto('/workspaces');
    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
    await page.setViewportSize({ width: 900, height: 800 });
    await setTheme(page, 'light');
    await waitForStable(page);
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
    await expect(page).toHaveScreenshot('workspaces-narrow-light.png');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`narrow navigation menu theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await page.goto('/workspaces');
      await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
      await page.setViewportSize({ width: 900, height: 800 });
      await setTheme(page, theme);
      await waitForStable(page);
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
      await expect(page).toHaveScreenshot(`workspaces-narrow-menu-${theme}.png`);
    });
  }
});
