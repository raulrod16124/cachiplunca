import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FontSizeSelect } from '../../../../../presentation/canvas/text-format/font-size-select';

describe('FontSizeSelect', () => {
  it('shows an empty input when no value is set', () => {
    render(<FontSizeSelect value={undefined} onSelect={jest.fn()} />);

    expect(screen.getByLabelText('Font size')).toHaveValue('');
  });

  it('shows the current value', () => {
    render(<FontSizeSelect value={16} onSelect={jest.fn()} />);

    expect(screen.getByLabelText('Font size')).toHaveValue('16');
  });

  it('commits a valid size on blur and reverts to the prop value', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(<FontSizeSelect value={16} onSelect={onSelect} />);

    const input = screen.getByLabelText('Font size');
    await user.clear(input);
    await user.type(input, '18');
    await user.tab();

    expect(onSelect).toHaveBeenCalledWith(18);
    expect(input).toHaveValue('16');
  });

  it('commits a valid size on Enter and shows it after a prop update', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    const { rerender } = render(<FontSizeSelect value={16} onSelect={onSelect} />);

    const input = screen.getByLabelText('Font size');
    await user.clear(input);
    await user.type(input, '24{Enter}');

    expect(onSelect).toHaveBeenCalledWith(24);

    rerender(<FontSizeSelect value={24} onSelect={onSelect} />);
    expect(input).toHaveValue('24');
  });

  it('rounds fractional input to the nearest size', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(<FontSizeSelect value={16} onSelect={onSelect} />);

    const input = screen.getByLabelText('Font size');
    await user.clear(input);
    await user.type(input, '17.6{Enter}');

    expect(onSelect).toHaveBeenCalledWith(18);
  });

  it('reverts an invalid size without calling onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(<FontSizeSelect value={16} onSelect={onSelect} />);

    const input = screen.getByLabelText('Font size');
    await user.clear(input);
    await user.type(input, '99{Enter}');
    await user.tab();

    expect(onSelect).not.toHaveBeenCalled();
    expect(input).toHaveValue('16');
  });

  it('reverts on Escape without committing', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(<FontSizeSelect value={16} onSelect={onSelect} />);

    const input = screen.getByLabelText('Font size');
    await user.clear(input);
    await user.type(input, '18{Escape}');

    expect(onSelect).not.toHaveBeenCalled();
    expect(input).toHaveValue('16');
  });

  it('does not commit when nothing was edited', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();

    render(<FontSizeSelect value={16} onSelect={onSelect} />);

    await user.click(screen.getByLabelText('Font size'));
    await user.tab();

    expect(onSelect).not.toHaveBeenCalled();
  });
});
