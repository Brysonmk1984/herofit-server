const Sequelize = require('sequelize');
const UserModel = require('../models/user.js');
const AvatarModel = require('../models/avatar.js');
const UserActivityModel = require('../models/userActivity.js');
const UserTotalModel = require('../models/userTotal.js');
const BattleModel = require('../models/battle.js');
const AvatarItemsModel = require('../models/avatarItems.js');
const ItemsModel = require('../models/items.js');
let db;
let dbUrl;
let sequelizeSettings;

if(process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'proxy'){
  // PRODUCTION or Locally running backend through PROXY
  sequelizeSettings = {
    dialect: 'postgres',
    dialectOptions: {
      ssl : true
    },
    protocol: 'postgres',
    timezone: 'utc',
    operatorsAliases: false,
    host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 8000
    },
    query:{raw:true}
  }
  dbUrl = process.env.DATABASE_URL;

}else{
  // DEVELOPMENT
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
    },
    query:{raw:true}
  }
  
  dbUrl = process.env.DATABASE_URL_LOCAL;
}

db = new Sequelize(dbUrl, sequelizeSettings);
db.authenticate();

const User = UserModel(db, Sequelize);
const Avatar = AvatarModel(db, Sequelize);
const UserActivity = UserActivityModel(db, Sequelize);
const UserTotal = UserTotalModel(db, Sequelize);
const Battle = BattleModel(db, Sequelize);
const AvatarItems = AvatarItemsModel(db, Sequelize);
const Items = ItemsModel(db, Sequelize);
// User - Avatar JOIN
User.hasOne(Avatar, {foreignKey: 'userId'});
Avatar.belongsTo(User, {foreignKey: 'userId'});

// Avatar-AvatarItems
Avatar.hasMany(AvatarItems, {foreignKey: 'avatarID', as: 'equipped'});
AvatarItems.belongsTo(Avatar, {foreignKey: 'avatarID'});

// Items - AvatarItems
Items.hasMany(AvatarItems, {foreignKey: 'itemID', as: 'items'});
AvatarItems.belongsTo(Items, {foreignKey: 'itemID'});

module.exports = { User, Avatar, UserActivity, UserTotal, Battle, AvatarItems, Items, db }