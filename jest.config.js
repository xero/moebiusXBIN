// Jest configuration for MoebiusXBIN web testing
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/app/web'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/app/web/__tests__/e2e/',
    '/app/web/__tests__/fixtures/'
  ],
  setupFilesAfterEnv: ['<rootDir>/app/web/__tests__/setup/jest-setup.js'],
  collectCoverageFrom: [
    'app/web/**/*.js',
    '!app/web/**/*.test.js',
    '!app/web/**/*.spec.js',
    '!app/web/sw.js',
    '!app/web/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/app/web/$1'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(eventemitter3|idb)/)'
  ],
  testTimeout: 10000,
  verbose: true
};