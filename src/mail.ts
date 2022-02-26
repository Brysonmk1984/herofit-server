import nodemailer from "nodemailer";
import { BasicUserContactInfo, NodeEnvironments } from "./types/BackendOnlyTypes";
import { includesBasicUserInfo } from "./types/typeguards";

// Determines which email to send to, based on environment and whether or not it's coming from the mobile app
function determineVerificationUrl(env: NodeEnvironments, isMobileApp: boolean) {
  let environment = isMobileApp && env === "development" ? "app-development" : isMobileApp && env === "production" ? "app-production" : env;
  switch (environment) {
    case "production":
      return process.env.EMAIL_REDIRECT_PROD;
    case "staging":
      return process.env.EMAIL_REDIRECT_STAGING;
    case "development":
      return process.env.EMAIL_REDIRECT_DEV;
    case "app-production":
      return process.env.EMAIL_REDIRECT_APP;
    case "app-development":
      return process.env.EMAIL_REDIRECT_APP_DEV;
    default:
      return process.env.EMAIL_REDIRECT_PROD;
  }
}

// Determine if Emails should be sent to HeroFit inbox or ethereal mail
function determineTransporter(env: NodeEnvironments) {
  if (env === "development" || env === "test") {
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: "vhrks3qs5lf6x3rg@ethereal.email",
        pass: "1AAZg6Z86MYFBPPYwu",
      },
    });
  } else {
    return nodemailer.createTransport({
      host: "smtp.mailgun.org",
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_PROVIDER,
        pass: process.env.MAIL_PROVIDER_PASSWORD,
      },
    });
  }
}

// Create reusable transporter object using the default SMTP transport
const env = process.env.NODE_ENV as NodeEnvironments;
let transporter = determineTransporter(env);

interface ContactEmailFormData {
  email: string;
  username: string;
  firstName: string | null;
  feedbackType: string;
  message: string;
  accountInfo: BasicUserContactInfo | "User not logged in.";
}

// CONTACT FORM - A user sends a  message rom the 'Feedback' screen
const sendContactEmail = async function (formData: ContactEmailFormData) {
  try {
    const accountInfo = formData.accountInfo;
    const accountText = includesBasicUserInfo(accountInfo) ? `${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n` : "User Info Unavailable";

    // setup email data with unicode symbols
    let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: `HEROFIT - ${formData.email} submitted a form message.`,
      text: `Someone has a question or comment about HEROFIT, the message is as follows: \n \n ${formData.feedbackType}: \n\n ${formData.message} \n \n ACCOUNT DATA:\n ${accountText}`,
    };

    // send mail with defined transport object
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    throw error;
  }
};

interface DataCollectionFormData {
  opinion: string;
  openResponse: string;
  username: string;
  title: string;
  accountInfo: BasicUserContactInfo | "User not logged in.";
}

// MARKETING MODAL FEEDBACK -  from the Marketing Modal on the web version, not yet implemented on the app
const sendDataCollectionEmail = async function (formData: DataCollectionFormData) {
  try {
    const { opinion, openResponse, accountInfo } = formData;
    const accountText = includesBasicUserInfo(accountInfo) ? `${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n` : "User Info Unavailable";

    // setup email data with unicode symbols
    let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: "HEROFIT - A user submitted Feedback from the Marketing Modal!",
      text: `${formData.username} submitted the ${formData.title} \n \n OPINION - ${opinion} \n \n TEXT RESPONSE - ${openResponse} \n \n ACCOUNT DATA: ${accountText}`,
    };

    // send mail with defined transport object
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    throw error;
  }
};

// CRON JOB ERROR EMAILS
const sendCronErrorEmail = async function (message: string, meta?: string) {
  // setup email data with unicode symbols
  let mailOptions = {
    from: `${process.env.INFO_EMAIL}`,
    to: `${process.env.INFO_EMAIL}`,
    subject: `HEROFIT - CRON APPLICATION ERROR`,
    text: `An Error occurred in a HeroFit Production CRON JOB - ${message} \n \n ${meta ? meta : ""}`,
  };
  try {
    // send mail with defined transport object
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw error;
  }
};

interface FrontEndErrorData {
  debug: any[] | string;
  meta: string | null;
  status: number | null;
  version: string;
  message: string;
  accountInfo: {
    username: string | undefined;
    email: string | undefined;
    firstName: string | undefined;
  };
}

// FRONTEND MOBILE APP ERRORS - Backend errors are using the sendBackendOnlyEmail
const sendAppErrorEmail = function (formData: FrontEndErrorData): Promise<void> {
  const debug = formData.debug || formData.message;
  const meta = formData.meta || null;
  const status = formData.status;
  const version = formData.version || "Release";
  const location = "frontend";
  const message = formData.message;
  const accountInfo = formData.accountInfo;
  let textDebug;
  if (debug && debug.length && typeof debug !== "string") {
    debug.forEach((err, i) => {
      const error = err.error || err;
      const msg = error.msg;
      const location = error.location;
      const value = error.value;
      const param = error.param;
      textDebug = `msg : ${msg}, location: ${location}, value: ${value}, param: ${param}`;
    });
  } else if (debug) {
    textDebug = debug;
  }

  // setup email data with unicode symbols
  let mailOptions = {
    from: `${process.env.INFO_EMAIL}`,
    to: `${process.env.INFO_EMAIL}`,
    subject: `HEROFIT - ${status} APPLICATION ERROR - version ${version}`,
    text: `An Error occurred in HeroFit Production - ${location} - ${status}:  ${meta || message} \n \n ${textDebug ? textDebug : ""} \n \n Message to User: ${message} \n\n APP VERSION: ${version} ACCOUNT DATA:\n ${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n`,
  };

  // send mail with defined transport object
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("mail error - ", error);
        reject(error);
      }
      resolve();
    });
  });
};

// BACKEND ERRORS - Server Code Error Reporting
const sendBackendOnlyEmail = function (message: string, error: string | Error): Promise<void> {
  return new Promise((resolve, reject) => {
    // setup email data with unicode symbols
    let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: `HeroFit - Backend Error`,
      text: `
        Backend Error:\n
        Message: ${message}\n,
        ERROR: ${error}
      `,
    };

    // send mail with defined transport object
    return transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      }
      resolve();
    });
  });
};

interface BattleTally {
  total: number;
  "Avatar Wins": number;
  "Foe Wins": number;
  Draw: number;
  "Double KO": number;
  avWinPercent: string;
  avWinPercentOverall: string;
  tiePercent: string;
  failedToRun: string;
}

// BATTLE REPORT EMAILS - Sent Nightly
const sendBattleReportEmail = function (tally: BattleTally) {
  let dateString = new Date().toLocaleDateString();
  return new Promise((resolve, reject) => {
    // setup email data with unicode symbols
    let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: `BattleReport for ${dateString} - HeroFit`,
      text: `Number of Avatar Battles: ${tally.total}. \n\n Battle Report Tally:\n\n
      Avatar Wins: ${tally["Avatar Wins"]}\n
      Foe Wins: ${tally["Foe Wins"]}\n
      Draw: ${tally["Draw"]}\n
      Double KO: ${tally["Double KO"]}\n
      Avatar win%: ${tally.avWinPercent}\n
      Avatar win% overall: ${tally.avWinPercentOverall}\n
      Tie%: ${tally.tiePercent}\n
      FAILED TO RUN: ${tally.failedToRun}\n
      `,
    };

    // send mail with defined transport object
    return transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("ERROR SENDING BR EMAIL:", error);
        reject(error);
      }
      //const m = nodemailer.getTestMessageUrl(info);
      console.log("SUCCESS SENDING BR EMAIL");
      resolve(true);
    });
  });
};

// VERIFICATION EMAIL - Verifying Accounts
const sendVerificationEmail = function (email: string, code: string, isMobileApp: boolean) {
  const env = process.env.NODE_ENV as NodeEnvironments;
  const baseUrl = determineVerificationUrl(env, isMobileApp);
  const route = isMobileApp ? "" : "/welcome";
  const url = `${baseUrl}${route}?verify=${code}`;

  const mailOptions = {
    from: `${process.env.INFO_EMAIL}`,
    to: email,
    subject: `HeroFit - Account Verification`,
    text: `From the device you've installed HeroFit on, press link below to verify your email address: \n\n ${url} \n\n NOTE: If you're having problems, try long-pressing the link to copy it, then paste it in Chrome or Safari.`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log("Message sent successfully!");
        resolve(info);
      }
    });
  });
};

// RESET PASSWORD - Email Verification
const sendResetPasswordEmail = function (email: string, code: string, isMobileApp: boolean) {
  const env = process.env.NODE_ENV as NodeEnvironments;
  const baseUrl = determineVerificationUrl(env, isMobileApp);
  const route = isMobileApp ? "" : "/welcome";
  const url = `${baseUrl}${route}?verifyPassword=${code}`;

  const mailOptions = {
    from: `${process.env.INFO_EMAIL}`,
    to: email,
    subject: `HeroFit - Account Verification`,
    text: `From the device you've installed HeroFit on, press link below to verify your email address: \n\n ${url} \n\n NOTE: If you're having problems, try long-pressing the link to copy it, then paste it in Chrome or Safari.`,
  };
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        console.log("Message sent successfully!");
        resolve(info);
      }
    });
  });
};

export { sendContactEmail, sendDataCollectionEmail, sendCronErrorEmail, sendAppErrorEmail, sendBattleReportEmail, sendBackendOnlyEmail, sendVerificationEmail, sendResetPasswordEmail };
