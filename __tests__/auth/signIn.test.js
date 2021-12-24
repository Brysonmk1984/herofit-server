const request = require("supertest");
const app = require("../../index.js");

// LOGIN ROUTE - ACCESSED THROUGH "SIGN IN" SCREEN ON MOBILE APP
describe("POST /auth/login", () => {
  it("respond with json", (done) => {
    request(app)
      .post("/auth/login")

      .send({
        email: process.env.TEST_SIGN_IN_EMAIL,
        password: process.env.TEST_SIGN_IN_PASSWORD,
      })
      .set("Accept", "application/json")
      .expect(200)
      .then((response) => {
        const { email } = response.body.data.user;
        expect(email).toBe(process.env.TEST_SIGN_IN_EMAIL);
        done();
      })
      .catch((err) => done(err));
  });
});
