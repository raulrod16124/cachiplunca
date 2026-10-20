import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

test.describe('Comments', () => {
  test('creates, persists and resolves a comment on an element', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Comments board');

    const note = await addElement(page, 'note');
    await expect(note).toHaveAttribute('data-selected', 'true');

    await page.getByRole('button', { name: 'Comments' }).click();
    const panel = page.getByTestId('comments-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('No comments yet')).toBeVisible();

    const commentBody = 'Let us ship on Friday';
    await panel.getByRole('textbox', { name: 'Comment' }).fill(commentBody);
    await panel.getByRole('button', { name: 'Add comment' }).click();
    await expect(panel.getByText(commentBody)).toBeVisible();
    const indicator = note.getByTestId(/^comment-indicator-/);
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText('1');

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });

    const reloadedIndicator = page.getByTestId(/^comment-indicator-/);
    await expect(reloadedIndicator).toBeVisible({ timeout: 20000 });
    await reloadedIndicator.click();

    const reloadedPanel = page.getByTestId('comments-panel');
    await expect(reloadedPanel.getByText(commentBody)).toBeVisible({ timeout: 20000 });

    await reloadedPanel.getByRole('button', { name: 'Resolve' }).click();
    await expect(reloadedPanel.getByText('Resolved')).toBeVisible();
    await expect(reloadedPanel.getByText(commentBody)).toBeVisible();
    await expect(reloadedIndicator).toBeHidden();

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });
    await page.locator('[data-testid^="canvas-item-"][data-element-type="note"]').click();
    await page.getByRole('button', { name: 'Comments' }).click();
    await expect(page.getByTestId('comments-panel').getByText('Resolved')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId(/^comment-indicator-/)).toBeHidden();
  });
});
