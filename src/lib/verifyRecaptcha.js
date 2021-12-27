const axios = require("axios");

async function verifyRecaptcha(captchaValue) {
  try {
    const { data } = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.GOOGLE_CAPTCHA_SECRET}&response=${captchaValue}`,
      {},
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
      },
    );
    return data.success;
  } catch (error) {
    throw new Error(error);
  }
}

module.exports = verifyRecaptcha;
