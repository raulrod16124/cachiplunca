import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace, waitForBoardSaved } from './helpers/workspace';

test.describe('Board (MVP happy path)', () => {
  test('owner gets a board with a usable toolbar and can add elements', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Roadmap Q4');

    await expect(page.getByText('Owner', { exact: true })).toBeVisible();

    const canvas = page.getByRole('application', { name: 'Canvas' });
    await expect(canvas).toHaveAttribute('aria-readonly', 'false');
    await expect(page.getByRole('button', { name: 'Add text' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Add note' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Add task' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Add frame' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Add link' })).toBeEnabled();

    await addElement(page, 'text');
    await addElement(page, 'note');
    await addElement(page, 'task');
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(3);
  });

  test('pans by dragging empty space and reserves shift-drag for marquee selection', async ({
    page,
  }) => {
    await registerUser(page);
    await createWorkspace(page, 'Pan board');

    const canvas = page.getByRole('application', { name: 'Canvas' });
    const world = page.getByTestId('canvas-world');
    const box = await canvas.boundingBox();

    if (box === null) {
      throw new Error('Canvas has no bounding box');
    }

    const startX = box.x + box.width * 0.8;
    const startY = box.y + box.height * 0.7;

    const initialTransform = await world.evaluate((element) => getComputedStyle(element).transform);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 60, startY + 40, { steps: 8 });
    await page.mouse.up();

    await expect
      .poll(() => world.evaluate((element) => getComputedStyle(element).transform))
      .not.toBe(initialTransform);

    const pannedTransform = await world.evaluate((element) => getComputedStyle(element).transform);

    await page.keyboard.down('Shift');
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 60, startY + 40, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Shift');

    await expect
      .poll(() => world.evaluate((element) => getComputedStyle(element).transform))
      .toBe(pannedTransform);
  });

  test('creates and edits a task through the task form', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Task board');

    await page.getByRole('button', { name: 'Add task' }).click();

    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel('Title').fill('Plan launch');
    await createDialog.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'In progress' }).click();
    await createDialog.getByLabel('Notes').fill('Ship the MVP');
    await createDialog.getByRole('button', { name: 'Create task' }).click();

    const item = page.locator('[data-testid^="canvas-item-"]').last();
    await expect(item).toContainText('Plan launch');
    await expect(item).toContainText('In progress');
    await expect(item).not.toContainText('Ship the MVP');

    await item.locator('[data-testid^="task-notes-toggle-"]').click();
    await expect(item).toContainText('Ship the MVP');

    await item.dblclick();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByLabel('Title')).toHaveValue('Plan launch');
    await expect(editDialog.getByLabel('Notes')).toHaveValue('Ship the MVP');
    await editDialog.getByLabel('Title').fill('Launch plan');
    await editDialog.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'Completed' }).click();
    await editDialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(item).toContainText('Launch plan');
    await expect(item).toContainText('Completed');

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({ timeout: 20000 });
    const reloaded = page.locator('[data-testid^="canvas-item-"]').first();
    await expect(reloaded).toContainText('Launch plan', { timeout: 20000 });
    await expect(reloaded).toContainText('Completed');
    await expect(reloaded).not.toContainText('Ship the MVP');

    await reloaded.locator('[data-testid^="task-notes-toggle-"]').click();
    await expect(reloaded).toContainText('Ship the MVP');
  });

  test('undo, redo and delete drive element state', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Undo board');

    await addElement(page, 'text');
    await expect(page.getByRole('button', { name: 'Delete selection' })).toBeEnabled();

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled();

    await page.getByRole('button', { name: 'Redo' }).click();
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(1);

    await page.locator('[data-testid^="canvas-item-"]').last().click();
    await page.getByRole('button', { name: 'Delete selection' }).click();
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(0);
  });

  test('applies a note color, supports undo/redo and persists it', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Color board');

    const item = await addElement(page, 'note');
    const editor = page.getByTestId('element-editor').getByRole('textbox');
    await expect(editor).toBeVisible();
    await editor.focus();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('element-editor-box')).toBeHidden();
    const note = item.locator('[data-element-content="true"]');
    const canvas = page.getByRole('application', { name: 'Canvas' });
    const colorStyle = /background-color:\s*var\(--cach-note-green\)/;

    await item.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Note color' }).hover();
    await page.getByRole('menuitem', { name: 'Green' }).click();
    await expect(note).toHaveAttribute('style', colorStyle);

    await canvas.focus();
    await page.keyboard.press('Control+z');
    await expect(note).not.toHaveAttribute('style', colorStyle);

    await page.keyboard.press('Control+Shift+z');
    await expect(note).toHaveAttribute('style', colorStyle);

    await waitForBoardSaved(page);
    await page.reload();
    await expect(canvas).toBeVisible({ timeout: 20000 });

    const reloaded = page.locator('[data-testid^="canvas-item-"]').first();
    const reloadedNote = reloaded.locator('[data-element-content="true"]');
    await expect(reloadedNote).toHaveAttribute('style', colorStyle, { timeout: 20000 });

    await reloaded.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Note color' }).hover();
    await page.getByRole('menuitem', { name: 'Default' }).click();
    await expect(reloadedNote).not.toHaveAttribute('style', colorStyle);
  });

  test('elements survive a page reload', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Persistence board');

    await addElement(page, 'text');
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(1);

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid^="canvas-item-"]')).toHaveCount(1, { timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Add text' })).toBeEnabled();
  });

  test('edits text inline and persists it across reloads', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Editing board');

    const item = await addElement(page, 'text');

    const editor = page.getByTestId('element-editor').getByRole('textbox');
    await expect(editor).toBeVisible();
    await editor.fill('Hola mundo');
    await editor.blur();

    await expect(item).toContainText('Hola mundo');

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid^="canvas-item-"]').first()).toContainText(
      'Hola mundo',
      {
        timeout: 20000,
      },
    );
  });

  test('rotates an element, undoes the gesture and persists the rotation', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Rotation board');

    const canvas = page.getByRole('application', { name: 'Canvas' });
    const item = await addElement(page, 'text');

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('element-editor-box')).toBeHidden();
    await item.click();

    const handle = page.getByTestId('rotate-handle');
    await expect(handle).toBeVisible();

    const itemBox = await item.boundingBox();
    const handleBox = await handle.boundingBox();

    if (itemBox === null || handleBox === null) {
      throw new Error('Rotation geometry is unavailable');
    }

    const centerX = itemBox.x + itemBox.width / 2;
    const centerY = itemBox.y + itemBox.height / 2;
    const handleCursor = (): Promise<string> =>
      handle.evaluate((element) => getComputedStyle(element).cursor);

    await expect
      .poll(() => canvas.evaluate((element) => getComputedStyle(element).cursor))
      .toBe('grab');
    await expect
      .poll(() =>
        item
          .locator('[data-element-content]')
          .evaluate((element) => getComputedStyle(element).cursor),
      )
      .toBe('pointer');

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await expect.poll(handleCursor).toContain('data:image/svg');

    await page.mouse.down();
    await page.mouse.move(centerX + itemBox.width / 2, centerY, { steps: 10 });
    await expect.poll(handleCursor).toContain('data:image/svg');

    await page.mouse.up();
    await expect.poll(handleCursor).toContain('data:image/svg');

    const rotatedTransform = await item.evaluate((element) => getComputedStyle(element).transform);

    expect(rotatedTransform).not.toBe('matrix(1, 0, 0, 1, 0, 0)');

    await canvas.focus();
    await page.keyboard.press('Control+z');
    await expect
      .poll(() => item.evaluate((element) => getComputedStyle(element).transform))
      .toBe('matrix(1, 0, 0, 1, 0, 0)');

    await page.keyboard.press('Control+Shift+z');
    await expect
      .poll(() => item.evaluate((element) => getComputedStyle(element).transform))
      .toBe(rotatedTransform);

    await waitForBoardSaved(page);
    await page.reload();
    await expect(canvas).toBeVisible({ timeout: 20000 });

    const reloaded = page.locator('[data-testid^="canvas-item-"]').first();
    await expect
      .poll(() => reloaded.evaluate((element) => getComputedStyle(element).transform), {
        timeout: 20000,
      })
      .not.toBe('matrix(1, 0, 0, 1, 0, 0)');
  });

  test('creates new elements centered in the visible canvas', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Centered board');

    const canvas = page.getByRole('application', { name: 'Canvas' });
    const item = await addElement(page, 'text');

    const canvasBox = await canvas.boundingBox();
    const itemBox = await item.boundingBox();

    expect(canvasBox).not.toBeNull();
    expect(itemBox).not.toBeNull();

    const canvasCenter = {
      x: canvasBox!.x + canvasBox!.width / 2,
      y: canvasBox!.y + canvasBox!.height / 2,
    };
    const itemCenter = {
      x: itemBox!.x + itemBox!.width / 2,
      y: itemBox!.y + itemBox!.height / 2,
    };

    expect(Math.abs(itemCenter.x - canvasCenter.x)).toBeLessThan(24);
    expect(Math.abs(itemCenter.y - canvasCenter.y)).toBeLessThan(24);
  });

  test('re-opens the inline editor on double-click and persists further edits', async ({
    page,
  }) => {
    await registerUser(page);
    await createWorkspace(page, 'Re-edit board');

    const item = await addElement(page, 'text');

    const editor = page.getByTestId('element-editor').getByRole('textbox');
    await expect(editor).toBeVisible();
    await editor.fill('First');
    await editor.blur();
    await expect(item).toContainText('First');

    await item.dblclick();

    const reopened = page.getByTestId('element-editor').getByRole('textbox');
    await expect(reopened).toBeVisible();
    await expect(reopened).toHaveText('First');
    await reopened.fill('Second');
    await reopened.blur();

    await expect(item).toContainText('Second');

    await page.reload();
    await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('[data-testid^="canvas-item-"]').first()).toContainText('Second', {
      timeout: 20000,
    });
  });
});
