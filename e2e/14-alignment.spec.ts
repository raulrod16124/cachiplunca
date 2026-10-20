import { expect, test, type Locator, type Page } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

async function closeEditor(page: Page): Promise<void> {
  await page.getByTestId('element-editor').getByRole('textbox').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('element-editor-box')).toBeHidden();
}

async function dragBy(page: Page, item: Locator, deltaX: number, deltaY: number): Promise<void> {
  const box = await item.boundingBox();

  if (box === null) {
    throw new Error('Element is not visible');
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 8 });
  await page.mouse.up();
}

async function positions(
  items: Locator,
): Promise<readonly { x: number; y: number; width: number }[]> {
  const count = await items.count();
  const result: { x: number; y: number; width: number }[] = [];

  for (let index = 0; index < count; index += 1) {
    const box = await items.nth(index).boundingBox();

    if (box === null) {
      throw new Error(`Element ${index} is not visible`);
    }

    result.push({ x: box.x, y: box.y, width: box.width });
  }

  return result;
}

function spread(values: readonly number[]): number {
  return Math.max(...values) - Math.min(...values);
}

test.describe('Alignment and distribution', () => {
  test('aligns, distributes, undoes and persists positions', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Alignment board');

    const canvas = page.getByRole('application', { name: 'Canvas' });
    const items = page.locator('[data-testid^="canvas-item-"]');

    const first = await addElement(page, 'text');
    await closeEditor(page);
    await dragBy(page, first, 240, 0);

    const second = await addElement(page, 'text');
    await closeEditor(page);
    await dragBy(page, second, 0, 180);

    const third = await addElement(page, 'text');
    await closeEditor(page);
    await dragBy(page, third, -240, 60);

    await expect(items).toHaveCount(3);
    expect(spread((await positions(items)).map((position) => position.x))).toBeGreaterThan(100);
    await canvas.focus();
    await page.keyboard.press('Control+a');
    await expect(page.getByTestId('selection-overlay')).toHaveAttribute(
      'data-selection-count',
      '3',
    );

    await page.getByRole('button', { name: 'Align and distribute' }).click();
    await page.getByRole('menuitem', { name: 'Distribute horizontally' }).click();

    const distributed = [...(await positions(items))].sort((a, b) => a.x - b.x);
    const gapOne = distributed[1]!.x - (distributed[0]!.x + distributed[0]!.width);
    const gapTwo = distributed[2]!.x - (distributed[1]!.x + distributed[1]!.width);

    expect(Math.abs(gapOne - gapTwo)).toBeLessThan(3);

    await page.getByRole('button', { name: 'Align and distribute' }).click();
    await page.getByRole('menuitem', { name: 'Align left' }).click();

    const aligned = await positions(items);
    expect(spread(aligned.map((position) => position.x))).toBeLessThan(1);

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect
      .poll(async () => spread((await positions(items)).map((position) => position.x)))
      .toBeGreaterThan(50);

    await page.getByRole('button', { name: 'Redo' }).click();
    await expect
      .poll(async () => spread((await positions(items)).map((position) => position.x)))
      .toBeLessThan(1);

    await page.waitForTimeout(1000);
    await page.reload();
    await expect(canvas).toBeVisible({ timeout: 20000 });

    const reloaded = page.locator('[data-testid^="canvas-item-"]');
    await expect(reloaded).toHaveCount(3, { timeout: 20000 });
    expect(spread((await positions(reloaded)).map((position) => position.x))).toBeLessThan(1);
  });
});
