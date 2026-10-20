import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

test.describe('Board presentation', () => {
  test('presents frames with keyboard navigation and returns to editing', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Presentation board');

    const canvas = page.getByRole('application', { name: 'Canvas' });
    const present = page.getByRole('button', { name: 'Present' });

    await expect(present).toBeDisabled();

    await addElement(page, 'frame');
    await expect(present).toBeEnabled();
    await addElement(page, 'frame');

    await expect(canvas).toHaveAttribute('aria-readonly', 'false');
    await present.click();

    const presentation = page.getByTestId('board-presentation');
    await expect(presentation).toBeVisible();
    await expect(page.getByTestId('canvas-toolbar')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Task plan' })).toHaveCount(0);
    await expect(canvas).toHaveAttribute('aria-readonly', 'true');
    await expect(page.getByRole('status')).toContainText('Frame 1 of 2');

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('status')).toContainText('Frame 2 of 2');
    await expect(page.getByRole('button', { name: 'Next frame' })).toBeDisabled();

    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('status')).toContainText('Frame 1 of 2');

    await page.keyboard.press('Escape');
    await expect(presentation).toHaveCount(0);
    await expect(page.getByTestId('canvas-toolbar')).toBeVisible();
    await expect(canvas).toHaveAttribute('aria-readonly', 'false');
    await expect(page.getByRole('button', { name: 'Present' })).toBeVisible();
  });
});
