import { createDefaultPreset } from 'ts-jest';

/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  ...createDefaultPreset(),
  coveragePathIgnorePatterns: ['<rootDir>/node_modules'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};

export default config;
