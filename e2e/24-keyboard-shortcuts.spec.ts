import { expect, test, type Page } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

async function openShortcutsFromTopBar(page: Page): Promise<void> {
  const viewport = page.viewportSize();

  if ((viewport?.width ?? 0) > 900) {
    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
    return;
  }

  await page.getByRole('button', { name: 'More board actions' }).click();
  await page.getByRole('menuitem', { name: 'Keyboard shortcuts' }).click();
}

test.describe('Keyboard shortcuts dialog', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('opens with the question mark and lists the implemented shortcuts', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Shortcuts board');

    await page.keyboard.press('?');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { level: 2, name: 'Keyboard shortcuts' }),
    ).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(dialog.getByRole('heading', { level: 3, name: 'General' })).toBeVisible();
    await expect(dialog.getByText('Ctrl/Cmd + K', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Show keyboard shortcuts')).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 3, name: 'Presentation' })).toBeVisible();
    await expect(dialog.getByText('Move between frames')).toBeVisible();
    await expect(dialog.getByText('← → ↑ ↓ or PageUp/PageDown')).toBeVisible();
    await expect(dialog.getByText('Exit the presentation')).toBeVisible();
    await expect(dialog.getByText('Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('does not overflow horizontally on desktop or narrow viewports', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Shortcuts layout');

    await openShortcutsFromTopBar(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    for (const width of [1280, 390] as const) {
      await page.setViewportSize({ width, height: 844 });

      const overflow = await dialog.evaluate(
        (element) => element.scrollWidth > element.clientWidth + 1,
      );
      expect(overflow).toBe(false);

      const rowsOverflow = await dialog
        .locator('li')
        .evaluateAll((rows) => rows.some((row) => row.scrollWidth > row.clientWidth + 1));
      expect(rowsOverflow).toBe(false);
    }
  });
});
