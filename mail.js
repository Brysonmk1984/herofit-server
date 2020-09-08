const nodemailer = require('nodemailer');

  // create reusable transporter object using the default SMTP transport
  let transporter = false ? 
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
      to: 'info@stravatar.life',
      subject: 'STRAVATAR - A user submitted a form message.', 
      text: `Someone has a question or comment about STRAVATAR, the message is as follows: \n \n ${formData.message} \n \n ACCOUNT DATA: ${JSON.stringify(formData.accountInfo)}`,
      html: `Someone has a question or comment about STRAVATAR, the message is as follows: \n \n ${formData.message} \n \n ACCOUNT DATA: ${JSON.stringify(formData.accountInfo)}`
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(console.log(error));
      }
      console.log('Message sent: %s', info.messageId);
      // Preview only available when sending through an Ethereal account
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      resolve(nodemailer.getTestMessageUrl(info));
  });
};

const sendSurveyEmail = function(formData, resolve, reject){
  console.log(1111);
  console.log(formData, resolve, reject)
  // setup email data with unicode symbols
  let mailOptions = {
      from: 'info@stravatar.life',
      to: 'info@stravatar.life',
      subject: 'Stravatar - A user submitted a survey!', 
      text: `${formData.username} submitted the ${formData.surveyTitle} \n \n ${formData.surveyData} \n \n ACCOUNT DATA: ${JSON.stringify(formData.accountInfo)}`,
      html: `<div>${formData.username} submitted the ${formData.surveyTitle}, the message is as follows: <br /><br/> <div>${formData.surveyData.map((item) => `${item} <br/>`)}</div> <br /><br/> <div>ACCOUNT DATA: ${JSON.stringify(formData.accountInfo)}</div></div>`
  };
  console.log(2222);
  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {console.log(3333);
      if (error) {console.log(44444);
        reject(console.log(error));
      }console.log(555555);
      console.log(info);
      // console.log('Message sent: %s', info.messageId);
      // // Preview only available when sending through an Ethereal account
      // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      resolve(nodemailer.getTestMessageUrl(info));
  });
};


module.exports = { sendContactEmail, sendSurveyEmail };
