import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

test.describe('Guest read-only link', () => {
  test('an anonymous visitor views the board read-only and loses access when revoked', async ({
    browser,
  }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();

    await registerUser(ownerPage);
    await createWorkspace(ownerPage, 'Guest roadmap');
    await addElement(ownerPage, 'text');

    await ownerPage.getByRole('button', { name: 'Share' }).click();
    const dialog = ownerPage.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Share board' })).toBeVisible();

    await dialog.getByRole('tab', { name: 'View link' }).click();
    await dialog.getByRole('button', { name: 'Create view link' }).click();

    const linkInput = dialog.getByLabel('Read-only link');
    await expect(linkInput).toBeVisible({ timeout: 20000 });
    const link = await linkInput.inputValue();
    expect(link).toContain('/view/');

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await guestPage.goto(link);

    await expect(guestPage.getByRole('heading', { level: 1, name: 'Guest roadmap' })).toBeVisible({
      timeout: 30000,
    });
    await expect(guestPage.getByText('View only')).toBeVisible();
    await expect(guestPage.getByRole('application', { name: 'Canvas' })).toHaveAttribute(
      'aria-readonly',
      'true',
    );
    await expect(guestPage.locator('[data-testid^="canvas-item-"]')).toHaveCount(1);
    await expect(guestPage.getByRole('button', { name: 'Add text' })).toBeDisabled();
    await expect(guestPage.getByRole('button', { name: 'Share' })).toHaveCount(0);

    await dialog.getByRole('button', { name: 'Revoke view link' }).click();
    await expect(dialog.getByText('There is no active read-only link.')).toBeVisible({
      timeout: 20000,
    });

    await guestPage.reload();

    await expect(
      guestPage.getByRole('heading', { level: 1, name: 'This view link was revoked' }),
    ).toBeVisible({ timeout: 30000 });

    await ownerContext.close();
    await guestContext.close();
  });
});
