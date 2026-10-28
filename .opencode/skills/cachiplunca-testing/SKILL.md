---
name: cachiplunca-testing
description: Use when writing, updating or reviewing Cachiplunca tests. Covers unit, contract, integration, Firestore/Storage rules, Playwright e2e and performance suites, fakes, Jest configuration quirks and the required commands.
compatibility: opencode
---

# Cachiplunca testing

## Test placement

| Suite       | Location                    | Purpose                                                               |
| ----------- | --------------------------- | --------------------------------------------------------------------- |
| Unit        | `src/test/unit/<layer>/...` | Domain invariants, pure application services, presentation components |
| Contract    | `src/test/contract/...`     | Port behaviour shared by fakes and Firebase adapters                  |
| Integration | `src/test/integration/...`  | UI journeys with in-memory fakes                                      |
| Rules       | `src/test/rules/...`        | Firestore and Storage rules against emulators                         |
| E2E         | `e2e/...`                   | Playwright journeys against Firebase emulators                        |
| Performance | `src/test/perf/...`         | Structural guards and absolute budgets                                |

Tests may also live next to domain code when the existing pattern already does
so. Follow the nearest existing test rather than inventing a new structure.

## Commands

```bash
npm test               # Jest + architecture gate
npm run test:rules     # Firestore/Storage rules with emulators
npm run test:e2e       # Playwright with emulators
npm run perf           # Performance budgets
npm run verify         # tsc + lint + format:check + tests
```

For a single Playwright spec, use the scoped form supported by the repository
scripts or `npx playwright test <spec>` when the emulators are already running.

## Test-first

1. Locate the existing tests for the affected files.
2. Write or update the failing test that describes the new behaviour.
3. Run it and confirm the failure is meaningful.
4. Implement the smallest change that makes it pass.
5. Run the nearest suite, then the required gates.

Do not write tests that merely mirror the implementation. Cover behaviour,
edge cases and regression scenarios.

## Fakes and fixtures

- Application tests use fakes from `src/test/fixtures`.
- Never use real Firebase in unit or integration tests.
- Infrastructure tests mock the Firebase SDK and verify calls and mapping.
- Contract tests ensure fakes and adapters share the same semantics.
- Keep fixtures focused and deterministic.

## Jest configuration quirks

- `@raulrod/*` is ESM-only; the Jest resolver maps it to `dist` and transpiles it.
- Tests import from `@testing-library/react` and receive a theme-wrapped render
  through `src/test/setup/render-with-theme.tsx`.
- `TextEncoder` is polyfilled in `jest.setup.cjs` for `react-router`.
- The architecture boundary test is part of `npm test`; never bypass it.

## Presentation tests

- Verify visible behaviour: label, button, state, gesture and accessible name.
- Cover the positive and negative case for gestures.
- Do not use snapshots for business logic.
- Preserve existing `data-testid` and accessible names unless the task requires
  changing them.
- Check light/dark and narrow layouts when the UI changes.

## Rules tests

- Run with `npm run test:rules`.
- Cover allowed and denied paths.
- Test owner, editor, viewer, non-member and unauthenticated actors when relevant.
- Update rules, indexes and tests in the same change.
- Never rely on the UI to enforce security.

## E2E tests

- Use helpers in `e2e/helpers`.
- Prefer a scoped spec when the change is local.
- Cover the real user flow and the permission boundary.
- Do not hide flakiness with retries.
- Update visual baselines only when the change is intentional and reviewed.

## Performance tests

- Run `npm run perf` when touching canvas rendering, element movement or large
  lists.
- Keep expensive work out of render paths.
- Do not add global listeners without cleanup.

## Guardrails

- Do not weaken or delete a failing test to make a gate pass.
- Do not add `any` or suppress type errors to satisfy tests.
- Do not use snapshots to replace assertions.
- Do not run Firebase against production.
- Do not modify `@raulrod/ui`, `@raulrod/tokens` or `node_modules`.
