import { ObjectWithAnyProperties } from "./types/BackendOnlyTypes";
import nodemailer from "nodemailer";

// Determines which email to send to, based on environment and whether or not it's coming from the mobile app
function determineVerificationUrl(env, isMobileApp) {
  console.log("determineVerificationUrl", env, isMobileApp);
  //TEST=
  //env="production";
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

//create reusable transporter object using the default SMTP transport
let transporter =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
    ? nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: "vhrks3qs5lf6x3rg@ethereal.email",
          pass: "1AAZg6Z86MYFBPPYwu",
        },
      })
    : nodemailer.createTransport({
        host: "smtp.mailgun.org",
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAIL_PROVIDER,
          pass: process.env.MAIL_PROVIDER_PASSWORD,
        },
      });

// // TESTING NEW MAILGUN SETUP LOCALLY
// let transporter = nodemailer.createTransport({
//   host: "smtp.mailgun.org",
//   port: 587,
//   secure: false,
//   auth: {
//       user: "postmaster@mail.herofit.io",
//       pass: "bcc7e86ac8a81862a4f6660d98cd5a5f-7005f37e-cc374f17"
//   }
// });

const sendContactEmail = function (formData, resolve, reject) {
  const accountInfo = formData.accountInfo;

  // setup email data with unicode symbols
  let mailOptions = {
    from: `${process.env.INFO_EMAIL}`,
    to: `${process.env.INFO_EMAIL}`,
    subject: `HEROFIT - ${formData.email} submitted a form message.`,
    text: `Someone has a question or comment about HEROFIT, the message is as follows: \n \n ${formData.feedbackType}: \n\n ${formData.message} \n \n ACCOUNT DATA:\n ${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n`,
    html: `<div><strong>${formData.feedbackType}:</strong></div><div>${formData.message}</div><br /> ACCOUNT DATA: <br />${accountInfo.username} (${accountInfo.email}) <br /> First Name: ${accountInfo.firstName}<br />`,
  };

  // send mail with defined transport object
  return transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("ERROR sending contact form email", error);
      reject(error);
    }
    //console.log('Message sent: %s', info.messageId);
    // Preview only available when sending through an Ethereal account
    //console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    resolve(nodemailer.getTestMessageUrl(info));
  });
};

const sendDataCollectionEmail = function (formData, resolve, reject) {
  console.log("HERERE");
  const { opinion, openResponse, accountInfo } = formData;
  console.log(opinion, openResponse, accountInfo);
  // setup email data with unicode symbols
  let mailOptions = {
    from: `${process.env.INFO_EMAIL}`,
    to: `${process.env.INFO_EMAIL}`,
    subject: "HEROFIT - A user submitted Feedback from the Marketing Modal!",
    text: `${formData.username} submitted the ${formData.title} \n \n OPINION - ${opinion} \n \n TEXT RESPONSE - ${openResponse} \n \n ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n`,
    html: `<div>${formData.username} submitted the ${formData.title}<br /><br/> <div>OPINION : ${opinion}</div> <br /><br/><div>TEXT RESPONSE : ${openResponse}</div> <br /><br/> <div>ACCOUNT DATA:<br /> ${accountInfo.username} (${accountInfo.email}) <br/> First Name: ${accountInfo.firstName} </div></div>`,
  };
  console.log("MO - ", mailOptions);
  // send mail with defined transport object
  return transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      reject(console.log(error));
    }

    // console.log('Message sent: %s', info.messageId);
    // // Preview only available when sending through an Ethereal account
    // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    resolve(nodemailer.getTestMessageUrl(info));
  });
};

const sendSurveyEmail = function (formData, resolve, reject) {
  const accountInfo = formData.accountInfo;
  // setup email data with unicode symbols
  let mailOptions = {
    from: `${process.env.INFO_EMAIL}`,
    to: `${process.env.INFO_EMAIL}`,
    subject: "HEROFIT - A user submitted a survey!",
    text: `${formData.username} submitted the ${formData.surveyTitle} \n \n ${formData.surveyData} \n \n ACCOUNT DATA: \n ${accountInfo}`,
    html: `<div>${formData.username} submitted the ${formData.surveyTitle}, the message is as follows: <br /><br/> <div>${formData.surveyData.map(item => `${item} <br/>`)}</div> <br /><br/> <div>ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) <br/> First Name: ${accountInfo.firstName} </div></div>`,
  };

  // send mail with defined transport object
  return transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      reject(console.log(error));
    }

    // console.log('Message sent: %s', info.messageId);
    // // Preview only available when sending through an Ethereal account
    // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    resolve(nodemailer.getTestMessageUrl(info));
  });
};
interface SendCronErrorEmailParams {
  status: number;
  message: string;
  version: string;
  errorLocation: string;
  meta?: string;
  debug?: { msg: string; location: string; value: any; param: any }[];
}
const sendCronErrorEmail = async function ({ status, message, debug, meta, errorLocation }: SendCronErrorEmailParams) {
  const location = errorLocation;
  let html = `<div>An Error occurred in a HeroFit Production CRON JOB- `;
  // error status and message
  html += `${status}:  ${message}`;
  let textDebug;
  if (debug) {
    console.log("DEBUG - ", debug);
    html += `<br/><br/>`;
    debug.forEach((err, i) => {
      html += `<p>ERROR #${i + 1}`;
      html += `<p>msg: ` + err.msg + `</p>`;
      html += `<p>location: ` + err.location + `</p>`;
      html += `<p>value: ` + err.value + `</p>`;
      html += `<p>param: ` + err.param + `</p>`;
      textDebug = `msg : ${err.msg}, location: ${err.location}, value: ${err.value}, param: ${err.param}`;
    });
  }

  if (meta) {
    html += `<br/><br/>`;
    html += `<br/><br/><p>` + meta + `</p>`;
  }

  html += `<br/><br/> Error Location: ${location}`;
  html += `<br/><br/><div>BACKEND APP VERSION: ${process.env.VERSION}</div>`;

  // setup email data with unicode symbols
  let mailOptions = {
    from: `${process.env.INFO_EMAIL}`,
    to: `${process.env.INFO_EMAIL}`,
    subject: `HEROFIT - ${status} APPLICATION ERROR - version ${process.env.VERSION}`,
    text: `An Error occurred in a HeroFit Production CRON JOB - ${status}:  ${message} \n \n ${textDebug ? textDebug : ""} \n \n ${meta ? meta : ""} Error Location: ${location} \n\n APP VERSION: ${process.env.VERSION}`,
    html,
  };
  try {
    // send mail with defined transport object
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw error;
  }
};

// ERRORS are always sent from frontend
// Backend errors are using the sendBackendOnlyEmail
const sendAppErrorEmail = function (formData, resolve, reject) {
  const debug = formData.debug || formData.message;
  const meta = formData.meta || null;
  const status = formData.status || formData.name;
  const version = formData.version || "Release";
  const location = formData.errorLocation;
  const message = formData.message;
  const accountInfo = formData.accountInfo;
  let html = `<div>An Error occured in HeroFit Production - `;
  // error status and message
  html += `${status}:  ${meta || message}`;
  let textDebug;

  if (debug && debug.length && typeof debug !== "string") {
    html += `<br/><br/>`;

    debug.forEach((err, i) => {
      const error = err.error || err;
      const msg = error.msg;
      const location = error.location;
      const value = error.value;
      const param = error.param;

      html += `<p>ERROR #${i + 1}`;
      html += `<p>msg: <strong>${msg}</strong> </p>`;
      html += `<p>location: <strong>${location}</strong></p>`;
      html += `<p>value: <strong>${value}</strong></p>`;
      html += `<p>param: <strong>${param}</strong></p>`;

      textDebug = `msg : ${msg}, location: ${location}, value: ${value}, param: ${param}`;
    });
  } else if (debug) {
    html += debug;
    textDebug = debug;
  }
  html += `<br/><br/> Error Location: ${location}`;
  html += `<br/><br/> Message to User: ${message}`;

  if (accountInfo) {
    html += `<br/><br/>`;
    html += `<div>ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) <br/> First Name: ${accountInfo.firstName} </div></div>`;
  } else {
    html += `<br/><br/><p>User not logged in.</p>`;
  }
  html += `<br/><br/><div>APP VERSION: ${version}</div>`;

  // setup email data with unicode symbols
  let mailOptions = {
    from: `${process.env.INFO_EMAIL}`,
    to: `${process.env.INFO_EMAIL}`,
    subject: `HEROFIT - ${status} APPLICATION ERROR - version ${version}`,
    text: `An Error occured in HeroFit Production - ${location} - ${status}:  ${meta || message} \n \n ${textDebug ? textDebug : ""} \n \n Message to User: ${message} \n\n APP VERSION: ${version} ACCOUNT DATA:\n ${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n`,
    html,
  };

  // send mail with defined transport object
  return transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("mail error - ", error);
      reject(error);
    }
    resolve(nodemailer.getTestMessageUrl(info));
  });
};

const sendBattleReportEmail = function (tally) {
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
      html: `Number of Avatar Battles: ${tally.total}. <br/><br/> Battle Report Tally:\n\n
      Avatar Wins: ${tally["Avatar Wins"]}<br/>
      Foe Wins: ${tally["Foe Wins"]}<br/>
      Draw: ${tally["Draw"]}<br/>
      Double KO: ${tally["Double KO"]}<br/>
      Avatar win%: ${tally.avWinPercent}<br/>
      Avatar win% overall: ${tally.avWinPercentOverall}<br/>
      Tie%: ${tally.tiePercent}<br/>
      FAILED TO RUN: ${tally.failedToRun}<br/>
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

// BACKEND ONLY ERRORS
const sendBackendOnlyEmail = function (message : string, error : string | Error) {
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
      resolve(nodemailer.getTestMessageUrl(info));
    });
  });
};

// VERIFICATION EMAIL For Verifying Account
const sendVerificationEmail = function (email, code, isMobileApp) {
  const baseUrl = determineVerificationUrl(process.env.NODE_ENV, isMobileApp);
  // No longer using this on frontend, so no longer need isMobileApp
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

// RESET PASSWORD email verification
const sendResetPasswordEmail = function (email, code, isMobileApp) {
  const baseUrl = determineVerificationUrl(process.env.NODE_ENV, isMobileApp);
  const route = isMobileApp ? "" : "/welcome";
  const url = `${baseUrl}${route}?verifyPassword=${code}`;

  // REAL transporter, delete this after testing:
  // transporter = nodemailer.createTransport({
  //   host: process.env.MAIL_PROVIDER,
  //   port: 465,
  //   secure: true,
  //   auth: {
  //       user: process.env.INFO_EMAIL,
  //       pass: process.env.EMAIL_PASSWORD
  //   }
  // });

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

export { sendContactEmail, sendDataCollectionEmail, sendSurveyEmail, sendCronErrorEmail, sendAppErrorEmail, sendBattleReportEmail, sendBackendOnlyEmail, sendVerificationEmail, sendResetPasswordEmail };
