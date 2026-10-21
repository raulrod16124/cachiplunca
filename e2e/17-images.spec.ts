import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace, waitForBoardSaved } from './helpers/workspace';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test.describe('Images', () => {
  test('uploads, renders, edits the description and deletes an image', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Visual board');

    await page.getByTestId('image-file-input').setInputFiles({
      name: 'diagram.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_BASE64, 'base64'),
    });

    const image = page.locator('[data-element-type="image"]').first();
    await expect(image).toBeVisible({ timeout: 20000 });
    await expect(image.getByRole('img', { name: 'diagram' })).toBeVisible();
    await waitForBoardSaved(page);

    await page.reload();

    const reloaded = page.locator('[data-element-type="image"]').first();
    await expect(reloaded).toBeVisible({ timeout: 20000 });
    await expect(reloaded.getByRole('img', { name: 'diagram' })).toBeVisible();

    await reloaded.dblclick();
    const description = page.getByLabel('Image description');
    await description.fill('System architecture diagram');
    await description.press('Enter');

    await expect(
      page.locator('[data-element-type="image"]').getByRole('img', {
        name: 'System architecture diagram',
      }),
    ).toBeVisible();
    await waitForBoardSaved(page);

    await page.reload();

    const edited = page.locator('[data-element-type="image"]').first();
    await expect(edited.getByRole('img', { name: 'System architecture diagram' })).toBeVisible({
      timeout: 20000,
    });

    await edited.click();
    await page.keyboard.press('Delete');

    await expect(page.locator('[data-element-type="image"]')).toHaveCount(0);
    await waitForBoardSaved(page);

    await page.reload();
    await expect(page.locator('[data-element-type="image"]')).toHaveCount(0, { timeout: 20000 });
  });

  test('rejects an unsupported file with a clear error', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Invalid image board');

    await page.getByTestId('image-file-input').setInputFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('not an image'),
    });

    await expect(page.getByText('Choose a PNG, JPEG, WebP or GIF image.')).toBeVisible();
    await expect(page.locator('[data-element-type="image"]')).toHaveCount(0);
  });
});
