import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SHORTCUT_GROUPS } from '../../../../../../presentation/canvas/keyboard-shortcuts';
import { KeyboardShortcutsDialog } from '../../../../../../presentation/features/workspace-shell/components/keyboard-shortcuts-dialog';
import { MESSAGES } from '../../../../../../presentation/i18n/messages';

interface RenderOptions {
  readonly open?: boolean;
  readonly onOpenChange?: jest.Mock;
}

function renderDialog({ open = false, onOpenChange = jest.fn() }: RenderOptions = {}) {
  render(<KeyboardShortcutsDialog open={open} onOpenChange={onOpenChange} />);

  return { onOpenChange };
}

describe('KeyboardShortcutsDialog', () => {
  it('uses the shared modal layout and keeps the footer outside the scroll body', () => {
    renderDialog({ open: true });

    const body = screen.getByTestId('modal-body');
    const footer = screen.getByTestId('modal-footer');

    expect(screen.getByTestId('modal-layout')).toContainElement(body);
    expect(body).not.toContainElement(footer);
  });

  it('renders nothing while closed', () => {
    renderDialog();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens with the question mark key', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.keyboard('?');

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('does not open while typing in an editable field', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();

    render(
      <>
        <input aria-label="Name" />
        <KeyboardShortcutsDialog open={false} onOpenChange={onOpenChange} />
      </>,
    );

    await user.click(screen.getByRole('textbox', { name: 'Name' }));
    await user.keyboard('?');

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('does not open while another modal dialog is open', async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();

    render(
      <>
        <div role="dialog" aria-modal="true" aria-label="Other dialog" />
        <KeyboardShortcutsDialog open={false} onOpenChange={onOpenChange} />
      </>,
    );

    await user.keyboard('?');

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('renders every shortcut from the catalogue with its key combination', () => {
    renderDialog({ open: true });

    expect(screen.getByRole('heading', { level: 2, name: 'Keyboard shortcuts' })).toBeVisible();

    for (const group of SHORTCUT_GROUPS) {
      const section = screen.getByTestId(`shortcuts-group-${group.id}`);

      expect(
        within(section).getByRole('heading', {
          level: 3,
          name: MESSAGES.en[group.titleKey],
        }),
      ).toBeVisible();

      for (const entry of group.entries) {
        expect(within(section).getByText(MESSAGES.en[entry.labelKey])).toBeInTheDocument();
        expect(within(section).getByText(MESSAGES.en[entry.keysKey])).toBeInTheDocument();
      }
    }
  });

  it('renders the general and presentation shortcuts', () => {
    renderDialog({ open: true });

    const general = screen.getByTestId('shortcuts-group-general');
    expect(
      within(general).getByText(MESSAGES.en['shortcuts.general.commandPalette']),
    ).toBeVisible();
    expect(within(general).getByText(MESSAGES.en['shortcuts.keys.commandPalette'])).toBeVisible();
    expect(within(general).getByText(MESSAGES.en['shortcuts.general.shortcuts'])).toBeVisible();
    expect(within(general).getByText(MESSAGES.en['shortcuts.keys.shortcuts'])).toBeVisible();

    const presentation = screen.getByTestId('shortcuts-group-presentation');
    expect(
      within(presentation).getByText(MESSAGES.en['shortcuts.presentation.navigate']),
    ).toBeVisible();
    expect(
      within(presentation).getByText(MESSAGES.en['shortcuts.keys.presentationNavigate']),
    ).toBeVisible();
    expect(
      within(presentation).getByText(MESSAGES.en['shortcuts.presentation.exit']),
    ).toBeVisible();
    expect(within(presentation).getByText(MESSAGES.en['shortcuts.keys.escape'])).toBeVisible();
  });

  it('moves focus into the dialog and traps it', async () => {
    const user = userEvent.setup();
    renderDialog({ open: true });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();

    await user.tab();
    await user.tab();

    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({ open: true });

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes from the close button', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({ open: true });

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
