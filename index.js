// NODE
const path = require('path');
require('dotenv').load();
// LIBRARIES
const express = require('express');
const app = express();
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require("body-parser");
const responseEnhancer = require('express-response-formatter').responseEnhancer;

// COMMON
const authenticateRoutes = require('./routes/authenticate');
const avatarRoutes = require('./routes/avatar');
const accountRoutes = require('./routes/account');
const inventoryRoutes = require('./routes/inventory');
const userRoutes = require('./routes/user');
const emailRoutes = require('./routes/email');
const battleRoutes = require('./routes/battle');
const calculateRoutes = require('./routes/calculate');
const mockDataRoutes = require('./routes/mockData');
const mockCronRoutes = require('./routes/mockCronEndpoints');

  // http server
  console.log('Listening on port ' + (process.env.PORT || 3001));
  // Middleware
  // logger
  app.use(morgan('dev'));
  app.use(cors({credentials: true, origin : true}));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(responseEnhancer());
  app.set('trust proxy', 1);


  
  app.options('*', cors())
  // HTTP Routes

  // Protected routes
  app.use('/authenticate', authenticateRoutes);
  app.use('/avatar', avatarRoutes);
  app.use('/account', accountRoutes);
  app.use('/inventory', inventoryRoutes);
  app.use('/user', userRoutes);
  app.use('/email', emailRoutes);
  app.use('/battle', battleRoutes);
  app.use('/calculate', calculateRoutes);
  app.use('/mock-data', mockDataRoutes);
  app.use('/mock-cron', mockCronRoutes);

module.exports = app;

