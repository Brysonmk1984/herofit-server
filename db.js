const Sequelize = require('sequelize');
const UserModel = require('./models/user.js');
const AvatarModel = require('./models/avatar.js');
const UserActivityModel = require('./models/userActivity.js');
const UserTotalModel = require('./models/userTotal.js');

let db;
let dbUrl;
let sequelizeSettings;
// PRODUCTION or Locally running backend through PROXY
if(process.env.NODE_ENV === 'production'){
  sequelizeSettings = {
    dialect: 'postgres',
    protocol: 'postgres',
    operatorsAliases: false,
        //host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
  dbUrl = process.env.DATABASE_URL;
// DEVELOPMENT
}else{
  sequelizeSettings = {
    host: 'localhost',
    dialect: 'postgres',
    protocol: 'postgres',
    operatorsAliases: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
  
  dbUrl = "postgres://admin:admin@localhost/stravatar";

}
db = new Sequelize(dbUrl, sequelizeSettings);

db.sync();

const User = UserModel(db, Sequelize);
const Avatar = AvatarModel(db, Sequelize);
const UserActivity = UserActivityModel(db, Sequelize);
const UserTotal = UserTotalModel(db, Sequelize);

module.exports = { User, Avatar, UserActivity, UserTotal, db }