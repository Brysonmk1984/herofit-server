/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  watchPathIgnorePatterns: ["node_modules"],
  setupFilesAfterEnv: ["<rootDir>__tests__/setup/nullOrAny.setup.ts", "jest-extended"],
  testPathIgnorePatterns: ["<rootDir>__tests__/setup", "<rootDir>__tests__/nonHookTests"],
  globals: {
    "ts-jest": {
      diagnostics: false,
    },
  },
};
