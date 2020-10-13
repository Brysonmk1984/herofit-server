const nodemailer = require('nodemailer');
console.log('TEST!');
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


const sendTestEmail = function(resolve, reject){

  // setup email data with unicode symbols
  let mailOptions = {
      from: "brysonmk1984@getMaxListeners.com",
      to: `${process.env.INFO_EMAIL}`,
      subject: 'HEROFIT - CRON TEST', 
      text: `TEST EMAIL: THIS IS A TEST`,
      html: `TEST EMAIL:  \n \n THIS IS A TEST`
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



new Promise((resolve, reject) =>{
  return sendTestEmail(resolve, reject);
}).then((data) =>{
  console.log(data);
}).error((error) =>{
  console.log(error);
});
