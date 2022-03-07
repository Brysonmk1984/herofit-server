import request from "supertest";
import app from "../../src/index";
import { loadDb } from "../setup/databaseForTests.setup";

const db = loadDb();
const { User } = db.models;

// REGISTER ROUTE - ACCESSED THROUGH "SIGN IN" SCREEN ON MOBILE APP
describe("POST /auth/register", () => {
  it("Should fail to register user because email already exists", done => {
    request(app)
      .post("/auth/register")
      .send({
        email: process.env.TEST_SIGN_IN_EMAIL,
        password: "anyOldPassword",
        username: "wowow",
        firstName: "test",
        emailMarketingOptIn: false,
        isMetric: true,
        foundOutBy: "Reddit",
        referredBy: null,
      })
      .set("Accept", "application/json")
      .expect(400)
      .expect(res => {
        expect(res.body.error).toBe("That email is already in use. Have you already registered? Try logging in instead.");
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        done();
      });
  });

  it("Should fail to register user because missing username", done => {
    request(app)
      .post("/auth/register")
      .send({
        email: process.env.TEST_REGISTER_EMAIL,
        password: process.env.TEST_REGISTER_PASSWORD,
        firstName: "test",
        emailMarketingOptIn: false,
        isMetric: true,
        foundOutBy: null,
        referredBy: null,
      })
      .set("Accept", "application/json")
      .expect(400)
      .expect(res => {
        const errorMessage = res.body.error[0].msg;
        const errorParam = res.body.error[0].param;
        expect(errorMessage).toBe("Invalid value");
        expect(errorParam).toBe("username");
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        done();
      });
  });

  it("Should register the user", done => {
    request(app)
      .post("/auth/register")
      .send({
        email: process.env.TEST_REGISTER_EMAIL,
        password: process.env.TEST_REGISTER_PASSWORD,
        username: "testregisterguy",
        firstName: "test",
        emailMarketingOptIn: false,
        isMetric: true,
        foundOutBy: "Reddit",
        referredBy: null,
      })
      .set("Accept", "application/json")
      .expect(200)
      .expect(res => {
        const user = res.body.data.user;
        expect(user.email).toBe(process.env.TEST_REGISTER_EMAIL);
        expect(user).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            createdAt: expect.any(String),
            username: expect.any(String),
            email: expect.any(String),
            firstName: expect.nullOrAny(String),
            lastName: null,
            isFake: false,
            latestActivityUpdate: expect.nullOrAny(String),
            stravaAccessToken: null,
            stravaAccessTokenExpiration: null,
            stravaRefreshToken: null,
            featurePreferenceSubmitted: true,
            seenLatestPatch: expect.any(Boolean),
            hash: expect.any(String),
            salt: expect.any(String),
            active: expect.any(Boolean),
            emailCode: expect.nullOrAny(String),
            dataSrcId: null,
            emailMarketingOptIn: expect.any(Boolean),
            foundOutBy: expect.nullOrAny(String),
            isMetric: expect.any(Boolean),
            referredBy: expect.nullOrAny(String),
            updatedAt: expect.any(String),
          }),
        );
      })
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        done();
      });
  });
});

afterAll(async () => {
  // Remove added items
  await User.destroy({ where: { email: process.env.TEST_REGISTER_EMAIL } });

  // closeDB
  await db.close();
});
