import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

const PNG_FILE = {
  name: 'cover.png',
  mimeType: 'image/png',
  buffer: Buffer.from(PNG_BASE64, 'base64'),
};

test.describe('Workspace cover', () => {
  test('creates a board with a cover and shows it in the list and top bar', async ({ page }) => {
    await registerUser(page);

    await page.getByRole('button', { name: 'Create board' }).first().click();
    await page.getByLabel('Name').fill('Covered board');
    await page.getByTestId('workspace-cover-input').setInputFiles(PNG_FILE);
    await expect(page.getByAltText('Cover image preview')).toBeVisible();
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByRole('heading', { level: 3, name: 'Covered board' })).toBeVisible({
      timeout: 20000,
    });
    const card = page.getByRole('article').filter({ hasText: 'Covered board' });
    await expect(card.getByTestId('workspace-cover-card').locator('img')).toBeVisible();

    await card.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByTestId('workspace-cover-topbar').locator('img')).toBeVisible({
      timeout: 20000,
    });

    await page.reload();
    await expect(page.getByTestId('workspace-cover-topbar').locator('img')).toBeVisible({
      timeout: 20000,
    });

    await page.getByRole('button', { name: 'Back to boards' }).click();
    const reloadedCard = page.getByRole('article').filter({ hasText: 'Covered board' });
    await expect(reloadedCard.getByTestId('workspace-cover-card').locator('img')).toBeVisible();
    await reloadedCard.getByRole('button', { name: 'Edit Covered board' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByAltText('Cover image preview')).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove cover image' }).click();
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog).toBeHidden();

    await expect(
      page
        .getByRole('article')
        .filter({ hasText: 'Covered board' })
        .getByTestId('workspace-cover-card')
        .locator('img'),
    ).toHaveCount(0);
  });

  test('rejects an unsupported cover file without blocking board creation', async ({ page }) => {
    await registerUser(page);

    await page.getByRole('button', { name: 'Create board' }).first().click();
    await page.getByLabel('Name').fill('No cover board');
    await page.getByTestId('workspace-cover-input').setInputFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('not an image'),
    });

    await expect(page.getByText('Choose a PNG, JPEG, WebP or GIF image.')).toBeVisible();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'No cover board' })).toBeVisible({
      timeout: 20000,
    });
  });
});
