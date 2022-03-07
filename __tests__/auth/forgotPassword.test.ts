import request from "supertest";
import app from "../../src/index";
import { loadDb } from "../setup/databaseForTests.setup";

const db = loadDb();
const { User } = db.models;

// FORGOT PASSWORD ROUTES - ACCESSED THROUGH "FORGOT PASSWORD" SCREEN ON MOBILE APP
//Set emailCode for test email in case it's missing
beforeAll(async () => {
  await User.update({ emailCode: process.env.TEST_EMAIL_CODE }, { where: { email: process.env.TEST_FORGOT_PASSWORD_EMAIL } });
});

describe("POST /auth/resend-email-confirmation", () => {
  // RESEND CODE, emailCode PASSED
  it("Should resend email confirmation where the emailCode matches TEST_EMAIL_CODE", async () => {
    const response = await request(app)
      .post("/auth/resend-email-confirmation")
      .send({
        email: process.env.TEST_FORGOT_PASSWORD_EMAIL,
        emailCode: process.env.TEST_EMAIL_CODE,
        isMobileApp: true,
      })
      .set("Accept", "application/json")
      .expect(200)
      .expect(res => {
        const { emailCode } = res.body.data;

        // deep equal needed for some reason?
        expect(emailCode).toBe(process.env.TEST_EMAIL_CODE);
      });
  });

  // RESEND CODE, NO emailCode PASSED
  it("Should resend email confirmation after database updates with newly generated emailCode, since one isn't being passed in here", async () => {
    const response = await request(app)
      .post("/auth/resend-email-confirmation")
      .send({
        email: process.env.TEST_FORGOT_PASSWORD_EMAIL,
        isMobileApp: true,
      })
      .set("Accept", "application/json")
      .expect(200)
      .expect(res => {
        const { emailCode } = res.body.data;

        // deep equal needed for some reason?
        expect(emailCode).toStrictEqual(expect.any(String));
      });
  });

  //FAILED TO SEND EMAIL IN PARAMETERS
  it("Should return 400 error since required parameter wasn't sent", async () => {
    const response = await request(app)
      .post("/auth/resend-email-confirmation")
      .send({
        isMobileApp: true,
      })
      .set("Accept", "application/json")
      .expect(400);
  });

  //NO MATCHING EMAIL
  it("Should return 400 and include an error that email didnt match anything in DB", async () => {
    const response = await request(app)
      .post("/auth/resend-email-confirmation")
      .send({
        email: "fake@fake1.com",
        isMobileApp: true,
      })
      .set("Accept", "application/json")
      .expect(400)
      .expect(res => {
        expect(res.body.error).toBe("Error: No Matching Email");
      });
  });
});
// RESET PASSWORD CONFIRMATION EMAIL

describe("POST /auth/reset-password-confirm-email", () => {
  it("Should send reset password email and return result", async () => {
    const response = await request(app)
      .post("/auth/reset-password-confirm-email")
      .send({
        email: process.env.TEST_FORGOT_PASSWORD_EMAIL,
        isMobileApp: true,
      })
      .set("Accept", "application/json")
      .expect(200)
      .expect(res => {
        const { response } = res.body.data.result;
        expect(response).toContain("250");
      });
  });

  it("Should send reset password email and return result", async () => {
    const response = await request(app).post("/auth/reset-password-confirm-email").send({}).set("Accept", "application/json").expect(400);
    const { msg, param } = response.body.error[0];
    expect(msg).toBe("Invalid value");
    expect(param).toBe("email");
  });
});

// RESET PASSWORD
describe("POST /auth/reset-password", () => {
  it("Should reset the password of the passed in email to the passed in password", async () => {
    request(app)
      .post("/auth/reset-password")
      .send({
        email: process.env.TEST_FORGOT_PASSWORD_EMAIL,
        token: process.env.TEST_RESET_PASSWORD_TOKEN,
        password: "123password",
      })
      .set("Accept", "application/json")
      .expect(200);
  });

  it("Should respond with 400 error since password was left out", async () => {
    const response = await request(app)
      .post("/auth/reset-password")
      .send({
        email: process.env.TEST_FORGOT_PASSWORD_EMAIL,
        token: process.env.TEST_RESET_PASSWORD_TOKEN,
      })
      .set("Accept", "application/json")
      .expect(400);

    const { msg, param } = response.body.error[0];
    expect(msg).toBe("Invalid value");
    expect(param).toBe("password");
  });
});

// Need to reset the local password back to original for test email account
afterAll(async () => {
  const response = await request(app)
    .post("/auth/reset-password")
    .send({
      email: process.env.TEST_FORGOT_PASSWORD_EMAIL,
      token: process.env.TEST_RESET_PASSWORD_TOKEN,
      password: process.env.TEST_RESET_PASSWORD_ORIGINAL_PASSWORD,
    })
    .set("Accept", "application/json")
    .expect(200);
});
