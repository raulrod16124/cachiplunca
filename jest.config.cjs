/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/src/test/**/*.test.ts', '**/src/test/**/*.test.tsx'],
  setupFilesAfterEnv: [
    // Must run before test modules import react-router (needs TextEncoder).
    '<rootDir>/jest.setup.cjs',
    '<rootDir>/src/test/setup/jest-dom.ts',
  ],
  // @raulrod/* is ESM-only (exports with an "import" condition only), which the
  // CJS Jest resolver cannot see; map to the files and transpile them instead.
  moduleNameMapper: {
    '^@raulrod/ui$': '<rootDir>/node_modules/@raulrod/ui/dist/index.js',
    '^@raulrod/icons$': '<rootDir>/node_modules/@raulrod/icons/dist/index.js',
    '^@raulrod/tokens$': '<rootDir>/node_modules/@raulrod/tokens/dist/index.js',
  },
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  // Transpile the @raulrod/* ESM packages; keep every other dependency as-is.
  transformIgnorePatterns: ['/node_modules/(?!(@raulrod)/)'],
};
