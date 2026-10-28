---
name: cachiplunca-ui
description: Use when changing Cachiplunca presentation code, including React components, canvas interactions, @raulrod/ui primitives, design tokens, i18n, accessibility, themes, narrow layouts and visual tests.
compatibility: opencode
---

# Cachiplunca UI

## Before changing UI

- Read the nearest component, hook and test.
- Reuse `@raulrod/ui` primitives before creating a new component.
- Use tokens `--rr-*` and `--cach-*`; never hardcode colors.
- Keep domain logic outside generic UI components.
- Do not modify `@raulrod/ui`, `@raulrod/tokens` or `node_modules`.

## Components

- Keep a single responsibility per component.
- Prefer composition over many boolean props.
- Keep state as local as possible.
- Derive values during render instead of storing redundant derived state.
- Use effects only to synchronise with external systems.
- Avoid `useMemo`, `useCallback` and `React.memo` unless they solve a measured
  performance or referential-equality problem.
- Use `IconButton` and `ToolbarButton` with a mandatory `label`.

## i18n

- Every visible string goes through `t()`.
- Add keys to both `en` and `es` in `src/presentation/i18n/messages.ts`.
- `TranslationKey` derives from `en`; keep parity.
- Do not leave literals in `aria-label`, `title`, `placeholder`, `alt` or visible
  JSX.
- Review interpolation and plurals in both languages.

## Accessibility

- Semantic HTML before ARIA.
- Every action must be reachable by keyboard.
- Every control needs an accessible name.
- Preserve visible focus with `:focus-visible`.
- Do not use color as the only state signal.
- Keep focus stable when closing dialogs, popovers and menus.
- Respect `prefers-reduced-motion` and `data-reduced-motion`.
- Announce relevant async state with `aria-live` when it adds value.
- Check contrast in light and dark themes; soft text must still meet AA.

## Themes and layout

- Check light and dark themes for every visual change.
- Check narrow layouts when the component can appear in the app shell.
- Use existing brand overrides and semantic tokens.
- Do not change the global meaning of a token to fix a local case.
- Keep decorative icons `aria-hidden`.

## Canvas

- Keep pure geometry and hit testing in application services.
- Preserve existing `data-testid` values and accessible names unless the card
  requires a change.
- Cover the positive and negative case for gestures: move/no move, rotate/no
  rotate, drop/no drop, paste/no paste.
- Avoid re-renders while panning, zooming, moving or rotating.
- Clean up global listeners.
- Verify that read-only and guest modes cannot trigger edit actions.

## Testing

- Component tests verify visible behaviour: label, button, state, gesture.
- Integration tests cover the user journey with fakes.
- Add or update Playwright e2e when a real flow changes.
- Update visual baselines only when the change is intentional and reviewed.
- Use `npm test` for the component/integration layer and `npm run test:e2e`
  for the real flow.

## Guardrails

- Do not copy mockups literally; follow the design language and tokens.
- Do not add a new dependency without justification.
- Do not introduce a new abstraction before a second real need exists.
- Do not weaken accessibility or keyboard behaviour to simplify a layout.
