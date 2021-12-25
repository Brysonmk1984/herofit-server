const request = require("supertest");
const app = require("../../index.js");
const { User } = require("../../config/db");
const { doneAfterTimeout } = require("../setup/utilityFunctions.setup");

// FORGOT PASSWORD ROUTES - ACCESSED THROUGH "FORGOT PASSWORD" SCREEN ON MOBILE APP

// RESET PASSWORD CONFIRMATION EMAIL
describe("POST /auth/reset-password-confirm-email", () => {
  it("Should do something", done => {
    expect(true).toBe(true);
    doneAfterTimeout(done);
  });
});

// RESET PASSWORD
describe("POST /auth/reset-password", () => {
  it("Should do something", done => {
    expect(true).toBe(true);
    doneAfterTimeout(done);
  });
});

// RESEND EMAIL CONFIRMATION
describe("POST /auth/resend-email-confirmation", () => {
  it("Should do something", done => {
    expect(true).toBe(true);
    doneAfterTimeout(done);
  });
});
