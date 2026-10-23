import { expect, test, type Page } from '@playwright/test';
import { logout, registerUser, uniqueEmail } from '../helpers/auth';
import { createWorkspace } from '../helpers/workspace';
import { disableAnimations, setLanguage, setTheme, waitForStable } from './helpers/visual';

test.describe('visual baseline — notifications', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setLanguage(page, 'en');
  });

  async function inviteAndOpenNotifications(page: Page, theme: 'light' | 'dark'): Promise<void> {
    const email = uniqueEmail('visual-notify');

    await registerUser(page);
    await createWorkspace(page, 'Notifications baseline');
    await page.getByRole('button', { name: 'Share' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Email').fill(email);
    await dialog.getByRole('button', { name: 'Send invitation' }).click();
    await expect(dialog.getByLabel('Invitation link')).toBeVisible({ timeout: 15000 });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await logout(page);
    await registerUser(page, email);
    await page.goto('/workspaces');
    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
    await setTheme(page, theme);
    await waitForStable(page);
    await page.getByRole('button', { name: /Notifications, 1 unread/i }).click();
    await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`dialog theme:${theme}`, async ({ page }) => {
      await inviteAndOpenNotifications(page, theme);
      await expect(page).toHaveScreenshot(`notifications-dialog-${theme}.png`, {
        mask: [page.locator('[data-testid="pending-invitation-row"]')],
      });
    });
  }

  test('dialog narrow 390', async ({ page }) => {
    await inviteAndOpenNotifications(page, 'light');
    await page.setViewportSize({ width: 390, height: 800 });
    await waitForStable(page);
    await expect(page).toHaveScreenshot('notifications-dialog-narrow-390.png', {
      mask: [page.locator('[data-testid="pending-invitation-row"]')],
    });
  });
});
