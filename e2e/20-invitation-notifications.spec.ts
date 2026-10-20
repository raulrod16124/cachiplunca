import { expect, test } from '@playwright/test';
import { registerUser, uniqueEmail, verifyEmail } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

test.describe('Invitation notifications', () => {
  test('shows a live badge and notice, then accepts the invitation', async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const inviteeEmail = uniqueEmail('notified');

    await registerUser(ownerPage);
    await createWorkspace(ownerPage, 'Notification board');

    const inviteeContext = await browser.newContext();
    const inviteePage = await inviteeContext.newPage();
    await registerUser(inviteePage, inviteeEmail);
    await verifyEmail(inviteeEmail);

    await expect(inviteePage.getByRole('link', { name: 'Invitations' })).toBeVisible();

    await ownerPage.getByRole('button', { name: 'Share' }).click();
    const dialog = ownerPage.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Share workspace' })).toBeVisible();
    await dialog.getByLabel('Email').fill(inviteeEmail);
    await dialog.getByRole('button', { name: 'Send invitation' }).click();
    await expect(dialog.getByLabel('Invitation link')).toBeVisible({ timeout: 15000 });

    const notice = inviteePage.getByRole('status', { name: 'New invitation' });
    await expect(notice).toBeVisible({ timeout: 20000 });
    await expect(notice.getByText(/invited you as editor/i)).toBeVisible();
    await expect(inviteePage.getByRole('link', { name: /Invitations, 1 pending/i })).toBeVisible();

    await notice.getByRole('button', { name: 'Accept invitation' }).click();

    await expect(inviteePage.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });
    await expect(inviteePage.getByRole('button', { name: 'Add text' })).toBeEnabled();

    await ownerContext.close();
    await inviteeContext.close();
  });
});
