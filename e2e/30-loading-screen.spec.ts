import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { delayFirestore } from './helpers/network';
import { createWorkspace } from './helpers/workspace';

test.describe('Loading screen', () => {
  test('shows the reusable loading screen while a board reloads', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Loading board');

    const release = await delayFirestore(page);
    await page.reload();

    const loading = page.getByTestId('full-page-loading');
    await expect(loading).toBeVisible();
    await expect(loading).toHaveAttribute('role', 'status');
    await expect(loading).toHaveAttribute('aria-live', 'polite');
    await expect(loading).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('img', { name: 'Cachiplunca' })).toBeVisible();
    await expect(page.getByRole('application', { name: 'Canvas' })).toHaveCount(0);

    await release();

    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 30000,
    });
    await expect(loading).toHaveCount(0);
  });

  test('respects prefers-reduced-motion', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Reduced motion board');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const release = await delayFirestore(page, 1200);
    await page.reload();

    const spinner = page.getByTestId('spinner');
    await expect(spinner).toBeVisible();

    await expect
      .poll(() =>
        spinner
          .locator(':scope > div')
          .evaluate((element) => getComputedStyle(element).animationName),
      )
      .toBe('none');

    await release();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 30000,
    });
  });

  test('does not overflow on narrow and wide viewports', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Responsive loading board');

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      const release = await delayFirestore(page, 1200);
      await page.reload();

      await expect(page.getByTestId('full-page-loading')).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      await release();
      await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
        timeout: 30000,
      });
    }
  });
});
