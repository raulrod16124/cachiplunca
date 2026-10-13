import { render, screen } from '@testing-library/react';
import { useTheme } from 'styled-components';
import { AppThemeProvider, appTheme } from '../../../../presentation/styles';

function ThemeProbe() {
  const theme = useTheme();

  return <span data-testid="theme-probe">{theme.color.text.primary}</span>;
}

describe('AppThemeProvider', () => {
  it('exposes the application tokens to descendants', () => {
    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>,
    );

    expect(screen.getByTestId('theme-probe')).toHaveTextContent(appTheme.color.text.primary);
  });
});
