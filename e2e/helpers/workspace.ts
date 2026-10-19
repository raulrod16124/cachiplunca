import { expect, type Page } from '@playwright/test';

export async function createWorkspace(page: Page, name = 'Roadmap Q4'): Promise<void> {
  await page.getByRole('button', { name: 'Create workspace' }).first().click();
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('heading', { level: 3, name })).toBeVisible({ timeout: 20000 });

  const card = page.getByRole('article').filter({ hasText: name }).first();
  await card.getByRole('button', { name: 'Open' }).click();

  await expect(page.getByRole('application', { name: 'Canvas' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('canvas-toolbar')).toBeVisible();
}

export async function addElement(page: Page, kind: 'text' | 'note' | 'task' | 'frame' | 'link') {
  await page.getByRole('button', { name: `Add ${kind}` }).click();

  if (kind === 'task') {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('New task');
    await dialog.getByRole('button', { name: 'Create task' }).click();
    await expect(dialog).toBeHidden();
  }

  const item = page.locator('[data-testid^="canvas-item-"]').last();
  await expect(item).toBeVisible({ timeout: 15000 });
  return item;
}
