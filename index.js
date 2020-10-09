// NODE
const path = require('path');
require('dotenv').load();
// LIBRARIES
const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require("body-parser");
const passport = require('passport');
const fileUpload = require('express-fileupload');
// COMMON
const authenticateRoutes = require('./routes/authenticate');
const avatarRoutes = require('./routes/avatar');
const userRoutes = require('./routes/user');
const emailRoutes = require('./routes/email');
const mockDataRoutes = require('./routes/mockData');

  // http server
//app.listen( process.env.PORT || 3001, function () {
    
  console.log('Listening on port ' + (process.env.PORT || 3001));
  // Middleware
  // logger
  app.use(morgan('dev'));
  app.use(cors({credentials: true, origin : true}));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.set('trust proxy', 1);
  app.use(passport.initialize());


  
  app.options('*', cors())
  // HTTP Routes

  // Protected routes
  app.use('/authenticate', authenticateRoutes);
  app.use('/avatar', avatarRoutes);
  app.use('/user', userRoutes);
  app.use('/email', emailRoutes);
  app.use('/mock-data', mockDataRoutes);
//});
module.exports = app;

