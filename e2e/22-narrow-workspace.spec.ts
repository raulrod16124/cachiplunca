import { expect, test, type Locator } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

async function expectWithinViewport(
  locator: Locator,
  width: number,
  height: number,
): Promise<void> {
  const box = await locator.boundingBox();

  expect(box).not.toBeNull();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height);
}

test.describe('Narrow workspace surfaces', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('keeps topbar actions, toolbar and drawers usable at narrow viewports', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await registerUser(page);
    await createWorkspace(page, 'Narrow workspace');

    const text = await addElement(page, 'text');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('element-editor-box')).toBeHidden();
    await text.click();

    for (const width of [900, 768, 390] as const) {
      await page.setViewportSize({ width, height: 800 });

      const toolbar = page.getByTestId('canvas-toolbar');
      await expect(toolbar).toBeVisible();
      await expectWithinViewport(toolbar, width, 800);

      const deleteSelection = page.getByRole('button', { name: 'Delete selection' });
      await deleteSelection.scrollIntoViewIfNeeded();
      await expect(deleteSelection).toBeVisible();
      await expectWithinViewport(deleteSelection, width, 800);

      await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Task plan' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Comments' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open account menu' })).toBeVisible();
    }

    await page.getByRole('button', { name: 'More board actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Present' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Export as JSON' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Export as PDF' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Keyboard shortcuts' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Task plan' }).click();
    const plan = page.getByTestId('task-plan-panel');
    await expect(plan).toBeVisible();
    await expectWithinViewport(plan, 390, 800);
    await page.getByRole('button', { name: 'Close task plan' }).click();
    await expect(plan).toBeHidden();

    await page.getByRole('button', { name: 'Comments' }).click();
    const comments = page.getByTestId('comments-panel');
    await expect(comments).toBeVisible();
    await expectWithinViewport(comments, 390, 800);
    await page.getByRole('button', { name: 'Close comments' }).click();
    await expect(comments).toBeHidden();
  });
});
