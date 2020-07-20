const Sequelize = require('sequelize');
const UserModel = require('./models/user.js');

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
  
  dbUrl = "postgres://admin:admin@localhost/ecoAllies";

}
db = new Sequelize(dbUrl, sequelizeSettings);

db.sync();


const User = UserModel(db, Sequelize);

module.exports = { User, db }