import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';

test.describe('Narrow navigation menu', () => {
  test.use({ viewport: { width: 900, height: 800 } });

  test('navigates, creates a workspace from the content and signs out from the menu', async ({
    page,
  }) => {
    await registerUser(page);
    await page.goto('/workspaces');
    await expect(page.getByRole('heading', { level: 1, name: 'Your workspaces' })).toBeVisible();

    const trigger = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(trigger).toBeVisible();

    await trigger.click();
    const menu = page.getByRole('dialog', { name: 'Navigation' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Workspaces' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(menu.getByRole('link', { name: 'Invitations' })).toHaveCount(0);
    await expect(menu.getByRole('button', { name: 'New workspace' })).toHaveCount(0);

    await menu.getByRole('button', { name: 'Close navigation menu' }).click();
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.getByRole('button', { name: 'Notifications' }).click();
    const invitationsDialog = page.getByRole('dialog', { name: 'Invitations' });
    await expect(invitationsDialog.getByText('No pending invitations.')).toBeVisible();
    await invitationsDialog.getByRole('button', { name: 'Close' }).click();
    await expect(invitationsDialog).toBeHidden();

    await page.locator('header').getByRole('button', { name: 'Create workspace' }).click();
    const createDialog = page.getByRole('dialog', { name: 'Create workspace' });
    await expect(createDialog).toBeVisible();
    await createDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(createDialog).toBeHidden();

    await trigger.click();
    await page
      .getByRole('dialog', { name: 'Navigation' })
      .getByRole('button', { name: 'Sign out' })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible({
      timeout: 20000,
    });
  });
});
