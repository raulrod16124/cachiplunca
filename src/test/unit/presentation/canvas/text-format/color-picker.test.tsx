import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorPicker } from '../../../../../presentation/canvas/text-format/color-picker';

describe('ColorPicker', () => {
  it('renders the main button with the label', () => {
    render(
      <ColorPicker label="Font color" color="#ff0000" defaultColor="#000000" onPick={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Font color' })).toBeInTheDocument();
  });

  it('has a dropdown trigger next to the main button', () => {
    render(
      <ColorPicker
        label="Font color"
        color={undefined}
        defaultColor="#000000"
        onPick={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Font color options' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('applies the default color from the main button', async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();

    render(
      <ColorPicker label="Font color" color={undefined} defaultColor="#000000" onPick={onPick} />,
    );

    await user.click(screen.getByRole('button', { name: 'Font color' }));

    expect(onPick).toHaveBeenCalledWith('#000000');
  });

  it('applies the current color from the main button', async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();

    render(
      <ColorPicker label="Font color" color="#ff0000" defaultColor="#000000" onPick={onPick} />,
    );

    await user.click(screen.getByRole('button', { name: 'Font color' }));

    expect(onPick).toHaveBeenCalledWith('#ff0000');
  });

  it('opens the options panel', async () => {
    const user = userEvent.setup();

    render(
      <ColorPicker
        label="Font color"
        color={undefined}
        defaultColor="#000000"
        onPick={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Font color options' }));

    expect(screen.getByRole('listbox', { name: 'Font color options' })).toBeInTheDocument();
  });

  it('picks a theme swatch and closes the panel', async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();

    render(
      <ColorPicker
        label="Font color"
        color={undefined}
        defaultColor="#000000"
        onPick={onPick}
        swatches={['#111111', '#222222']}
        standardColors={['#aaaaaa']}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Font color options' }));
    await user.click(screen.getByRole('button', { name: 'Theme color #111111' }));

    expect(onPick).toHaveBeenCalledWith('#111111');
    expect(screen.queryByRole('listbox', { name: 'Font color options' })).toBeNull();
  });

  it('picks a standard color', async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();

    render(
      <ColorPicker
        label="Font color"
        color={undefined}
        defaultColor="#000000"
        onPick={onPick}
        swatches={[]}
        standardColors={['#aaaaaa']}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Font color options' }));
    await user.click(screen.getByRole('button', { name: 'Standard color #aaaaaa' }));

    expect(onPick).toHaveBeenCalledWith('#aaaaaa');
  });

  it('clears the color from the Automatic option', async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();

    render(
      <ColorPicker label="Font color" color="#ff0000" defaultColor="#000000" onPick={onPick} />,
    );

    await user.click(screen.getByRole('button', { name: 'Font color options' }));
    await user.click(screen.getByRole('button', { name: 'Automatic' }));

    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('picks a custom color from the more colors input', async () => {
    const user = userEvent.setup();
    const onPick = jest.fn();

    render(
      <ColorPicker label="Font color" color="#000000" defaultColor="#000000" onPick={onPick} />,
    );

    await user.click(screen.getByRole('button', { name: 'Font color options' }));
    fireEvent.change(screen.getByLabelText('More colors'), { target: { value: '#123456' } });

    expect(onPick).toHaveBeenCalledWith('#123456');
  });
});
