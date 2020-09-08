const express = require('express');
const router = express.Router(); 
const User = require('../db').User;
const sendSurveyEmail = require('../mail.js').sendSurveyEmail;
const sendContactEmail = require('../mail.js').sendContactEmail;

router.post('/survey-data', function(req, res, next){
  let surveyData = JSON.parse(req.body.surveyData);
  surveyData = surveyData.map((item) =>{
    return `#${item.id} - ${item.description} \n`;
  });
  
  new Promise((resolve, reject) => {
    sendSurveyEmail({ email : req.body.email, username : req.body.username, surveyTitle : req.body.surveyTitle, surveyData, accountInfo : req.body.accountInfo ? req.body.accountInfo : 'User not logged in.' }, resolve, reject);
  }).then((data) =>{

  // Add latestActivityUpdate to DB for user
    User.update(
      {featurePreferenceSubmitted : true},
      { where: { email: req.body.email } }
    ).then((updatePref) => {
      next();
    }).catch((err)=>{
      console.log(`Error updating latest activity to user table for user ${req.body.email} DEBUG: ${err}`);
      res.status(400).json({
        message: `Error updating latest activity to user table for user  ${req.body.email}`,
        debug : err
      });
      next();
    });
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

router.post('/contact-form', function(req, res, next){
  new Promise((resolve, reject) => {
    sendContactEmail({ email : req.body.email, message : req.body.message, accountInfo : req.body.accountInfo ? req.body.accountInfo : 'User not logged in.' }, resolve, reject);
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