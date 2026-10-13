/**
 * `@testing-library/react-real` is a Jest alias (see `jest.config.cjs`) pointing
 * at the real package, so the shared render wrapper can re-export it without
 * resolving back through the `@testing-library/react` alias (infinite loop).
 * TypeScript resolves the value import through this declaration.
 */
declare module '@testing-library/react-real' {
  export * from '@testing-library/react';
}
