import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

const SKIP_LINK = 'Skip to main content';

test.describe('Accessibility navigation', () => {
  test('skip link moves focus to main content on auth, workspaces and canvas', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();

    const skipLink = page.getByRole('link', { name: SKIP_LINK });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    expect(await skipLink.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
    expect(await skipLink.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
      'none',
    );

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();

    await registerUser(page);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    await expect(page.getByRole('link', { name: 'Boards' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await createWorkspace(page, 'Skip link workspace');
    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('skip link works in narrow viewports', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();

    const skipLink = page.getByRole('link', { name: SKIP_LINK });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });
});

test.describe('Profile page accessibility navigation', () => {
  test('keeps the skip link and marks the profile navigation item as current', async ({ page }) => {
    await registerUser(page);
    await page.goto('/profile');

    await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('link', { name: 'Boards' })).not.toHaveAttribute('aria-current');

    const skipLink = page.getByRole('link', { name: SKIP_LINK });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
