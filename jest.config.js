/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  watchPathIgnorePatterns: ["node_modules"],
  setupFilesAfterEnv: ["<rootDir>__tests__/setup/nullOrAny.setup.js", "jest-extended"],
  testPathIgnorePatterns: ["<rootDir>__tests__/setup", "<rootDir>__tests__/activityTraits", "<rootDir>__tests__/itemFind", "<rootDir>__tests__/itemRewards"],
  testMatch: ["<rootDir>/__tests__/**/*.test.js", "<rootDir>/__tests__/**/*.test.ts"],
  globals: {
    "ts-jest": {
      diagnostics: {
        warnOnly: true,
      },
    },
  },
  // This causes a weird error in the tests
  //automock: true,
};
