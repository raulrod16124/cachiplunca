/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/test/rules'],
  testMatch: ['**/*.rules.test.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  // Keep the Firebase SDK and @firebase/* as-is; only transpile @raulrod/* and the test sources.
  transformIgnorePatterns: ['/node_modules/(?!(@raulrod)/)'],
  testTimeout: 30000,
};
