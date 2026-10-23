import { expect, test } from '@playwright/test';
import { registerUser, uniqueEmail, verifyEmail } from './helpers/auth';
import { addElement, createWorkspace, waitForBoardSaved } from './helpers/workspace';

test.describe('Comment notifications', () => {
  test('notifies another member and deep links to the comment', async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const memberEmail = uniqueEmail('comment-notified');

    await registerUser(ownerPage);
    await createWorkspace(ownerPage, 'Comment alerts board');

    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await registerUser(memberPage, memberEmail);
    await verifyEmail(memberEmail);

    await ownerPage.getByRole('button', { name: 'Share' }).click();
    const shareDialog = ownerPage.getByRole('dialog');
    await expect(shareDialog.getByRole('heading', { name: 'Share board' })).toBeVisible();
    await shareDialog.getByLabel('Email').fill(memberEmail);
    await shareDialog.getByRole('button', { name: 'Send invitation' }).click();
    await expect(shareDialog.getByLabel('Invitation link')).toBeVisible({ timeout: 15000 });

    const memberNotifications = memberPage.getByRole('button', {
      name: /Notifications, 1 unread/i,
    });
    await expect(memberNotifications).toBeVisible({ timeout: 20000 });
    await memberNotifications.click();
    const invitationDialog = memberPage.getByRole('dialog', { name: 'Notifications' });
    await expect(invitationDialog).toBeVisible();
    await invitationDialog.getByRole('button', { name: 'Accept invitation' }).click();
    await expect(memberPage.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });

    await ownerPage.keyboard.press('Escape');
    await expect(shareDialog).toBeHidden();
    await memberPage.goto('/workspaces');

    const note = await addElement(ownerPage, 'note');
    await expect(note).toHaveAttribute('data-selected', 'true');
    await ownerPage.getByRole('button', { name: 'Comments' }).click();
    const commentsPanel = ownerPage.getByTestId('comments-panel');
    await expect(commentsPanel).toBeVisible();
    const commentBody = 'Please review the launch plan';
    await commentsPanel.getByRole('textbox', { name: 'Comment' }).fill(commentBody);
    await commentsPanel.getByRole('button', { name: 'Add comment' }).click();
    await expect(commentsPanel.getByText(commentBody)).toBeVisible();
    await waitForBoardSaved(ownerPage);

    const commentNotifications = memberPage.getByRole('button', {
      name: /Notifications, 1 unread/i,
    });
    await expect(commentNotifications).toBeVisible({ timeout: 20000 });
    await commentNotifications.click();

    const notificationsDialog = memberPage.getByRole('dialog', { name: 'Notifications' });
    await expect(notificationsDialog).toBeVisible();
    await expect(notificationsDialog.getByRole('tab', { name: 'Comments' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const row = notificationsDialog.getByTestId('comment-notification-row');
    await expect(row).toContainText(commentBody);
    await row.click();

    await expect(memberPage.getByRole('application', { name: 'Canvas' })).toBeVisible({
      timeout: 20000,
    });
    const panel = memberPage.getByTestId('comments-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText(commentBody)).toBeVisible();
    await expect(
      memberPage.locator('[data-testid^="comment-card-"][data-highlighted="true"]'),
    ).toBeVisible();
    await memberPage.goto('/workspaces');
    await expect(memberPage.getByRole('button', { name: 'Notifications' })).toBeVisible();

    await ownerContext.close();
    await memberContext.close();
  });
});
