import { useState, type ReactNode } from 'react';
import { render, screen } from '../../../../setup/render-with-theme';
import userEvent from '@testing-library/user-event';
import { LanguagePicker } from '../../../../../presentation/features/settings/language-picker';
import type { Locale } from '../../../../../domain/user-settings';

function renderPicker(value: Locale, onChange = jest.fn(), disabled = false): void {
  render(
    <div>
      <span id="language-label">Language</span>
      <LanguagePicker
        value={value}
        onChange={onChange}
        disabled={disabled}
        labelledBy="language-label"
      />
    </div>,
  );
}

function ControlledLanguagePicker({
  initial,
  onChange,
}: {
  readonly initial: Locale;
  readonly onChange: (value: Locale) => void;
}): ReactNode {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <span id="language-label">Language</span>
      <LanguagePicker
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        labelledBy="language-label"
      />
    </div>
  );
}

describe('LanguagePicker', () => {
  it('renders a radiogroup with native names and the system option', () => {
    renderPicker('system');

    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Español (Spanish)' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'System (browser)' })).toBeChecked();
  });

  it('omits the translated name when it matches the native one', () => {
    renderPicker('en');

    expect(screen.getByRole('radio', { name: 'English' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'English (English)' })).not.toBeInTheDocument();
  });

  it('marks the selected option with aria-checked and a visible check', () => {
    renderPicker('es');

    expect(screen.getByRole('radio', { name: 'Español (Spanish)' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByTestId('language-option-check-es')).toBeInTheDocument();
    expect(screen.queryByTestId('language-option-check-en')).not.toBeInTheDocument();
  });

  it('renders decorative flags with empty alt text', () => {
    renderPicker('system');

    const spanishFlag = screen.getByTestId('language-flag-es');
    expect(spanishFlag).toHaveAttribute('src', '/brand/flags/es.svg');
    expect(spanishFlag).toHaveAttribute('alt', '');
    expect(spanishFlag).toHaveAttribute('aria-hidden', 'true');

    const englishFlag = screen.getByTestId('language-flag-en');
    expect(englishFlag).toHaveAttribute('src', '/brand/flags/en.svg');
    expect(englishFlag).toHaveAttribute('alt', '');
    expect(englishFlag).toHaveAttribute('aria-hidden', 'true');

    expect(screen.queryByTestId('language-flag-system')).not.toBeInTheDocument();
  });

  it('calls onChange when a different language is clicked', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderPicker('system', onChange);

    await user.click(screen.getByRole('radio', { name: 'Español (Spanish)' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('es');
  });

  it('does not call onChange when the selected language is clicked again', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderPicker('en', onChange);

    await user.click(screen.getByRole('radio', { name: 'English' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('moves focus and selection with arrow keys, Home and End', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<ControlledLanguagePicker initial="system" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'System (browser)' }));

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Español (Spanish)' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('es');

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: 'System (browser)' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('system');

    await user.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Español (Spanish)' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('es');

    await user.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'System (browser)' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('system');
  });

  it('disables every option and removes the group from the tab order', async () => {
    const user = userEvent.setup();
    renderPicker('system', jest.fn(), true);

    expect(screen.getByRole('radio', { name: 'Español (Spanish)' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'English' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'System (browser)' })).toBeDisabled();

    await user.tab();
    expect(screen.getByRole('radio', { name: 'System (browser)' })).not.toHaveFocus();
  });
});
