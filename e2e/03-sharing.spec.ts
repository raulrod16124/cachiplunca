import { expect, test } from '@playwright/test';
import { registerUser, uniqueEmail, verifyEmail } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

test.describe('Sharing (editor accepts from the pending list)', () => {
  test('an invited editor can accept from the workspaces list and edit the board', async ({
    browser,
  }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const editorEmail = uniqueEmail('editor');

    await registerUser(ownerPage);
    await createWorkspace(ownerPage, 'Editor board');
    await addElement(ownerPage, 'text');

    await ownerPage.getByRole('button', { name: 'Share' }).click();
    const dialog = ownerPage.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Share workspace' })).toBeVisible();

    await dialog.getByLabel('Email').fill(editorEmail);
    await expect(dialog.getByLabel('Role')).toHaveText(/Editor/);
    await dialog.getByRole('button', { name: 'Send invitation' }).click();
    await expect(dialog.getByLabel('Invitation link')).toBeVisible({ timeout: 15000 });

    const editorContext = await browser.newContext();
    const editorPage = await editorContext.newPage();
    await registerUser(editorPage, editorEmail);
    await verifyEmail(editorEmail);

    await expect(
      editorPage.getByRole('heading', { level: 2, name: 'Pending invitations' }),
    ).toBeVisible({ timeout: 20000 });
    await expect(editorPage.getByText(/A workspace/)).toBeVisible();
    await editorPage.getByRole('button', { name: 'Accept invitation' }).click();

    const canvas = editorPage.getByRole('application', { name: 'Canvas' });
    await expect(canvas).toBeVisible({ timeout: 20000 });
    await expect(editorPage.getByRole('button', { name: 'Add text' })).toBeEnabled();
    await addElement(editorPage, 'note');
    await expect(editorPage.locator('[data-testid^="canvas-item-"]')).toHaveCount(2, {
      timeout: 20000,
    });

    await ownerContext.close();
    await editorContext.close();
  });
});

test.describe('Sharing (viewer happy path)', () => {
  test('owner invites a viewer; viewer gets read-only access to the board', async ({ browser }) => {
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const viewerEmail = uniqueEmail('viewer');

    await registerUser(ownerPage);
    await createWorkspace(ownerPage, 'Shared board');
    await addElement(ownerPage, 'text');

    await ownerPage.getByRole('button', { name: 'Share' }).click();
    const dialog = ownerPage.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Share workspace' })).toBeVisible();

    await dialog.getByLabel('Email').fill(viewerEmail);
    await dialog.getByLabel('Role').click();
    await ownerPage.keyboard.press('ArrowDown');
    await ownerPage.keyboard.press('Enter');
    await expect(dialog.getByLabel('Role')).toHaveText(/Viewer/);
    await dialog.getByRole('button', { name: 'Send invitation' }).click();

    const invitationLink = dialog.getByLabel('Invitation link');
    await expect(invitationLink).toBeVisible({ timeout: 15000 });
    const link = await invitationLink.inputValue();
    expect(link).toContain('/invitations/');

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto(link);
    await expect(
      viewerPage.getByRole('heading', { level: 1, name: 'Accept invitation' }),
    ).toBeVisible({ timeout: 20000 });

    await viewerPage.getByRole('button', { name: 'Create account' }).click();
    await viewerPage.getByLabel('Email').fill(viewerEmail);
    await viewerPage.getByLabel('Password', { exact: true }).fill('Secret123');
    await viewerPage.getByRole('button', { name: 'Create account' }).click();

    await expect(
      viewerPage.getByRole('heading', { level: 1, name: 'Verify your email' }),
    ).toBeVisible({ timeout: 30000 });
    await verifyEmail(viewerEmail);
    await viewerPage.getByRole('button', { name: "I've verified my email" }).click();

    await expect(
      viewerPage.getByRole('heading', { level: 1, name: 'Invitation accepted' }),
    ).toBeVisible({ timeout: 30000 });
    await expect(viewerPage.getByText(/as viewer/i)).toBeVisible();

    await viewerPage.getByRole('button', { name: 'Go to workspace' }).click();
    const canvas = viewerPage.getByRole('application', { name: 'Canvas' });
    await expect(canvas).toBeVisible({ timeout: 20000 });

    await expect(viewerPage.getByText('Viewer', { exact: true })).toBeVisible();
    await expect(canvas).toHaveAttribute('aria-readonly', 'true');
    await expect(viewerPage.getByRole('button', { name: 'Add text' })).toBeDisabled();
    await expect(viewerPage.getByRole('button', { name: 'Add note' })).toBeDisabled();
    await expect(viewerPage.getByRole('button', { name: 'Delete selection' })).toBeDisabled();

    await expect(viewerPage.locator('[data-testid^="canvas-item-"]')).toHaveCount(1, {
      timeout: 20000,
    });

    await ownerContext.close();
    await viewerContext.close();
  });
});
