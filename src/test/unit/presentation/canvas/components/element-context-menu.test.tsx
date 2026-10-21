import type { ComponentProps } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../../setup/render-with-theme';
import { ElementContextMenu } from '../../../../../presentation/canvas/components/element-context-menu';

function renderMenu(overrides: Partial<ComponentProps<typeof ElementContextMenu>> = {}) {
  const props = {
    position: { x: 12, y: 24 },
    onBringToFront: jest.fn(),
    onSendToBack: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };

  render(<ElementContextMenu {...props} />);

  return props;
}

describe('ElementContextMenu', () => {
  it('renders the layer actions inside the design-system menu surface', async () => {
    renderMenu();

    const menu = await screen.findByRole('menu');

    expect(menu).toHaveClass('rr-dropdown-menu');
    expect(screen.getByRole('menuitem', { name: 'Bring to front' })).toHaveClass(
      'rr-dropdown-item',
    );
    expect(screen.getByRole('menuitem', { name: 'Send to back' })).toHaveClass('rr-dropdown-item');
  });

  it('forwards layer actions and closes the menu', async () => {
    const user = userEvent.setup();
    const props = renderMenu();

    await user.click(await screen.findByRole('menuitem', { name: 'Bring to front' }));

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
