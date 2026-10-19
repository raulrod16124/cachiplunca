import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { addElement, createWorkspace } from './helpers/workspace';

test.describe('Board export', () => {
  test('downloads the board as a versioned JSON file', async ({ page }) => {
    await registerUser(page);
    await createWorkspace(page, 'Roadmap Q4');
    await addElement(page, 'text');

    await page.getByRole('button', { name: 'Export board' }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Export as JSON' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^roadmap-q4-\d{4}-\d{2}-\d{2}\.json$/);

    const path = await download.path();

    if (path === null) {
      throw new Error('Expected the download to be stored on disk');
    }

    const content = await readFile(path, 'utf8');
    const parsed = JSON.parse(content) as {
      version: number;
      workspaceId: string;
      elements: readonly { readonly type: string }[];
    };

    expect(parsed.version).toBe(1);
    expect(parsed.workspaceId).toBeTruthy();
    expect(parsed.elements.map((element) => element.type)).toEqual(['text']);
    expect(content).not.toContain('createdBy');
    expect(content).not.toContain('assigneeId');
  });

  test('opens a printable snapshot of the board for PDF export', async ({ page }) => {
    await page.addInitScript(() => {
      const state = { calls: 0 };
      Object.defineProperty(window, '__exportPrintCalls', {
        configurable: true,
        get: () => state.calls,
      });
      window.print = () => {
        state.calls += 1;
      };
    });

    await registerUser(page);
    await createWorkspace(page, 'Printable board');
    await addElement(page, 'note');

    await page.getByRole('button', { name: 'Export board' }).click();
    await page.getByRole('menuitem', { name: 'Export as PDF' }).click();

    expect(
      await page.evaluate(
        () => (window as unknown as { readonly __exportPrintCalls: number }).__exportPrintCalls,
      ),
    ).toBe(1);

    await page.emulateMedia({ media: 'print' });

    const printView = page.getByTestId('board-print-view');
    await expect(printView).toBeVisible();
    await expect(printView).toContainText('Printable board');
    await expect(printView).toContainText('Exported on');
  });
});
