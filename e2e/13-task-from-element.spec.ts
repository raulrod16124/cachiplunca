import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

test.describe('Task from note', () => {
  test('creates a selected task from a note without changing the note', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Task from note board');

    const note = await addElement(page, 'note');
    const editor = page.getByTestId('element-editor').getByRole('textbox');
    await expect(editor).toBeVisible();
    await editor.fill('Buy milk and eggs');
    await editor.blur();
    await expect(note).toContainText('Buy milk and eggs');

    await note.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Create task from note' }).click();

    const task = page.locator('[data-testid^="canvas-item-"][data-element-type="task"]');
    await expect(task).toHaveCount(1);
    await expect(task).toContainText('Buy milk and eggs');
    await expect(task).toHaveAttribute('data-selected', 'true');
    await expect(note).toContainText('Buy milk and eggs');
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(2);

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });

    const reloadedTask = page.locator('[data-testid^="canvas-item-"][data-element-type="task"]');
    await expect(reloadedTask).toContainText('Buy milk and eggs', { timeout: 20000 });
    await expect(
      page.locator('[data-testid^="canvas-item-"][data-element-type="note"]'),
    ).toHaveCount(1);
  });
});
