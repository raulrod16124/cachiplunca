import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { ToolbarDropdown } from '../../../../../presentation/canvas/text-format/toolbar-dropdown';

function Dropdown(): ReactElement {
  return (
    <ToolbarDropdown label="Styles" triggerContent="Aa">
      <button type="button" role="option" aria-selected="false">
        Normal
      </button>
      <button type="button" role="option" aria-selected="false" disabled>
        Subtitle
      </button>
      <button type="button" role="option" aria-selected="false">
        Heading 1
      </button>
    </ToolbarDropdown>
  );
}

describe('ToolbarDropdown', () => {
  it('opens with the trigger and closes on Escape returning focus', async () => {
    const user = userEvent.setup();

    render(<Dropdown />);

    const trigger = screen.getByRole('button', { name: 'Styles' });
    await user.click(trigger);

    expect(screen.getByRole('listbox', { name: 'Styles' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox', { name: 'Styles' })).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('opens with ArrowDown and focuses the first option', async () => {
    const user = userEvent.setup();

    render(<Dropdown />);

    const trigger = screen.getByRole('button', { name: 'Styles' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('listbox', { name: 'Styles' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Normal' })).toHaveFocus();
  });

  it('moves focus with arrow keys, Home and End skipping disabled options', async () => {
    const user = userEvent.setup();

    render(<Dropdown />);

    const trigger = screen.getByRole('button', { name: 'Styles' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('option', { name: 'Heading 1' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('option', { name: 'Normal' })).toHaveFocus();

    await user.keyboard('{End}');

    expect(screen.getByRole('option', { name: 'Heading 1' })).toHaveFocus();

    await user.keyboard('{Home}');

    expect(screen.getByRole('option', { name: 'Normal' })).toHaveFocus();

    await user.keyboard('{ArrowUp}');

    expect(screen.getByRole('option', { name: 'Heading 1' })).toHaveFocus();
  });
});
