const express = require('express');
const router = express.Router(); 
const sendSurveyEmail = require('../mail.js').sendSurveyEmail;

router.post('/survey-data', function(req, res, next){
  console.log('IN RIGHT SPOT',req.body);
  let surveyData = JSON.parse(req.body.surveyData);
  surveyData = surveyData.map((item) =>{
    return `#${item.id} - ${item.description} \n`;
  });
  
  new Promise((resolve, reject) => {
    sendSurveyEmail({ email : req.body.email, username : req.body.username, surveyTitle : req.body.surveyTitle, surveyData, accountInfo : req.body.accountInfo ? req.body.accountInfo : 'User not logged in.' }, resolve, reject);
  }).then((data) =>{
    res.json({
      success : true,
      requestType : 'POST',
      info : data
    });
    next();
  }).catch((error) =>{
    res.status(401).json({
      message: `Email could not be sent`,
      debug : error
    });
    next();
  })
});

module.exports = router;