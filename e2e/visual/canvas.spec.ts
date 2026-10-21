import { expect, test, type Locator, type Page } from '@playwright/test';
import { addElement, createWorkspace, waitForBoardSaved } from '../helpers/workspace';
import {
  disableAnimations,
  dynamicMaskLocators,
  openCommentsPanel,
  openPlanPanel,
  openShareDialog,
  setLanguage,
  setTheme,
  waitForStable,
} from './helpers/visual';
import { registerUser } from '../helpers/auth';

const NOTE_PALETTE = [
  { label: 'Green', offsetX: -430, offsetY: -190 },
  { label: 'Amber', offsetX: -215, offsetY: -190 },
  { label: 'Blue', offsetX: 0, offsetY: -190 },
  { label: 'Red', offsetX: 215, offsetY: -190 },
  { label: 'Gray', offsetX: 430, offsetY: -190 },
] as const;

async function applyNoteColor(page: Page, note: Locator, label: string): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('element-editor-box')).toBeHidden();
  await note.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Note color' }).hover();
  await page.getByRole('menuitem', { name: label }).click();
  await expect(page.getByRole('menuitem', { name: label })).toBeHidden();
}

async function dragNote(page: Page, note: Locator, offsetX: number, offsetY: number) {
  const box = await note.boundingBox();
  if (box === null) {
    throw new Error('Note has no bounding box');
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + offsetX, startY + offsetY, { steps: 12 });
  await page.mouse.up();
}

test.describe('visual baseline — canvas', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await disableAnimations(page);
    await setLanguage(page, 'en');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`empty theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Empty canvas');
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-empty-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`populated theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Populated canvas');
      await addElement(page, 'text');
      await addElement(page, 'note');
      await addElement(page, 'task');
      await addElement(page, 'frame');
      await page.getByRole('application', { name: 'Canvas' }).click();
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-populated-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`selection theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Selection canvas');
      const note = await addElement(page, 'note');
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('element-editor-box')).toBeHidden();
      await note.click();
      await expect(page.getByTestId('selection-overlay')).toBeVisible();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-selection-${theme}.png`, {
        mask: [
          page.locator('[data-testid="session-timer-display"]'),
          page.locator('[data-testid="connected-users"]'),
          page.locator('[data-testid^="presence-avatar-"]'),
          page.locator('[data-testid^="comment-indicator-"]'),
        ],
      });
    });

    test(`context menu theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Context menu canvas');
      const note = await addElement(page, 'note');
      await page.keyboard.press('Escape');
      await expect(page.getByTestId('element-editor-box')).toBeHidden();
      await note.click({ button: 'right' });
      await expect(page.getByRole('menuitem', { name: 'Note color' })).toBeVisible();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-context-menu-${theme}.png`, {
        mask: [
          page.locator('[data-testid="session-timer-display"]'),
          page.locator('[data-testid="connected-users"]'),
          page.locator('[data-testid^="presence-avatar-"]'),
          page.locator('[data-testid^="comment-indicator-"]'),
        ],
      });
    });

    test(`note palette theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Note palette');

      for (const { label, offsetX, offsetY } of NOTE_PALETTE) {
        const note = await addElement(page, 'note');
        await applyNoteColor(page, note, label);
        await dragNote(page, note, offsetX, offsetY);
      }

      await page.getByRole('application', { name: 'Canvas' }).click();
      await waitForBoardSaved(page);
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-notes-${theme}.png`, {
        mask: [
          page.locator('[data-testid="session-timer-display"]'),
          page.locator('[data-testid="connected-users"]'),
          page.locator('[data-testid^="presence-avatar-"]'),
          page.locator('[data-testid^="comment-indicator-"]'),
        ],
      });
    });

    test(`task plan drawer theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Plan canvas');
      await addElement(page, 'task');
      await openPlanPanel(page);
      await setTheme(page, theme);
      await expect(page).toHaveScreenshot(`canvas-plan-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`comments drawer theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Comments canvas');
      await addElement(page, 'text');
      await openCommentsPanel(page);
      await setTheme(page, theme);
      await expect(page).toHaveScreenshot(`canvas-comments-${theme}.png`, {
        mask: dynamicMaskLocators(page),
      });
    });

    test(`share dialog theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Share canvas');
      await openShareDialog(page);
      await setTheme(page, theme);
      await expect(page).toHaveScreenshot(`canvas-share-${theme}.png`, {
        mask: [
          ...dynamicMaskLocators(page),
          page.locator('[aria-label="Read-only link"]'),
          page.locator('[aria-label="Invitation link"]'),
        ],
      });
    });

    test(`settings dialog theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Settings canvas');
      await page.getByRole('button', { name: 'Open account menu' }).click();
      await page.getByRole('menuitem', { name: 'Preferences' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await setTheme(page, theme);
      const emailText = page.getByText(/@example\.com/);
      await expect(page).toHaveScreenshot(`canvas-settings-${theme}.png`, {
        mask: [
          ...dynamicMaskLocators(page),
          emailText.locator('xpath=../..'),
          page.getByPlaceholder(/@example\.com/),
        ],
      });
    });
  }
});
