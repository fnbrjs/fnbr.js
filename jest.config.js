// eslint-disable-next-line import/no-extraneous-dependencies
const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset({ tsconfig: 'tsconfig.test.json' }).transform;

/** @type {import("jest").Config} * */
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '!**/tests/live/**',
  ],
  transform: {
    ...tsJestTransformCfg,
  },
};
