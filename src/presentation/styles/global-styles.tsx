import type { ReactElement } from 'react';
import { token } from './tokens';

/**
 * Global user-preference rules, injected once at the app root.
 *
 * High-contrast (`prefers-contrast: more`, WCAG 1.4.6 intent): promote subtle
 * boundaries and secondary text to their strong roles. Remapping the token
 * custom properties on `:root` covers the app and `@raulrod/ui` in one place,
 * keeping every paint within the authorized pairs.
 */
const GLOBAL_PREFERENCES = `
@media (prefers-contrast: more) {
  :root {
    --rr-color-border-default: ${token('color.border.strong')};
    --rr-color-text-muted: ${token('color.text.primary')};
  }
}
`;

export function GlobalStyles(): ReactElement {
  return (
    <style href="rr-global-preferences" precedence="default">
      {GLOBAL_PREFERENCES}
    </style>
  );
}
