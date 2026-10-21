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

const RENDERER_IMAGE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAoCAIAAADBrGu+AAAARklEQVR42u3PUQkAIBAFsNfCEoINDGYu+50Z5H4HK7CMPZvqrJabjggICAgICAgICAgICAgICAgICAgICAgICAgICAgI/Hijlb69BReavgAAAABJRU5ErkJggg==';

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

async function closeElementEditor(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('element-editor-box')).toBeHidden();
}

async function dragElement(
  page: Page,
  element: Locator,
  offsetX: number,
  offsetY: number,
): Promise<void> {
  const box = await element.boundingBox();
  if (box === null) {
    throw new Error('Element has no bounding box');
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

    test(`renderers theme:${theme}`, async ({ page }) => {
      await registerUser(page);
      await createWorkspace(page, 'Renderer canvas');

      const text = await addElement(page, 'text');
      const textEditor = page.getByTestId('element-editor').getByRole('textbox');
      await expect(textEditor).toBeVisible();
      await textEditor.fill('Ideas');
      await textEditor.blur();
      await dragElement(page, text, -420, -260);

      const note = await addElement(page, 'note');
      const noteEditor = page.getByTestId('element-editor').getByRole('textbox');
      await expect(noteEditor).toBeVisible();
      await noteEditor.fill('Make it warm');
      await noteEditor.blur();
      await dragElement(page, note, -210, -260);

      const task = await addElement(page, 'task');
      await dragElement(page, task, 0, -260);

      const frame = await addElement(page, 'frame');
      await closeElementEditor(page);
      await dragElement(page, frame, 300, -260);

      const link = await addElement(page, 'link');
      await closeElementEditor(page);
      await dragElement(page, link, -210, 60);

      await page.getByTestId('image-file-input').setInputFiles({
        name: 'baseline.png',
        mimeType: 'image/png',
        buffer: Buffer.from(RENDERER_IMAGE_PNG_BASE64, 'base64'),
      });

      const image = page.locator('[data-element-type="image"]').first();
      const imageContent = image.locator('[data-element-content]');
      await expect(image).toBeVisible({ timeout: 20000 });
      await expect(imageContent).toHaveAttribute('data-image-state', 'loaded', {
        timeout: 20000,
      });
      await dragElement(page, image, 100, 160);

      await page.getByRole('application', { name: 'Canvas' }).click();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await waitForBoardSaved(page);
      await setTheme(page, theme);
      await waitForStable(page);
      await expect(page).toHaveScreenshot(`canvas-renderers-${theme}.png`, {
        mask: [
          page.locator('[data-testid="session-timer-display"]'),
          page.locator('[data-testid="connected-users"]'),
          page.locator('[data-testid^="presence-avatar-"]'),
          page.locator('[data-testid^="comment-indicator-"]'),
        ],
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
        await dragElement(page, note, offsetX, offsetY);
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
