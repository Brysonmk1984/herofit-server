const request = require("supertest");
const app = require("../../index.js");
const { User } = require("../../config/db");

// VALIDATE EMAIL (trigger by user hitting website, which then does a POST sending emailCode )
describe("POST /auth/validated-email", () => {
  beforeAll(async () => {
    await User.update({ active: false }, { where: { emailCode: process.env.TEST_EMAIL_CODE } });
  });

  // Testing if User gets correctly updated from hitting the validated-email endpoint
  it("Should return user data containing active: true and emailCode matching passed in emailCode", async () => {
    const response = await request(app)
      .post("/auth/validated-email")
      .send({
        emailCode: process.env.TEST_EMAIL_CODE,
      })
      .set("Accept", "application/json")
      .expect(200);

    expect(response.body.data.user).toEqual(
      expect.objectContaining({
        active: true,
        emailCode: process.env.TEST_EMAIL_CODE,
      }),
    );
  });

  // Testing if no matching emailCode when hitting the validated-email endpoint
  it("Should return a 400 error", async () => {
    const response = await request(app)
      .post("/auth/validated-email")
      .send({
        emailCode: "123thiswontmatch",
      })
      .set("Accept", "application/json")
      .expect(400);
  });

  // Testing if user forgot to send emailCode
  it("Should return a 400 error", async () => {
    const response = await request(app)
      .post("/auth/validated-email")
      .send({})
      .set("Accept", "application/json")
      .expect(400)
      .expect(res => {
        const { msg, param } = res.body.error[0];
        expect(msg).toBe("Invalid value");
        expect(param).toBe("emailCode");
      });
  });
});
