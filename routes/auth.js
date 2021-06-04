const router = require('express').Router();
const passport = require('passport');
const passwordUtils = require('../lib/passwordUtils');
const User = require('../db').User;
const { body, header, validationResult } = require('express-validator');
const { authenticateJWT } = require('../jwtValidation');
//db connection

router.post('./login', authenticateJWT, (req, res, next)=>{

});

router.post('./register', authenticateJWT, (req, res, next)=>{

});

router.get('/logout', authenticateJWT, (req, res, next)=>{

});