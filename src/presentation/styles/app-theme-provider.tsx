import type { ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { appTheme } from './theme';
import { GlobalStyles } from './global-styles';

export interface AppThemeProviderProps {
  readonly children: ReactNode;
}

/**
 * Makes the application design tokens available to every styled-component
 * through `props.theme`. Rendered once at the app root; tests provide it via
 * the shared `@testing-library/react` render wrapper.
 */
export function AppThemeProvider({ children }: AppThemeProviderProps): ReactNode {
  return (
    <ThemeProvider theme={appTheme}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  );
}
