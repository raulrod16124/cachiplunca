import { expect, test } from '@playwright/test';
import { registerUser } from '../helpers/auth';
import {
  disableAnimations,
  dynamicMaskLocators,
  setLanguage,
  setTheme,
  waitForStable,
} from './helpers/visual';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

async function createCoveredWorkspace(page: Parameters<typeof registerUser>[0]): Promise<void> {
  await page.getByRole('button', { name: 'Create board' }).first().click();
  await page.getByLabel('Name').fill('Cover baseline');
  await page.getByTestId('workspace-cover-input').setInputFiles({
    name: 'cover.png',
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_BASE64, 'base64'),
  });
  await expect(page.getByAltText('Cover image preview')).toBeVisible();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('heading', { level: 3, name: 'Cover baseline' })).toBeVisible({
    timeout: 20000,
  });
}

test.describe('visual baseline — workspace covers', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setLanguage(page, 'en');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`covered board theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createCoveredWorkspace(page);
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`workspaces-cover-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`covered board narrow theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createCoveredWorkspace(page);
      await page.setViewportSize({ width: 390, height: 800 });
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`workspaces-cover-narrow-390-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });
  }
});
