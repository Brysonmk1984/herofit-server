const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwt/validateJWT');
const router = express.Router(); 
const { User } = require('../config/db');
const { sendDataCollectionEmail, sendSurveyEmail, sendContactEmail, sendAppErrorEmail } = require('../mail.js');

router.post('/feedback-data', body('email').isEmail(), body('username').isString(), body('title').isString(), body('accountInfo').isObject().optional({ checkFalsy: true }), body('opinion').isString(), body('openResponse').isString(), authenticateJWT, (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /feedback-data endpoint");
  }

  const { email, username, title, accountInfo, opinion, openResponse } = req.body;
  new Promise((resolve, reject) => {
    sendDataCollectionEmail({ email, username, title, opinion, openResponse, accountInfo : accountInfo || 'User not logged in.' }, resolve, reject);
  }).then((data) =>{
  // Add latestActivityUpdate to DB for user
    User.update(
      {featurePreferenceSubmitted : true},
      { where: { email } }
    ).then(() => {
      res.formatter.ok({ data : 'Feedback form submitted' });
    }).catch((error)=>{
      console.log(`Error updating latest activity to user table for user ${email} DEBUG: ${error}`);
      res.formatter.serverError(error.toString(), `Email could not be sent ${email} - /feedback-data endpoint`);
    });

  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Email could not be sent ${email} - /feedback-data endpoint`);
  });
});

router.post('/survey-data', body('email').isEmail(), body('username').isString(), body('surveyTitle').isString(), body('accountInfo').isObject().optional({ checkFalsy: true }), body('surveyData').isArray(), authenticateJWT, (req, res) => {

  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.formatter.badRequest(errors.array(), "Validation Error - for /survey-data");
  }

  let surveyData = req.body.surveyData;
  surveyData = surveyData.map((item) =>{
    return `#${item.id} - ${item.description} \n`;
  });
  const { email, username, surveyTitle, accountInfo } = req.body;
  new Promise((resolve, reject) => {
    sendSurveyEmail({ email, username, surveyTitle, surveyData, accountInfo : accountInfo || 'User not logged in.' }, resolve, reject);
  }).then((data) =>{
    // Add latestActivityUpdate to DB for user
    User.update(
      {featurePreferenceSubmitted : true},
      { where: { email } }
    ).then((updatePref) => {
      res.formatter.ok({ data : 'Survey email submitted' });
    }).catch((error)=>{
      console.log(`Error updating latest activity to user table for user ${email} DEBUG: ${error}`);
      res.formatter.serverError(error.toString(), `Error updating latest activity to user table for user ${email} - /survey-data endpoint`);
    });
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Email could not be sent for ${email} - /survey-data endpoint`);
  });
});

// feedbackType is optional - Only the native app is sending this property, not the web app
router.post('/contact-form', body('email').isEmail(), body('feedbackType').isString().optional({ checkFalsy: true }), body('message').isString(), body('accountInfo').isObject().optional({ checkFalsy: true }), (req, res) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    const { email, message, feedbackType, accountInfo } = req.body;
    console.log('THE DETAILS', req.body.email, req.body.message, feedbackType, accountInfo);
    return res.formatter.badRequest(errors.array(), "Validation Error - for /contact-form'");
  }
  const { email, message, feedbackType, accountInfo } = req.body;
  new Promise((resolve, reject) => {
    sendContactEmail({ email, message, feedbackType, accountInfo : accountInfo || 'User not logged in.' }, resolve, reject);
  }).then((data) =>{
    res.formatter.ok(data);
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Email could not be sent - /contact-form endpoint`);
  });
});

// Works for 50x, 40x, and 999 errors... should be everything
router.post('/app-error', body('status').isNumeric(), body('message').isString(), body('debug').isArray().optional({ checkFalsy: true }), body('version').isString(), body('accountInfo').isObject().optional({ checkFalsy: true }), (req, res) => {

  const errors = validationResult(req);
  if(!errors.isEmpty()){ 
    return res.formatter.badRequest(errors.array(), "Validation Error - for /app-error");
  }
  const { status, message, debug, version, accountInfo, errorLocation, meta } = req.body;

  new Promise((resolve, reject) => {
    sendAppErrorEmail({ status, message, debug, version, errorLocation, meta, accountInfo : accountInfo || 'User not logged in.' }, resolve, reject);
  }).then((data) =>{
    res.formatter.ok(data);
  }).catch((error) =>{
    res.formatter.serverError(error.toString(), `Email could not be sent - /app-error endpoint`);
  });
});

module.exports = router;