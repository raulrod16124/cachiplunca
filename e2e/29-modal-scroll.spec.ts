import { expect, test, type Locator, type Page } from '@playwright/test';
import { registerUser } from './helpers/auth';
import { createWorkspace } from './helpers/workspace';

interface Viewport {
  readonly width: number;
  readonly height: number;
}

const VIEWPORTS: readonly Viewport[] = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];

async function openShortcuts(page: Page): Promise<void> {
  const viewport = page.viewportSize();

  if ((viewport?.width ?? 0) > 900) {
    await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
    return;
  }

  await page.getByRole('button', { name: 'More board actions' }).click();
  await page.getByRole('menuitem', { name: 'Keyboard shortcuts' }).click();
}

async function assertModalLayout(
  page: Page,
  options: { readonly focusTrigger?: Locator } = {},
): Promise<void> {
  const dialog = page.locator('[role="dialog"][aria-modal="true"]');
  const viewport = page.viewportSize();
  await expect(dialog).toBeVisible();

  if (viewport === null) {
    throw new Error('A viewport is required to assert the modal layout.');
  }

  const hasHorizontalOverflow = await dialog.evaluate(
    (element) => element.scrollWidth > element.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const metrics = await dialog.evaluate((element) => {
    const root = element as HTMLElement;
    const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
    const scrollableNodes = nodes.filter((node) => {
      const style = window.getComputedStyle(node);

      if (style.overflowY !== 'auto' && style.overflowY !== 'scroll') {
        return false;
      }

      return node.clientHeight > 0 && node.scrollHeight > node.clientHeight + 1;
    });
    const [firstScrollable] = scrollableNodes;

    if (firstScrollable !== undefined) {
      firstScrollable.scrollTop = firstScrollable.scrollHeight;
    }

    const body = root.querySelector<HTMLElement>('[data-testid="modal-body"]');
    const focusables =
      body === null
        ? []
        : Array.from(
            body.querySelectorAll<HTMLElement>(
              'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((node) => node.getClientRects().length > 0);
    const lastFocusable = focusables[focusables.length - 1];
    const lastRect = lastFocusable?.getBoundingClientRect();

    return {
      regions: scrollableNodes.length,
      contentOverflows: root.scrollHeight > root.clientHeight + 1,
      lastFocusableTop: lastRect === undefined ? null : lastRect.top,
      lastFocusableBottom: lastRect === undefined ? null : lastRect.bottom,
    };
  });

  expect(metrics.regions).toBeLessThanOrEqual(1);
  if (metrics.contentOverflows) {
    expect(metrics.regions).toBe(1);
  }

  if (metrics.lastFocusableTop !== null && metrics.lastFocusableBottom !== null) {
    expect(metrics.lastFocusableTop).toBeGreaterThanOrEqual(-1);
    expect(metrics.lastFocusableBottom).toBeLessThanOrEqual(viewport.height + 1);
  }

  const footer = dialog.getByTestId('modal-footer');
  if ((await footer.count()) > 0) {
    const box = await footer.boundingBox();

    if (box === null) {
      throw new Error('The modal footer must be measurable.');
    }

    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  if (options.focusTrigger !== undefined) {
    await expect(options.focusTrigger).toBeFocused();
  }
}

for (const viewport of VIEWPORTS) {
  test(`keeps every modal within one scroll region at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await registerUser(page);
    await createWorkspace(page, `Modal scroll ${viewport.width}`);
    await page.setViewportSize(viewport);

    const taskTrigger = page.getByRole('button', { name: 'Add task' });
    await taskTrigger.click();
    await assertModalLayout(page, { focusTrigger: taskTrigger });

    const shareTrigger = page.getByRole('button', { name: 'Share' });
    await shareTrigger.click();
    await assertModalLayout(page, { focusTrigger: shareTrigger });

    await openShortcuts(page);
    await assertModalLayout(page);

    await page.keyboard.press('Control+k');
    await assertModalLayout(page);

    await page.getByRole('button', { name: 'Back to boards' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Your boards' })).toBeVisible();

    const notificationsTrigger = page.getByRole('button', { name: /^Notifications/ }).first();
    await notificationsTrigger.click();
    await assertModalLayout(page, { focusTrigger: notificationsTrigger });

    const createTrigger = page.getByRole('button', { name: 'Create board' }).first();
    await createTrigger.click();
    await assertModalLayout(page, { focusTrigger: createTrigger });

    const card = page.getByRole('article').filter({ hasText: `Modal scroll ${viewport.width}` });
    const editTrigger = card.getByRole('button', { name: `Edit Modal scroll ${viewport.width}` });
    await editTrigger.click();
    await assertModalLayout(page, { focusTrigger: editTrigger });

    const deleteTrigger = card.getByRole('button', {
      name: `Delete Modal scroll ${viewport.width}`,
    });
    await deleteTrigger.click();
    await assertModalLayout(page, { focusTrigger: deleteTrigger });
  });
}

for (const viewport of VIEWPORTS) {
  test(`keeps the finished timer dialog usable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await registerUser(page);
    await createWorkspace(page, `Timer modal ${viewport.width}`);
    await page.setViewportSize(viewport);
    await page.clock.install();

    await page.getByTestId('session-timer-trigger').click();
    await page.getByRole('button', { name: '1 min' }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await page.clock.fastForward(60_000);

    await expect(page.getByRole('dialog', { name: 'Time is up' })).toBeVisible();
    await assertModalLayout(page);
  });
}
