import type { ComponentProps } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../../setup/render-with-theme';
import { localeWrapper } from '../../../../setup/locale-wrapper';
import { ElementContextMenu } from '../../../../../presentation/canvas/components/element-context-menu';
import { MESSAGES } from '../../../../../presentation/i18n';

function renderMenu(
  overrides: Partial<ComponentProps<typeof ElementContextMenu>> = {},
  locale?: 'en' | 'es',
) {
  const props = {
    position: { x: 12, y: 24 },
    onBringToFront: jest.fn(),
    onSendToBack: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };

  render(
    <ElementContextMenu {...props} />,
    locale === undefined ? undefined : { wrapper: localeWrapper(locale) },
  );

  return props;
}

describe('ElementContextMenu', () => {
  it('renders the layer actions inside the design-system menu surface', async () => {
    renderMenu();

    const menu = await screen.findByRole('menu');

    expect(menu).toHaveClass('rr-dropdown-menu');
    expect(
      screen.getByRole('menuitem', { name: MESSAGES.en['shortcuts.selection.bringToFront'] }),
    ).toHaveClass('rr-dropdown-item');
    expect(
      screen.getByRole('menuitem', { name: MESSAGES.en['shortcuts.selection.sendToBack'] }),
    ).toHaveClass('rr-dropdown-item');
  });

  it('renders the layer actions in Spanish', async () => {
    renderMenu({}, 'es');

    await screen.findByRole('menu');

    expect(
      screen.getByRole('menuitem', { name: MESSAGES.es['shortcuts.selection.bringToFront'] }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: MESSAGES.es['shortcuts.selection.sendToBack'] }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: MESSAGES.en['shortcuts.selection.bringToFront'] }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: MESSAGES.en['shortcuts.selection.sendToBack'] }),
    ).not.toBeInTheDocument();
  });

  it('forwards layer actions and closes the menu', async () => {
    const user = userEvent.setup();
    const props = renderMenu();

    await user.click(
      await screen.findByRole('menuitem', {
        name: MESSAGES.en['shortcuts.selection.bringToFront'],
      }),
    );

    expect(props.onBringToFront).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('forwards layer actions using the Spanish labels', async () => {
    const user = userEvent.setup();
    const props = renderMenu({}, 'es');

    await user.click(
      await screen.findByRole('menuitem', {
        name: MESSAGES.es['shortcuts.selection.bringToFront'],
      }),
    );

    expect(props.onBringToFront).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalled();
  });

  it('renders note color options with the current selection marked', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    renderMenu({
      noteColor: {
        currentColor: undefined,
        onSelect,
        onClear: jest.fn(),
      },
    });

    await user.hover(await screen.findByRole('menuitem', { name: 'Note color' }));

    expect(await screen.findByRole('menuitem', { name: 'Default' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: 'Green' })).toBeInTheDocument();
  });
});
