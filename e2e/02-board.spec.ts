import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

test.describe('Board (MVP happy path)', () => {
  test('owner gets a board with a usable toolbar and can add elements', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Roadmap Q4');

    await expect(page.getByText('Owner', { exact: true })).toBeVisible();

    const canvas = page.getByRole('application', { name: 'Canvas' });
    await expect(canvas).toHaveAttribute('aria-readonly', 'false');
    await expect(page.getByRole('button', { name: 'Add text' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Add note' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Add task' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Add frame' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Add link' })).toBeEnabled();

    await addElement(page, 'text');
    await addElement(page, 'note');
    await addElement(page, 'task');
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(3);
  });

  test('undo, redo and delete drive element state', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Undo board');

    await addElement(page, 'text');
    await expect(page.getByRole('button', { name: 'Delete selection' })).toBeEnabled();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled();

    await page.getByRole('button', { name: 'Redo' }).click();
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(1);

    await page.locator('[data-testid^="canvas-item-"]').last().click();
    await page.getByRole('button', { name: 'Delete selection' }).click();
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(0);
  });

  test('elements survive a page reload', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Persistence board');

    await addElement(page, 'text');
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(1);

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(1, { timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Add text' })).toBeEnabled();
  });

  test('edits text inline and persists it across reloads', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Editing board');

    const item = await addElement(page, 'text');

    const editor = page.getByTestId('element-editor');
    await expect(editor).toBeVisible();
    await editor.fill('Hola mundo');
    await editor.blur();

    await expect(item).toContainText('Hola mundo');

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid^="canvas-item-"]').first()).toContainText(
      'Hola mundo',
      {
        timeout: 20000,
      },
    );
  });
});
