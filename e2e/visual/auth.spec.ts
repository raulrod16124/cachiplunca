import { expect, test } from '@playwright/test';
import { disableAnimations, setLanguage, setTheme } from './helpers/visual';

test.describe('visual baseline — auth', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await disableAnimations(page);
    await setLanguage(page, 'en');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`login theme:${theme}`, async ({ page }) => {
      await page.goto('/login');
      await setTheme(page, theme);
      await expect(page).toHaveScreenshot(`auth-login-${theme}.png`);
    });

    test(`register theme:${theme}`, async ({ page }) => {
      await page.goto('/register');
      await setTheme(page, theme);
      await expect(page).toHaveScreenshot(`auth-register-${theme}.png`);
    });

    test(`login narrow theme:${theme}`, async ({ page }) => {
      await page.goto('/login');
      await page.setViewportSize({ width: 390, height: 800 });
      await setTheme(page, theme);
      await expect(page).toHaveScreenshot(`auth-login-narrow-${theme}.png`);
    });

    test(`skip link focus theme:${theme}`, async ({ page }) => {
      await page.goto('/login');
      await setTheme(page, theme);
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
      await expect(page).toHaveScreenshot(`auth-skip-link-${theme}.png`);
    });
  }
});
