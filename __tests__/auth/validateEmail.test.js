const request = require("supertest");
const app = require("../../index.js");
const { User } = require("../../config/db");
const { doneAfterTimeout } = require("../setup/utilityFunctions.setup");

// VALIDATE EMAIL (trigger by user hitting website, which then does a POST sending emailCode )
describe("POST /auth/resend-email-confirmation", () => {
  it("Should do something", done => {
    expect(true).toBe(true);
    doneAfterTimeout(done);
  });
});
