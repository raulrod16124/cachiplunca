import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';

test.describe('Narrow navigation menu', () => {
  test.use({ viewport: { width: 900, height: 800 } });

  test('navigates, creates a workspace and signs out from the menu', async ({ page }) => {
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
    await expect(menu.getByRole('link', { name: 'Invitations' })).toBeVisible();

    await menu.getByRole('button', { name: 'Close navigation menu' }).click();
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await menu.getByRole('link', { name: 'Invitations' }).click();
    await expect(menu).toBeHidden();
    expect(new URL(page.url()).hash).toBe('#pending-invitations');

    await trigger.click();
    await menu.getByRole('button', { name: 'New workspace' }).click();
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
