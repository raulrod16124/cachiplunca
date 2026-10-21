import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';

test.describe('Accessibility preferences', () => {
  test('applies and persists the account font size and reduced motion', async ({ page }) => {
    await registerUser(page);

    await page.getByRole('button', { name: 'Open account menu' }).click();
    await page.getByRole('menuitem', { name: 'Preferences' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const title = dialog.getByRole('heading', { name: 'Profile' });
    const initialTitleSize = await title.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );

    await dialog.getByRole('combobox', { name: 'Font size' }).click();
    await page.getByRole('option', { name: 'Extra large' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xl');
    await expect
      .poll(() =>
        title.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      )
      .toBeGreaterThan(initialTitleSize);

    const reduceMotion = dialog.getByRole('switch', { name: 'Reduce motion' });
    await reduceMotion.click();
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.reload();

    await expect(page.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xl');
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  });
});
