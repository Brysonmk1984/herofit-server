const Sequelize = require('sequelize');
const UserModel = require('./models/user.js');
const AvatarModel = require('./models/avatar.js');
const UserActivityModel = require('./models/userActivity.js');
const UserTotalModel = require('./models/userTotal.js');
const BattleModel = require('./models/battle.js');
const AvatarEquipModel = require('./models/avatarEquip.js');
const AvatarItemsModel = require('./models/AvatarItems.js');
const ItemsModel = require('./models/Items.js');
let db;
let dbUrl;
let sequelizeSettings;

// PRODUCTION or Locally running backend through PROXY
if(process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'proxy'){
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
const AvatarEquip = AvatarEquipModel(db, Sequelize);
const AvatarItems = AvatarItemsModel(db, Sequelize);
const Items = ItemsModel(db, Sequelize);
// User - Avatar JOIN
User.hasOne(Avatar, {foreignKey: 'userId'});
Avatar.belongsTo(User, {foreignKey: 'userId'});
// Avatar - AvatarEquip JOIN
Avatar.hasMany(AvatarEquip, {foreignKey: 'avatarID', as: 'equipped'});
AvatarEquip.belongsTo(Avatar, {foreignKey: 'avatarID'});
// Items - AvatarItems JOIN
Avatar.hasMany(AvatarItems, {foreignKey: 'avatarID'});
AvatarItems.belongsTo(Avatar, {foreignKey: 'avatarID'});

Items.hasMany(AvatarItems, {foreignKey: 'itemID'});
AvatarItems.belongsTo(Items, {foreignKey: 'itemID'});

module.exports = { User, Avatar, UserActivity, UserTotal, Battle, AvatarEquip, AvatarItems, Items, db }