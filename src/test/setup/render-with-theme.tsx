import type { JSXElementConstructor, ReactElement, ReactNode } from 'react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import * as rtl from '@testing-library/react-real';
import { AppThemeProvider } from '../../presentation/styles';

/**
 * Re-export of `@testing-library/react` for the whole test suite
 * (`jest.config.cjs` maps the package name here) that renders every subject
 * inside `AppThemeProvider`, so styled-components resolve `props.theme`
 * without each test having to set it up manually.
 */
export * from '@testing-library/react-real';

type Wrapper = JSXElementConstructor<{ readonly children: ReactNode }>;

function ThemeWrapper({ children }: { readonly children: ReactNode }): ReactElement {
  return <AppThemeProvider>{children}</AppThemeProvider>;
}

function composeWrappers(outer: Wrapper, inner: Wrapper | undefined): Wrapper {
  if (inner === undefined) {
    return outer;
  }

  const Outer = outer;
  const Inner = inner;

  return function ComposedWrapper({ children }: { readonly children: ReactNode }): ReactElement {
    return (
      <Outer>
        <Inner>{children}</Inner>
      </Outer>
    );
  };
}

export function render(ui: ReactElement, options?: RenderOptions): RenderResult {
  const { wrapper, ...rest } = options ?? {};

  return rtl.render(ui, { ...rest, wrapper: composeWrappers(ThemeWrapper, wrapper) });
}
