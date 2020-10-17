const nodemailer = require('nodemailer');

  // create reusable transporter object using the default SMTP transport
  let transporter = process.env.NODE_ENV === 'development' ? 
    nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
          user: 'vhrks3qs5lf6x3rg@ethereal.email',
          pass: '1AAZg6Z86MYFBPPYwu'
      }
    })
  :
    nodemailer.createTransport({
      host: `${process.env.MAIL_PROVIDER}`,
      port: 465,
      secure: true,
      auth: {
          user: `${process.env.INFO_EMAIL}`,
          pass: `${process.env.EMAIL_PASSWORD}`
      }
    });


const sendContactEmail = function(formData, resolve, reject){

  // setup email data with unicode symbols
  let mailOptions = {
      from: formData.email,
      to: `${process.env.INFO_EMAIL}`,
      subject: 'HEROFIT - A user submitted a form message.', 
      text: `Someone has a question or comment about HEROFIT, the message is as follows: \n \n ${formData.message} \n \n ACCOUNT DATA: ${JSON.stringify(formData.accountInfo)}`,
      html: `Someone has a question or comment about HEROFIT, the message is as follows: \n \n ${formData.message} \n \n ACCOUNT DATA: ${JSON.stringify(formData.accountInfo)}`
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(console.log(error));
      }
      //console.log('Message sent: %s', info.messageId);
      // Preview only available when sending through an Ethereal account
      //console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      resolve(nodemailer.getTestMessageUrl(info));
  });
};

const sendSurveyEmail = function(formData, resolve, reject){
  // setup email data with unicode symbols
  let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: 'HEROFIT - A user submitted a survey!', 
      text: `${formData.username} submitted the ${formData.surveyTitle} \n \n ${formData.surveyData} \n \n ACCOUNT DATA: ${JSON.stringify(formData.accountInfo)}`,
      html: `<div>${formData.username} submitted the ${formData.surveyTitle}, the message is as follows: <br /><br/> <div>${formData.surveyData.map((item) => `${item} <br/>`)}</div> <br /><br/> <div>ACCOUNT DATA: ${JSON.stringify(formData.accountInfo)}</div></div>`
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(console.log(error));
      }

      // console.log('Message sent: %s', info.messageId);
      // // Preview only available when sending through an Ethereal account
      // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      resolve(nodemailer.getTestMessageUrl(info));
  });
};

const sendAppErrorEmail = function(formData, resolve, reject){
  const adminData = formData.admin;
  const debug = formData.debug;

  let html = `<div>An Error occured in HeroFit Production - `;
  // error status and message
  html += `${formData.status}:  ${formData.message}`;
  
  if(debug){
    html += `<br/><br/>`;
    html += `<br/><br/><p>` + formData.debug + `</p>`;
  }

  if(adminData){
    html += `<br/><br/>`;
    html += `<div>ACCOUNT DATA: ${JSON.stringify(formData.accountInfo)}</div></div>`;
  }else{
    html += `<br/><br/><p>User not logged in.</p>`;
  }
  html += `<br/><br/><div>APP VERSION: ${formData.version}</div>`;


  // setup email data with unicode symbols
  let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: `HEROFIT - ${formData.status} APPLICATION ERROR - version ${formData.version}`, 
      text: `An Error occured in HeroFit Production - ${formData.status}:  ${formData.message} \n \n ${formData.debug} \n \n APP VERSION: ${formData.version} ACCOUNT DATA: \n \n ${JSON.stringify(formData.accountInfo)}`,
      html
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(console.log(error));
      }
      resolve(nodemailer.getTestMessageUrl(info));
  });
};

const sendBattleReportEmail = function(formData, resolve, reject){

  // setup email data with unicode symbols
  let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: `HeroFit - Battle Report`, 
      text: `Number of Avatar Battles: ${formData.count}. \n\n Battle Report Tally: ${formData.tally}`,
      html: `Number of Avatar Battles: ${formData.count}. \n\n Battle Report Tally: ${formData.tally}`,
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(console.log(error));
      }
      resolve(nodemailer.getTestMessageUrl(info));
  });
};


module.exports = { sendContactEmail, sendSurveyEmail, sendAppErrorEmail, sendBattleReportEmail };
