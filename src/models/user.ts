import Sequelize, { DataTypes } from "sequelize";

const UserModel = function (db: Sequelize.Sequelize, DataTypes: DataTypes) {
  const User = db.define("users", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    createdAt: {
      type: DataTypes.TIME,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      unique: false,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isFake: {
      type: DataTypes.BOOLEAN,
    },
    latestActivityUpdate: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    stravaAccessToken: {
      type: DataTypes.CHAR,
      length: 40,
      allowNull: true,
    },
    stravaAccessTokenExpiration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    stravaRefreshToken: {
      type: DataTypes.CHAR,
      length: 40,
      allowNull: true,
    },
    featurePreferenceSubmitted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    seenLatestPatch: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    hash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    salt: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emailCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dataSrcId: {
      type: DataTypes.STRING,
      length: 50,
      allowNull: true,
    },
    emailMarketingOptIn: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    foundOutBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isMetric: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    referredBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  return User;
};

export default UserModel;
