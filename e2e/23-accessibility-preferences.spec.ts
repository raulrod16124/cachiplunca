import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';

test.describe('Accessibility preferences', () => {
  test('applies and persists the account font size and reduced motion', async ({ page }) => {
    await registerUser(page);

    await page.getByRole('link', { name: 'Settings' }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    const title = page.getByRole('heading', { level: 1, name: 'Settings' });
    const initialTitleSize = await title.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );

    await page.getByRole('combobox', { name: 'Font size' }).click();
    await page.getByRole('option', { name: 'Extra large' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xl');
    await expect
      .poll(() =>
        title.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      )
      .toBeGreaterThan(initialTitleSize);

    const reduceMotionWrite = page.waitForEvent('requestfinished', {
      predicate: (request) => request.url().includes('Firestore/Write/channel'),
    });
    const reduceMotion = page.getByRole('switch', { name: 'Reduce motion' });
    await reduceMotion.click();
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await reduceMotionWrite;

    await page.reload();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-font-size', 'xl');
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  });

  test('redirects the legacy preferences deep link to settings', async ({ page }) => {
    await registerUser(page);

    await page.goto('/profile?tab=preferences');

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Preferences' })).toHaveCount(0);
  });
});
