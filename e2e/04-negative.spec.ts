import { expect, test } from '@playwright/test';
import { registerUser, verifyEmail } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Negative paths', () => {
  test('invalid invitation token shows a readable error', async ({ page }) => {
    const email = await registerUser(page);
    await verifyEmail(email);
    await page.goto('/invitations/not-a-real-token');
    await expect(
      page.getByRole('heading', { level: 1, name: 'We could not accept the invitation' }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Back to your workspaces' })).toBeVisible();
  });

  test('invalid invitation link while signed out offers sign in or account creation', async ({
    page,
  }) => {
    await page.goto('/invitations/not-a-real-token');
    await expect(page.getByRole('heading', { level: 1, name: 'Accept invitation' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('creating a workspace with an empty name shows validation feedback', async ({ page }) => {
    await registerUser(page);
    await page.getByRole('button', { name: 'Create workspace' }).first().click();
    await page.getByLabel('Name').fill('');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Enter a workspace name.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Name' })).toHaveCount(0);
  });

  test('board toolbar disables destructive actions on an empty board', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Empty board');
    await expect(page.getByRole('button', { name: 'Delete selection' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });
});
