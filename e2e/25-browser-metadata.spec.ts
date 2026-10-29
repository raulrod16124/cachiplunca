import { expect, test, type Page } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

async function expectFaviconsToResolve(page: Page): Promise<void> {
  const hrefs = await page
    .locator('link[rel="icon"]')
    .evaluateAll((elements) =>
      elements
        .map((element) => (element instanceof HTMLLinkElement ? element.href : ''))
        .filter(Boolean),
    );

  for (const href of new Set(hrefs)) {
    const favicon = await page.request.get(href);
    expect(favicon.status()).toBe(200);
    expect(favicon.headers()['content-type']).toMatch(/image\/(png|x-icon|vnd\.microsoft\.icon)/);
  }
}

test.describe('Browser metadata', () => {
  test('shows the product title and resolvable theme favicons', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle('Cachiplunca');

    const icons = page.locator('link[rel="icon"]');
    const hrefs = await icons.evaluateAll((elements) =>
      elements
        .map((element) => (element instanceof HTMLLinkElement ? element.href : ''))
        .filter(Boolean),
    );

    expect(hrefs.some((href) => href.endsWith('/brand/favicon-light-32.png'))).toBe(true);
    expect(hrefs.some((href) => href.endsWith('/brand/favicon-dark-32.png'))).toBe(true);

    for (const href of new Set(hrefs)) {
      const favicon = await page.request.get(href);
      expect(favicon.status()).toBe(200);
      expect(favicon.headers()['content-type']).toMatch(/image\/(png|x-icon|vnd\.microsoft\.icon)/);
    }

    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleTouchIcon).toHaveAttribute('href', /\/brand\/apple-touch-icon\.png$/);
  });

  test('follows the app theme on the board without reloading', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await registerUser(page);
    await createWorkspace(page, 'Favicon board');

    const favicon32 = page.locator('link[rel="icon"][data-app-favicon="32"]').first();
    const favicon16 = page.locator('link[rel="icon"][data-app-favicon="16"]').first();
    await expect(favicon32).toHaveAttribute('href', /\/brand\/favicon-light-32\.png$/);
    await expect(favicon16).toHaveAttribute('href', /\/brand\/favicon-light-16\.png$/);
    await expect(page).toHaveTitle('Cachiplunca');

    await page.evaluate(() => {
      (window as Window & { __faviconMarker?: string }).__faviconMarker = 'kept';
    });

    await page.getByRole('button', { name: 'Back to boards' }).click();
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

    const darkTheme = page.getByRole('radio', { name: 'Dark' });
    await expect(darkTheme).toBeEnabled();
    const themeWrite = page.waitForEvent('requestfinished', {
      predicate: (request) => request.url().includes('Firestore/Write/channel'),
    });
    await darkTheme.click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(favicon32).toHaveAttribute('href', /\/brand\/favicon-dark-32\.png$/);
    await expect(favicon16).toHaveAttribute('href', /\/brand\/favicon-dark-16\.png$/);
    await themeWrite;

    await page.getByRole('link', { name: 'Boards' }).click();
    const card = page.getByRole('article').filter({ hasText: 'Favicon board' }).first();
    await card.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible();

    expect(
      await page.evaluate(() => (window as Window & { __faviconMarker?: string }).__faviconMarker),
    ).toBe('kept');
    await expect(page).toHaveTitle('Cachiplunca');
    await expect(favicon32).toHaveAttribute('href', /\/brand\/favicon-dark-32\.png$/);
    await expect(favicon16).toHaveAttribute('href', /\/brand\/favicon-dark-16\.png$/);

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(favicon32).toHaveAttribute('href', /\/brand\/favicon-dark-32\.png$/);
    await expect(favicon16).toHaveAttribute('href', /\/brand\/favicon-dark-16\.png$/);

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.getByRole('button', { name: 'Back to boards' }).click();
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

    const lightTheme = page.getByRole('radio', { name: 'Light' });
    await expect(lightTheme).toBeEnabled();
    await lightTheme.click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(favicon32).toHaveAttribute('href', /\/brand\/favicon-light-32\.png$/);
    await expect(favicon16).toHaveAttribute('href', /\/brand\/favicon-light-16\.png$/);

    await page.getByRole('radio', { name: 'System', exact: true }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(favicon32).toHaveAttribute('href', /\/brand\/favicon-dark-32\.png$/);
    await expect(favicon16).toHaveAttribute('href', /\/brand\/favicon-dark-16\.png$/);

    await page.emulateMedia({ colorScheme: 'light' });

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(favicon32).toHaveAttribute('href', /\/brand\/favicon-light-32\.png$/);
    await expect(favicon16).toHaveAttribute('href', /\/brand\/favicon-light-16\.png$/);

    await expectFaviconsToResolve(page);
  });

  test('keeps the title across reloads and navigation', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle('Cachiplunca');

    await page.reload();
    await expect(page).toHaveTitle('Cachiplunca');

    await page.goto('/register');
    await expect(page).toHaveTitle('Cachiplunca');
  });
});
