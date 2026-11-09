module.exports = {
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.test.json',
      },
    },
    testMatch: ["**/__tests__/unit/**/*.spec.ts"],
    transform: {
      '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    setupFiles: ['./jestSetup.js'],
    coverageReporters: ['html', 'text', 'text-summary'],
    collectCoverage: false,
    collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**'],
  }