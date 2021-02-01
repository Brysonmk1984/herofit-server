const express = require('express');
const router = express.Router(); 
const User = require('../db').User;
const sendDataCollectionEmail = require('../mail.js').sendDataCollectionEmail;
const sendSurveyEmail = require('../mail.js').sendSurveyEmail;
const sendContactEmail = require('../mail.js').sendContactEmail;
const sendAppErrorEmail = require('../mail.js').sendAppErrorEmail;

router.post('/feedback-data', function(req, res, next){
  let feedbackData = JSON.parse(req.body.feedbackData);

  new Promise((resolve, reject) => {
    sendDataCollectionEmail({ email : req.body.email, username : req.body.username, title : req.body.title, feedbackData, accountInfo : req.body.accountInfo ? req.body.accountInfo : 'User not logged in.' }, resolve, reject);
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
  });
});

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
  });
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
  });
});

router.post('/app-error', function(req, res, next){
  new Promise((resolve, reject) => {
    sendAppErrorEmail({ status : req.body.status, message : req.body.message, debug : req.body.debug, version : req.body.version, errorLocation : "Front End", accountInfo : req.body.accountInfo ? req.body.accountInfo : 'User not logged in.' }, resolve, reject);
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
  });
});



module.exports = router;