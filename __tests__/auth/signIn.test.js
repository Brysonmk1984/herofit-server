const request = require("supertest");
const app = require("../../index.js");

function doneAfterTimeout(done, timeout = 1000) {
  setTimeout(() => done(), timeout);
}

// LOGIN ROUTE - ACCESSED THROUGH "SIGN IN" SCREEN ON MOBILE APP
describe("POST /auth/login", () => {
  it("should respond with a user object, where all properties are the correct type and email matches the passed in email", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({
        email: process.env.TEST_SIGN_IN_EMAIL,
        password: process.env.TEST_SIGN_IN_PASSWORD,
      })
      .set("Accept", "application/json")
      .expect(200);

    const { email } = response.body.data.user;
    expect(email).toBe(process.env.TEST_SIGN_IN_EMAIL);
    expect(response.body.data.user).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        createdAt: expect.any(String),
        username: expect.any(String),
        email: expect.any(String),
        firstName: expect.nullOrAny(String),
        lastName: expect.nullOrAny(String),
        isFake: expect.any(Boolean),
        latestActivityUpdate: expect.nullOrAny(String),
        stravaAccessToken: expect.nullOrAny(String),
        stravaAccessTokenExpiration: expect.nullOrAny(Number),
        stravaRefreshToken: expect.nullOrAny(String),
        featurePreferenceSubmitted: expect.any(Boolean),
        seenLatestPatch: expect.any(Boolean),
        hash: expect.any(String),
        salt: expect.any(String),
        active: expect.any(Boolean),
        emailCode: expect.nullOrAny(String),
        dataSrcId: expect.nullOrAny(String),
        emailMarketingOptIn: expect.any(Boolean),
        foundOutBy: expect.nullOrAny(String),
        isMetric: expect.any(Boolean),
        referredBy: expect.nullOrAny(String),
        updatedAt: expect.any(String),
      }),
    );
  });

  it("respond with json", done => {
    request(app)
      .post("/auth/login")
      .send({
        email: "wrong@email.com",
      })
      .set("Accept", "application/json")
      .expect(400)
      .expect(res => {
        const errorMessage = res.body.error[0].msg;
        const errorParam = res.body.error[0].param;
        expect(errorMessage).toBe("Invalid value");
        expect(errorParam).toBe("password");
      })
      .end((err, res) => {
        if (err) {
          return doneAfterTimeout(() => done(err));
        }
        doneAfterTimeout(done);
      });
  });

  it("respond with json", done => {
    request(app)
      .post("/auth/login")
      .send({
        email: "wrong@email.com",
        password: "212password",
      })
      .set("Accept", "application/json")
      .expect(401)
      .expect(res => {
        expect(res.body.error).toBe("Couldn't find a user with that email.");
      })
      .end((err, res) => {
        if (err) {
          return doneAfterTimeout(() => done(err));
        }
        doneAfterTimeout(done);
      });
  });
});
