import Sequelize, { Options } from "sequelize";
import UserModel from "../models/user";
import AvatarModel from "../models/avatar";
import UserActivityModel from "../models/userActivity";
import UserTotalModel from "../models/userTotal";
import BattleModel from "../models/battle";
import AvatarItemsModel from "../models/avatarItems";
import ItemsModel from "../models/items";

let sequelizeSettings: Partial<Options> = {
  dialect: "postgres",
  protocol: "postgres",
  operatorsAliases: false,
  query: { raw: true },
};
let envSpecificSettings: Partial<Options>;

if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "proxy") {
  // PRODUCTION, STAGING, or PROXY
  envSpecificSettings = {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    timezone: "utc",
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 8000,
    },
  };
} else {
  // DEVELOPMENT
  envSpecificSettings = {
    host: "db",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  };
}

const db = new Sequelize(process.env.DATABASE_URL, { ...sequelizeSettings, ...envSpecificSettings });

db.authenticate();

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

export { User, Avatar, UserActivity, UserTotal, Battle, AvatarItems, Items, db };
