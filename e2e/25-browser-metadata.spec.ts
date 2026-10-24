import { expect, test } from '@playwright/test';

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

  test('keeps the title across reloads and navigation', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle('Cachiplunca');

    await page.reload();
    await expect(page).toHaveTitle('Cachiplunca');

    await page.goto('/register');
    await expect(page).toHaveTitle('Cachiplunca');
  });
});
