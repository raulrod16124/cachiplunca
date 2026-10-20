import { expect, test } from '@playwright/test';
import { addElement, createWorkspace } from '../helpers/workspace';
import {
  disableAnimations,
  dynamicMaskLocators,
  openCommentsPanel,
  openPlanPanel,
  openShareDialog,
  setLanguage,
  setTheme,
  waitForStable,
} from './helpers/visual';
import { registerUser } from '../helpers/auth';

test.describe('visual baseline — canvas', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setLanguage(page, 'en');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`empty theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Empty canvas');
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-empty-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`populated theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Populated canvas');
      await addElement(page, 'text');
      await addElement(page, 'note');
      await addElement(page, 'task');
      await addElement(page, 'frame');
      await page.getByRole('application', { name: 'Canvas' }).click();
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-populated-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`task plan drawer theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Plan canvas');
      await addElement(page, 'task');
      await openPlanPanel(page);
      await setTheme(page, theme);
      await expect(page).toHaveScreenshot(`canvas-plan-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`comments drawer theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Comments canvas');
      await addElement(page, 'text');
      await openCommentsPanel(page);
      await setTheme(page, theme);
      await expect(page).toHaveScreenshot(`canvas-comments-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`share dialog theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Share canvas');
      await openShareDialog(page);
      await setTheme(page, theme);
      await expect(page).toHaveScreenshot(`canvas-share-${theme}.png`, {
        mask: [
          ...dynamicMaskLocators(page),
          page.locator('[aria-label="Read-only link"]'),
          page.locator('[aria-label="Invitation link"]'),
        ],
      });
    });

    test(`settings dialog theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Settings canvas');
      await page.getByRole('button', { name: 'Open account menu' }).click();
      await page.getByRole('menuitem', { name: 'Preferences' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await setTheme(page, theme);
      const emailText = page.getByText(/@example\.com/);
      await expect(page).toHaveScreenshot(`canvas-settings-${theme}.png`, {
        mask: [
          ...dynamicMaskLocators(page),
          emailText.locator('xpath=../..'),
          page.getByPlaceholder(/@example\.com/),
        ],
      });
    });
  }
});
