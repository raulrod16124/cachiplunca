import { expect, test } from '@playwright/test';
import { addElement, createWorkspace } from '../helpers/workspace';
import {
  createGuestLink,
  disableAnimations,
  setLanguage,
  setTheme,
  waitForStable,
} from './helpers/visual';
import { registerUser } from '../helpers/auth';

test.describe('visual baseline — guest view', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setLanguage(page, 'en');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`read-only guest view theme:${theme}`, async ({ browser }) => {
      const ownerContext = await browser.newContext();
      const ownerPage = await ownerContext.newPage();
      await disableAnimations(ownerPage);

      await registerUser(ownerPage);
      await createWorkspace(ownerPage, 'Guest canvas');
      await addElement(ownerPage, 'text');
      const guestLink = await createGuestLink(ownerPage);

      const guestContext = await browser.newContext();
      const guestPage = await guestContext.newPage();
      await disableAnimations(guestPage);
      await guestPage.goto(guestLink);
      await setTheme(guestPage, theme);
      await waitForStable(guestPage);
      await expect(guestPage.getByRole('application', { name: 'Canvas' })).toBeVisible({
        timeout: 30000,
      });

      await expect(guestPage).toHaveScreenshot(`guest-view-${theme}.png`, {
        mask: [guestPage.locator('[data-testid^="canvas-item-"]')],
      });

      await ownerContext.close();
      await guestContext.close();
    });
  }
});
