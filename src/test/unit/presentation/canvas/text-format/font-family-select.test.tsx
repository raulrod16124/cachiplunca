import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FontFamilySelect } from '../../../../../presentation/canvas/text-format/font-family-select';

describe('FontFamilySelect', () => {
  it('shows Default when no value is set', () => {
    render(<FontFamilySelect value={undefined} onSelect={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Font' })).toHaveTextContent('Default');
  });

  it('opens the panel with the full list of fonts', async () => {
    const user = userEvent.setup();

    render(<FontFamilySelect value={undefined} onSelect={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Font' }));

    expect(screen.getByRole('listbox', { name: 'Font' })).toBeInTheDocument();
    expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
  });

  it('filters fonts through the search field', async () => {
    const user = userEvent.setup();

    render(<FontFamilySelect value={undefined} onSelect={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Font' }));
    await user.type(screen.getByLabelText('Search fonts'), 'arial');

    const options = screen.getAllByRole('option');

    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Arial');
  });

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();

    render(<FontFamilySelect value={undefined} onSelect={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Font' }));
    await user.type(screen.getByLabelText('Search fonts'), 'zzzznope');

    expect(screen.getByText('No matching fonts')).toBeInTheDocument();
  });

  it('selects a font and clears the query', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(<FontFamilySelect value={undefined} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Font' }));
    await user.type(screen.getByLabelText('Search fonts'), 'arial');
    await user.click(screen.getByRole('option', { name: 'Arial' }));

    expect(onSelect).toHaveBeenCalledWith('arial');
  });

  it('marks the current value as selected', async () => {
    const user = userEvent.setup();

    render(<FontFamilySelect value="georgia" onSelect={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Font' }));

    expect(screen.getByRole('option', { name: 'Georgia' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
