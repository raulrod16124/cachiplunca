import { expect, test } from '@playwright/test';

test.describe('Browser metadata', () => {
  test('shows the product title and a resolvable favicon', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle('Cachiplunca');

    const icon = page.locator('link[rel="icon"]');
    await expect(icon).toHaveAttribute('href', /\/favicon\.svg$/);

    const iconHref = await icon.evaluate((element) =>
      element instanceof HTMLLinkElement ? element.href : '',
    );
    expect(new URL(iconHref).pathname).toBe('/favicon.svg');

    const favicon = await page.request.get(iconHref);
    expect(favicon.status()).toBe(200);
    expect(favicon.headers()['content-type']).toContain('image/svg+xml');
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
