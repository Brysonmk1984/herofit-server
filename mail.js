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
  console.log('contact form detail', formData);
  const accountInfo = JSON.stringify(formData.accountInfo);
  console.log('acc info - ', accountInfo);
  // setup email data with unicode symbols
  let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: `HEROFIT - ${formData.email} submitted a form message.`, 
      text: `Someone has a question or comment about HEROFIT, the message is as follows: \n \n ${formData.message} \n \n ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n`,
      html: `Someone has a question or comment about HEROFIT, the message is as follows: \n \n ${formData.message} \n \n ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n`
  };
  console.log('MO - ', mailOptions);
  // send mail with defined transport object
  return transporter.sendMail(mailOptions, (error, info) => {
      if (error) {console.log('ERROR sending contact form email', error);
        reject(console.log(error));
      }
      //console.log('Message sent: %s', info.messageId);
      // Preview only available when sending through an Ethereal account
      //console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      resolve(nodemailer.getTestMessageUrl(info));
  });
};

const sendDataCollectionEmail = function(formData, resolve, reject){
  const accountInfo = JSON.stringify(formData.accountInfo);
  const { opinion, openResponse } = formData.feedbackData;
  // setup email data with unicode symbols
  let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: 'HEROFIT - A user submitted Feedback from the Marketing Modal!', 
      text: `${formData.username} submitted the ${formData.title} \n \n OPINION - ${opinion} \n \n TEXT RESPONSE - ${openResponse} \n \n ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n`,
      html: `<div>${formData.username} submitted the ${formData.title}, the message is as follows: <br /><br/> <div>OPINION : ${opinion}</div> <br /><br/><div>TEXT RESPONSE : ${openResponse}</div> <br /><br/> <div>ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) <br/> First Name: ${accountInfo.firstName} </div></div>`
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

const sendSurveyEmail = function(formData, resolve, reject){
  const accountInfo = JSON.stringify(formData.accountInfo);
  // setup email data with unicode symbols
  let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: 'HEROFIT - A user submitted a survey!', 
      text: `${formData.username} submitted the ${formData.surveyTitle} \n \n ${formData.surveyData} \n \n ACCOUNT DATA: ${JSON.stringify(formData.accountInfo)}`,
      html: `<div>${formData.username} submitted the ${formData.surveyTitle}, the message is as follows: <br /><br/> <div>${formData.surveyData.map((item) => `${item} <br/>`)}</div> <br /><br/> <div>ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) <br/> First Name: ${accountInfo.firstName} </div></div>`
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

const sendCronErrorEmail = function({status, name, message, debug, version, errorLocation}, resolve, reject){
  const location = errorLocation;
  let html = `<div>An Error occured in a HeroFit Production CRON JOB- `;
  // error status and message
  html += `${status}:  ${message}`;
  
  if(debug){
    html += `<br/><br/>`;
    html += `<br/><br/><p>` + debug + `</p>`;
  }

  html += `<br/><br/> Error Location: ${location}`;
  html += `<br/><br/><p>User not logged in.</p>`;
  html += `<br/><br/><div>APP VERSION: ${version}</div>`;


  // setup email data with unicode symbols
  let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: `HEROFIT - ${status} APPLICATION ERROR - version ${version}`, 
      text: `An Error occured in a HeroFit Production CRON JOB - ${status}:  ${message} \n \n ${debug} \n \n  Error Location: ${location} \n\n APP VERSION: ${version} ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n`,
      html
  };

  // send mail with defined transport object
  return transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(console.log(error));
      }
      resolve(nodemailer.getTestMessageUrl(info));
  });
};



const sendAppErrorEmail = function(formData, resolve, reject){
  const adminData = formData.admin;
  const debug = formData.debug || formData.message;
  const status = formData.status || formData.name;
  const version = formData.version || 'Release';
  const location = formData.errorLocation;
  const message = formData.message;
  let html = `<div>An Error occured in HeroFit Production - `;
  const accountInfo = JSON.stringify(formData.accountInfo);
  // error status and message
  html += `${formData.status}:  ${formData.message}`;
  console.log('debug', debug);
  console.log('status',status);
  console.log('version',version);
  console.log('location',location);
  if(debug){
    html += `<br/><br/>`;
    html += `<br/><br/><p>` + debug + `</p>`;
  }
  html += `<br/><br/> Error Location: ${location}`;
  if(adminData){
    html += `<br/><br/>`;
    html += `<div>ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) <br/> First Name: ${accountInfo.firstName} </div></div>`;
  }else{
    html += `<br/><br/><p>User not logged in.</p>`;
  }
  html += `<br/><br/><div>APP VERSION: ${version}</div>`;

  // setup email data with unicode symbols
  let mailOptions = {
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: `HEROFIT - ${status} APPLICATION ERROR - version ${version}`, 
      text: `An Error occured in HeroFit Production - ${location} - ${status}:  ${message} \n \n ${debug} \n \n APP VERSION: ${version} ACCOUNT DATA: ${accountInfo.username} (${accountInfo.email}) \n\n First Name: ${accountInfo.firstName} \n\n`,
      html
  };
  console.log('mail options - ',mailOptions);
  // send mail with defined transport object
  return transporter.sendMail(mailOptions, (error, info) => {
      if (error) {console.log('mail error - ', error)
        reject(console.log(error));
      }
      resolve(nodemailer.getTestMessageUrl(info));
  });
};

const sendBattleReportEmail = function(tally){
  
  return new Promise((resolve, reject) =>{
    // setup email data with unicode symbols
    let mailOptions = { 
      from: `${process.env.INFO_EMAIL}`,
      to: `${process.env.INFO_EMAIL}`,
      subject: `HeroFit - Battle Report`, 
      text: `Number of Avatar Battles: ${tally.total}. \n\n Battle Report Tally:\n\n
      Avatar Wins: ${tally.avatarWins}\n
      Foe Wins: ${tally.foeWins}\n
      Draw: ${tally.draw}\n
      Double KO: ${tally.doubleKO}\n
      Avatar win%: ${tally.avWinPercent * 100}%\n
      Avatar win% overall: ${tally.avWinPercentOverall * 100}%\n
      Tie%: ${tally.tiePercent * 100}%\n
      `,
      html: `Number of Avatar Battles: ${tally.total}. <br/><br/> Battle Report Tally:\n\n
      Avatar Wins: ${tally.avatarWins}<br/>
      Foe Wins: ${tally.foeWins}<br/>
      Draw: ${tally.draw}<br/>
      Double KO: ${tally.doubleKO}<br/>
      Avatar win%: ${tally.avWinPercent * 100}%<br/>
      Avatar win% overall: ${tally.avWinPercentOverall * 100}%<br/>
      Tie%: ${tally.tiePercent * 100}%<br/>
      `,
  };

  // send mail with defined transport object
  return transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(console.log(error));
      }
      resolve(nodemailer.getTestMessageUrl(info));
  });
  });

};


module.exports = { sendContactEmail, sendDataCollectionEmail, sendSurveyEmail, sendCronErrorEmail, sendAppErrorEmail, sendBattleReportEmail };
