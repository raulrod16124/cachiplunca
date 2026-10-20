import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Task assignment and due dates', () => {
  test('assigns a task, flags an overdue due date and clears it from the editor', async ({
    page,
  }) => {
    await registerUser(page);
    await createWorkspace(page, 'Assignment board');

    await page.getByRole('button', { name: 'Add task' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Ship the MVP');
    await dialog.getByRole('combobox', { name: 'Assignee' }).click();
    await page.getByRole('option').filter({ hasNotText: 'Unassigned' }).first().click();
    await dialog.getByLabel('Due date').fill('2020-03-15');
    await dialog.getByRole('button', { name: 'Create task' }).click();
    await expect(dialog).toBeHidden();

    const item = page.locator('[data-testid^="canvas-item-"]').first();
    await expect(item).toHaveAttribute('data-task-overdue', 'true');
    await expect(item).toContainText('Overdue');

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });

    const reloaded = page.locator('[data-testid^="canvas-item-"]').first();
    await expect(reloaded).toHaveAttribute('data-task-overdue', 'true', { timeout: 20000 });
    await expect(reloaded).toContainText('Overdue');

    await reloaded.dblclick();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByLabel('Due date')).toHaveValue('2020-03-15');
    await editDialog.getByRole('combobox', { name: 'Assignee' }).click();
    await page.getByRole('option', { name: 'Unassigned' }).click();
    await editDialog.getByLabel('Due date').fill('');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(reloaded).not.toHaveAttribute('data-task-overdue', 'true');
    await expect(reloaded).not.toContainText('Overdue');
  });
});
