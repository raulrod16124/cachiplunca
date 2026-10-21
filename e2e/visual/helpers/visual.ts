import { expect, type Page } from '@playwright/test';

/**
 * Disables CSS animations and transitions to keep visual regressions stable.
 * Also emulates `prefers-reduced-motion: reduce` as an extra guard.
 */
export async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

/**
 * Forces a predictable theme on `<html>` regardless of system preferences.
 */
export async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.evaluate((mode) => {
    document.documentElement.setAttribute('data-theme', mode);
  }, theme);
}

/**
 * Sets the document language to a deterministic value.
 */
export async function setLanguage(page: Page, language: 'en' | 'es'): Promise<void> {
  await page.evaluate((lang) => {
    document.documentElement.setAttribute('lang', lang);
  }, language);
}

/**
 * Waits for loading skeletons to disappear.
 */
export async function waitForStable(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="skeleton"]')).toHaveCount(0, {
    timeout: 15000,
  });
}

/**
 * Opens the share dialog from the workspace topbar.
 */
export async function openShareDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

/**
 * Opens the command palette and waits for its search field to be focused.
 */
export async function openCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('combobox', { name: 'Search commands' })).toBeFocused();
}

/**
 * Opens the task plan drawer from the workspace topbar.
 */
export async function openPlanPanel(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Task plan' }).click();
  await expect(page.getByTestId('task-plan-panel')).toBeVisible();
}

/**
 * Opens the comments drawer from the workspace topbar. Requires an element
 * to be selected first.
 */
export async function openCommentsPanel(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Comments' }).click();
  await expect(page.getByTestId('comments-panel')).toBeVisible();
}

/**
 * Locators for dynamic content that should be masked in screenshots.
 */
export function dynamicMaskLocators(page: Page): ReturnType<typeof page.locator>[] {
  return [
    page.locator('[data-testid^="canvas-item-"]'),
    page.locator('[data-testid="session-timer-display"]'),
    page.locator('[data-testid="connected-users"]'),
    page.locator('[data-testid^="presence-avatar-"]'),
    page.locator('[data-testid^="comment-indicator-"]'),
  ];
}

/**
 * Creates a view-only guest link for the current workspace and returns it.
 */
export async function createGuestLink(page: Page): Promise<string> {
  await openShareDialog(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('tab', { name: 'View link' }).click();
  await dialog.getByRole('button', { name: 'Create view link' }).click();

  const input = dialog.getByLabel('Read-only link');
  await expect(input).toBeVisible({ timeout: 20000 });
  return input.inputValue();
}
