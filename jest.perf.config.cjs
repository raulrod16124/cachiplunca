/** @type {import('jest').Config} */
const base = require('./jest.config.cjs');

// Performance baseline suite (TASK-113). Same toolchain as the main suite but
// scoped to `src/test/perf`, excluded from `npm test`, and given a longer
// timeout because it mounts boards with up to 10.000 elements.
module.exports = {
  ...base,
  displayName: 'perf',
  roots: ['<rootDir>/src/test/perf'],
  testPathIgnorePatterns: [],
  testMatch: ['**/*.perf.test.ts', '**/*.perf.test.tsx'],
  testTimeout: 120000,
};
