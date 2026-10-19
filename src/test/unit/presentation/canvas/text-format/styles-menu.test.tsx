import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StylesMenu } from '../../../../../presentation/canvas/text-format/styles-menu';
import type { TextFormatState } from '../../../../../presentation/canvas/text-format/text-format';

function state(overrides?: Partial<TextFormatState>): TextFormatState {
  return {
    bold: 'off',
    italic: 'off',
    underline: 'off',
    strikethrough: 'off',
    highlight: 'off',
    heading: 'off',
    bulletList: 'off',
    orderedList: 'off',
    ...overrides,
  };
}

describe('StylesMenu', () => {
  it('opens the styles panel', async () => {
    const user = userEvent.setup();

    render(<StylesMenu state={state()} onAction={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Styles/ }));

    expect(screen.getByRole('listbox', { name: 'Styles' })).toBeInTheDocument();
  });

  it('marks Normal as active for a paragraph', async () => {
    const user = userEvent.setup();

    render(<StylesMenu state={state()} onAction={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Styles/ }));

    expect(screen.getByRole('option', { name: 'Normal' })).toHaveAttribute('aria-selected', 'true');
  });

  it('marks the active heading level', async () => {
    const user = userEvent.setup();

    render(<StylesMenu state={state({ heading: 2 })} onAction={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Styles/ }));

    expect(screen.getByRole('option', { name: 'Heading 2' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('applies a heading level and closes the panel', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();

    render(<StylesMenu state={state()} onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: /Styles/ }));
    await user.click(screen.getByRole('option', { name: 'Heading 1' }));

    expect(onAction).toHaveBeenCalledWith({ kind: 'heading', level: 1 });
    expect(screen.queryByRole('listbox', { name: 'Styles' })).toBeNull();
  });

  it('applies Normal to reset the heading', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();

    render(<StylesMenu state={state({ heading: 1 })} onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: /Styles/ }));
    await user.click(screen.getByRole('option', { name: 'Normal' }));

    expect(onAction).toHaveBeenCalledWith({ kind: 'heading', level: null });
  });

  it('shows a mixed indicator on Normal for a mixed heading', async () => {
    const user = userEvent.setup();

    render(<StylesMenu state={state({ heading: 'mixed' })} onAction={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Styles/ }));

    expect(screen.getByRole('option', { name: 'Normal' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('disables Subtitle and Quote', async () => {
    const user = userEvent.setup();

    render(<StylesMenu state={state()} onAction={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /Styles/ }));

    expect(screen.getByRole('option', { name: 'Subtitle' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Quote' })).toBeDisabled();
  });

  it('toggles italic from Emphasis', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();

    render(<StylesMenu state={state({ italic: 'on' })} onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: /Styles/ }));

    expect(screen.getByRole('option', { name: 'Emphasis' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.click(screen.getByRole('option', { name: 'Emphasis' }));

    expect(onAction).toHaveBeenCalledWith({ kind: 'toggleMark', mark: 'italic' });
  });
});
