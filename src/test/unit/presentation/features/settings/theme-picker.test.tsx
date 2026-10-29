import { useState, type ReactNode } from 'react';
import { render, screen } from '../../../../setup/render-with-theme';
import userEvent from '@testing-library/user-event';
import { ThemePicker } from '../../../../../presentation/features/settings/theme-picker';
import type { ThemeMode } from '../../../../../domain/user-settings';

function renderPicker(value: ThemeMode, onChange = jest.fn(), disabled = false): void {
  render(
    <div>
      <span id="theme-label">Theme</span>
      <ThemePicker value={value} onChange={onChange} disabled={disabled} labelledBy="theme-label" />
    </div>,
  );
}

function ControlledThemePicker({
  initial,
  onChange,
}: {
  readonly initial: ThemeMode;
  readonly onChange: (value: ThemeMode) => void;
}): ReactNode {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <span id="theme-label">Theme</span>
      <ThemePicker
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        labelledBy="theme-label"
      />
    </div>
  );
}

describe('ThemePicker', () => {
  it('renders a radiogroup with the three visual options', () => {
    renderPicker('light');

    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dark' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'System' })).not.toBeChecked();
  });

  it('marks the selected option with aria-checked and a visible check', () => {
    renderPicker('dark');

    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('theme-option-check-dark')).toBeInTheDocument();
    expect(screen.queryByTestId('theme-option-check-light')).not.toBeInTheDocument();
  });

  it('uses roving tabindex so only the selected option is tabbable', () => {
    renderPicker('system');

    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('tabindex', '-1');
  });

  it('calls onChange when a different option is clicked', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderPicker('light', onChange);

    await user.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('dark');
  });

  it('does not call onChange when the selected option is clicked again', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderPicker('light', onChange);

    await user.click(screen.getByRole('radio', { name: 'Light' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('moves focus and selection with arrow keys, Home and End', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<ControlledThemePicker initial="system" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'System' }));

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('light');

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'System' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('system');

    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('light');

    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'System' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('system');
  });

  it('disables every option and removes the group from the tab order', async () => {
    const user = userEvent.setup();
    renderPicker('light', jest.fn(), true);

    expect(screen.getByRole('radio', { name: 'Light' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'System' })).toBeDisabled();

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Light' })).not.toHaveFocus();
  });

  it('keeps the theme previews decorative', () => {
    renderPicker('light');

    for (const value of ['light', 'dark', 'system'] as const) {
      const preview = screen
        .getByTestId(`theme-option-${value}`)
        .querySelector(`[data-preview="${value}"]`);
      expect(preview).not.toBeNull();
      expect(preview).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
