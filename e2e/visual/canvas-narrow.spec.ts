import { expect, test } from '@playwright/test';
import { addElement, createWorkspace } from '../helpers/workspace';
import { registerUser } from '../helpers/auth';
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

test.describe('visual baseline — narrow workspace', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setLanguage(page, 'en');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`topbar and toolbar at 900 theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Narrow canvas');
      await page.setViewportSize({ width: 900, height: 800 });
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-narrow-900-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`topbar and toolbar at 390 theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Narrow canvas');
      await page.setViewportSize({ width: 390, height: 800 });
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-narrow-390-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`actions menu at 390 theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Narrow actions');
      await page.setViewportSize({ width: 390, height: 800 });
      await setTheme(page, theme);
      await waitForStable(page);
      await page.getByRole('button', { name: 'More board actions' }).click();
      await expect(page.getByRole('menuitem', { name: 'Present' })).toBeVisible();
      await page.mouse.move(0, 0);
      await expect(page).toHaveScreenshot(`canvas-narrow-actions-menu-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`share dialog at 390 theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Narrow share');
      await page.setViewportSize({ width: 390, height: 800 });
      await setTheme(page, theme);
      await openShareDialog(page);
      await waitForStable(page);

      const mask = [
        ...dynamicMaskLocators(page),
        page.locator('[data-testid="member-avatar"]'),
        page.locator('[data-testid="member-identity"]'),
        page.locator('[aria-label="Read-only link"]'),
        page.locator('[aria-label="Invitation link"]'),
      ];

      await expect(page).toHaveScreenshot(`canvas-narrow-share-invite-390-${theme}.png`, { mask });

      await page.getByRole('tab', { name: 'People' }).click();
      await expect(page.getByText(/People with access to this board/)).toBeVisible();
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-narrow-share-people-390-${theme}.png`, { mask });

      await page.getByRole('tab', { name: 'View link' }).click();
      await expect(page.getByRole('heading', { name: 'Read-only link' })).toBeVisible();
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-narrow-share-guest-390-${theme}.png`, { mask });
    });
  }

  test('task plan drawer at 390', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Narrow plan');
    await addElement(page, 'task');
    await page.setViewportSize({ width: 390, height: 800 });
    await setTheme(page, 'light');
    await openPlanPanel(page);
    await waitForStable(page);
    await expect(page).toHaveScreenshot('canvas-narrow-plan-390.png', {
      mask: dynamicMaskLocators(page),
    });
  });

  test('comments drawer at 390', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Narrow comments');
    const text = await addElement(page, 'text');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('element-editor-box')).toBeHidden();
    await text.click();
    await page.setViewportSize({ width: 390, height: 800 });
    await setTheme(page, 'light');
    await openCommentsPanel(page);
    await waitForStable(page);
    await expect(page).toHaveScreenshot('canvas-narrow-comments-390.png', {
      mask: dynamicMaskLocators(page),
    });
  });
});
