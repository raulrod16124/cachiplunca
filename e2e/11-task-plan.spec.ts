import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Task plan', () => {
  test('creates, selects and updates tasks from the plan panel', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Plan board');

    await page.getByRole('button', { name: 'Task plan' }).click();
    const panel = page.getByTestId('task-plan-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('No tasks yet')).toBeVisible();

    await panel.getByRole('button', { name: 'Create task' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Plan launch');
    await dialog.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'In progress' }).click();
    await dialog.getByRole('button', { name: 'Create task' }).click();
    await expect(dialog).toBeHidden();

    const selectTask = panel.getByRole('button', { name: 'Select task Plan launch' });
    await expect(selectTask).toBeVisible();
    await selectTask.click();

    const item = page.locator('[data-testid^="canvas-item-"]').first();
    await expect(item).toHaveAttribute('data-selected', 'true');

    await panel.getByRole('combobox', { name: 'Change status for Plan launch' }).click();
    await page.getByRole('option', { name: 'Completed' }).click();

    await expect(panel.getByRole('heading', { level: 3, name: 'Completed' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });

    await page.getByRole('button', { name: 'Task plan' }).click();
    const reloadedPanel = page.getByTestId('task-plan-panel');
    await expect(reloadedPanel.getByRole('heading', { level: 3, name: 'Completed' })).toBeVisible({
      timeout: 20000,
    });
    await expect(
      reloadedPanel.getByRole('button', { name: 'Select task Plan launch' }),
    ).toBeVisible();
  });
});

test.describe('Task plan board', () => {
  test('moves a task between columns from an accessible status control', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Board view');

    await page.getByRole('button', { name: 'Task plan' }).click();
    const panel = page.getByTestId('task-plan-panel');
    await panel.getByRole('tab', { name: 'Board' }).click();

    await panel.getByRole('button', { name: 'Create task' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Board task');
    await dialog.getByRole('button', { name: 'Create task' }).click();
    await expect(dialog).toBeHidden();

    const todoColumn = panel.getByRole('region', { name: 'Todo' });
    await expect(todoColumn.getByRole('button', { name: 'Select task Board task' })).toBeVisible();

    await panel.getByRole('button', { name: 'Change status for Board task' }).click();
    await page.getByRole('menuitem', { name: 'Blocked' }).click();

    const blockedColumn = panel.getByRole('region', { name: 'Blocked' });
    await expect(
      blockedColumn.getByRole('button', { name: 'Select task Board task' }),
    ).toBeVisible();
    await expect(todoColumn.getByRole('button', { name: 'Select task Board task' })).toHaveCount(0);
  });
});
