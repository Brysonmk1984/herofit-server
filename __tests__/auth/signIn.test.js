const request = require("supertest");
const app = require("../../src/index.ts");
const { doneAfterTimeout } = require("../setup/utilityFunctions.setup");
const { loadDb, closeDb } = require("../setup/databaseForTests.setup.js");

// beforeAll(async () => {
//   await loadDb();
// });

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
    console.log("VAL", response.body.data.user);
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

  it("Should respond with 400 and an error indicating the password is wrong", done => {
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

  it("Should respond with 401 and an error indicating we couldn't find a user with that email", done => {
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

// afterAll(async () => {
//   await closeDb();
// });
