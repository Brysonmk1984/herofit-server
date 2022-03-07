import Sequelize, { Options } from "sequelize";
import UserModel from "../../src/models/user";
import AvatarModel from "../../src/models/avatar";
import UserActivityModel from "../../src/models/userActivity";
import UserTotalModel from "../../src/models/userTotal";
import BattleModel from "../../src/models/battle";
import AvatarItemsModel from "../../src/models/avatarItems";
import ItemsModel from "../../src/models/items";

require("dotenv").load();

function loadDb() {
  const dbUrl = process.env.DATABASE_URL_LOCAL;
  const sequelizeSettings = {
    host: "localhost",
    dialect: "postgres",
    dialectOptions: {},
    protocol: "postgres",
    operatorsAliases: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    query: { raw: true },
  };

  const db = new Sequelize(dbUrl, sequelizeSettings);

  const User = UserModel(db, Sequelize);
  const Avatar = AvatarModel(db, Sequelize);
  const UserActivity = UserActivityModel(db, Sequelize);
  const UserTotal = UserTotalModel(db, Sequelize);
  const Battle = BattleModel(db, Sequelize);
  const AvatarItems = AvatarItemsModel(db, Sequelize);
  const Items = ItemsModel(db, Sequelize);

  /*
    JOINS
  */

  // User - Avatar JOIN
  User.hasOne(Avatar, { foreignKey: "userId" });
  Avatar.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });

  // Avatar-AvatarItems
  Avatar.hasMany(AvatarItems, {
    foreignKey: "avatarID",
    as: "equipped",
    onDelete: "CASCADE",
  });
  AvatarItems.belongsTo(Avatar, { foreignKey: "avatarID", onDelete: "CASCADE" });

  // Items - AvatarItems
  Items.hasMany(AvatarItems, { foreignKey: "itemID", as: "items" });
  AvatarItems.belongsTo(Items, { foreignKey: "itemID", onDelete: "CASCADE" });

  db.models = { User, Avatar, UserActivity, UserTotal, Battle, AvatarItems, Items };

  return db;
}

export { loadDb };
