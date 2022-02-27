import express from "express";
import { BasicUserContactInfo, TypedRequestBody } from "../types/BackendOnlyTypes";
import { body, validationResult } from "express-validator";
import { sendDataCollectionEmail, sendContactEmail, sendAppErrorEmail } from "../mail";
import { User } from "../config/db";
import { authenticateJWT } from "../jwt/validateJWT";
const router = express.Router();

interface FeedbackDataBody {
  email: string;
  username: string;
  title: string;
  accountInfo: BasicUserContactInfo;
  opinion: string;
  openResponse: string;
}
// Submit Marketing Modal form data to info@herofit.io email address - Web only right now
router.post("/feedback-data", body("email").isEmail(), body("username").isString(), body("title").isString(), body("accountInfo").isObject().optional({ checkFalsy: true }), body("opinion").isString(), body("openResponse").isString(), authenticateJWT, async (req: TypedRequestBody<FeedbackDataBody>, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /feedback-data endpoint");
  }

  const { email, username, title, accountInfo, opinion, openResponse } = req.body;

  try {
    // Send feedback data to info@herofit.io
    await sendDataCollectionEmail({ username, title, opinion, openResponse, accountInfo: accountInfo || "User not logged in." });
    // Set featurePreferenceSubmitted to true in DB for user
    await User.update({ featurePreferenceSubmitted: true }, { where: { email } });

    res.formatter.ok({ data: "Feedback form submitted" });
  } catch (error) {
    res.formatter.serverError(error, `Email could not be sent ${email} - /feedback-data endpoint`);
  }
});

interface ContactFormBody {
  email: string;
  feedbackType?: string;
  message: string;
  accountInfo?: BasicUserContactInfo;
}
// feedbackType is optional - Only the native app is sending this property, not the web app
router.post("/contact-form", body("email").isEmail(), body("feedbackType").isString().optional({ checkFalsy: true }), body("message").isString(), body("accountInfo").isObject().optional({ checkFalsy: true }), async (req: TypedRequestBody<ContactFormBody>, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /contact-form'");
  }

  try {
    const { email, message, feedbackType, accountInfo } = req.body;
    const data = await sendContactEmail({ email, message, feedbackType, accountInfo: accountInfo || "User not logged in." });
    res.formatter.ok(data);
  } catch (error) {
    res.formatter.serverError(error, `Email could not be sent - /contact-form endpoint`);
  }
});

interface AppErrorBody {
  status: number;
  message: string;
  debug?: any[];
  version: string;
  accountInfo?: BasicUserContactInfo;
  meta?: string;
}
// Works for 50x, 40x, and 999 errors... should be everything
router.post("/app-error", body("status").isNumeric(), body("message").isString(), body("debug").isArray().optional({ checkFalsy: true }), body("version").isString(), body("accountInfo").isObject().optional({ checkFalsy: true }), body("meta").isString().optional({ checkFalsy: true }), async (req: TypedRequestBody<AppErrorBody>, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.formatter.badRequest(errors.array(), "Validation Error - for /app-error");
  }
  const { status, message, debug, version, accountInfo, meta } = req.body;

  try {
    await sendAppErrorEmail({
      status,
      message,
      debug,
      version,
      meta,
      accountInfo,
    });
    res.formatter.ok(null);
  } catch (error) {
    console.log("Error sending App Error Email - ", error);
    res.formatter.serverError(error, `Email could not be sent - /app-error endpoint`);
  }
});

module.exports = router;
