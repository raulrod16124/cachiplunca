import { expect, test, type Page } from '@playwright/test';
import { registerUser } from '../helpers/auth';
import { createWorkspace } from '../helpers/workspace';
import { disableAnimations, setLanguage, setTheme, waitForStable } from './helpers/visual';

async function openKeyboardShortcuts(page: Page): Promise<void> {
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('visual baseline — keyboard shortcuts', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setLanguage(page, 'en');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`desktop at 1280 theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Shortcuts desktop');
      await setTheme(page, theme);
      await openKeyboardShortcuts(page);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`keyboard-shortcuts-1280-${theme}.png`);
    });

    test(`narrow at 390 theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Shortcuts narrow');
      await page.setViewportSize({ width: 390, height: 844 });
      await setTheme(page, theme);
      await openKeyboardShortcuts(page);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`keyboard-shortcuts-390-${theme}.png`);
    });
  }
});
