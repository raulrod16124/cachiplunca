import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Command palette', () => {
  test('creates, finds and undoes board work and opens other workspaces', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Palette board');

    await page.keyboard.press('Control+k');
    const paletteInput = page.getByRole('combobox', { name: 'Search commands' });
    await expect(paletteInput).toBeFocused();

    await paletteInput.fill('add note');
    await page.getByRole('option', { name: 'Add note' }).click();

    const editor = page.getByTestId('element-editor').getByRole('textbox');
    await editor.fill('Launch checklist');
    await editor.blur();

    const item = page.locator('[data-testid^="canvas-item-"]').first();
    await expect(item).toContainText('Launch checklist');

    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search commands' }).fill('launch checklist');
    await page.getByRole('option', { name: /Note: Launch checklist/ }).click();

    await expect(item).toHaveAttribute('data-selected', 'true');

    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search commands' }).fill('undo');
    await page.getByRole('option', { name: 'Undo the last change' }).click();

    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search commands' }).fill('undo');
    await page.getByRole('option', { name: 'Undo the last change' }).click();
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(0);

    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search commands' }).fill('redo');
    await page.getByRole('option', { name: 'Redo the last change' }).click();
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(1);

    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search commands' }).fill('keyboard shortcuts');
    await page.getByRole('option', { name: 'Keyboard shortcuts' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Keyboard shortcuts' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Back to workspaces' }).click();
    await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible();

    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search commands' }).fill('palette board');
    await page.getByRole('option', { name: 'Palette board' }).click();

    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });
  });
});
