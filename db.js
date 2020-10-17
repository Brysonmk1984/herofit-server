const Sequelize = require('sequelize');
const UserModel = require('./models/user.js');
const AvatarModel = require('./models/avatar.js');
const UserActivityModel = require('./models/userActivity.js');
const UserTotalModel = require('./models/userTotal.js');
const BattleModel = require('./models/battle.js');

let db;
let dbUrl;
let sequelizeSettings;
console.log(process.env.NODE_ENV);
// PRODUCTION or Locally running backend through PROXY
if(process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'proxy'){
  sequelizeSettings = {
    dialect: 'postgres',
    protocol: 'postgres',
    timezone: 'utc',
    operatorsAliases: false,
    host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
  dbUrl = "postgres://obaaqsoomtxodz:4e224740983ccbba758836f6a0bcc47467f7e4edcb347869a8e2028f9f92777c@ec2-52-204-20-42.compute-1.amazonaws.com:5432/ddo9unls7gumi4";


  // DEVELOPMENTS
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
const Battle = BattleModel(db, Sequelize);

module.exports = { User, Avatar, UserActivity, UserTotal, Battle, db }