import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Session timer', () => {
  test('runs a local timer without touching the board', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Timer board');

    const items = page.locator('[data-testid^="canvas-item-"]');
    await expect(items).toHaveCount(0);

    await page.getByRole('button', { name: 'Session timer' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Session timer' })).toBeVisible();
    await expect(page.getByTestId('session-timer-display')).toHaveText('5:00');

    await page.getByRole('button', { name: '1 min' }).click();
    await expect(page.getByTestId('session-timer-display')).toHaveText('1:00');

    await page.getByRole('button', { name: 'Start' }).click();
    await expect
      .poll(async () => page.getByTestId('session-timer-display').textContent())
      .not.toBe('1:00');

    await page.getByRole('button', { name: 'Pause' }).click();
    const pausedValue = await page.getByTestId('session-timer-display').textContent();
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('session-timer-display')).toHaveText(pausedValue ?? '');

    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByTestId('session-timer-display')).toHaveText('1:00');
    await expect(page.getByText('Ready to start.')).toBeVisible();

    await page.getByTestId('session-timer-trigger').click();
    await expect(items).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('button', { name: 'Session timer' })).toBeVisible();
    await expect(items).toHaveCount(0);
  });

  test('shows a central dialog when the timer finishes', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Timer completion board');
    await page.clock.install();

    await page.getByRole('button', { name: 'Session timer' }).click();
    await page.getByRole('button', { name: '1 min' }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await page.clock.fastForward(60_000);

    const dialog = page.getByRole('dialog', { name: 'Time is up' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Your 1:00 session timer has finished.');

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(0);
  });
});
