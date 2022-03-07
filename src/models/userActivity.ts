import Sequelize, { DataTypes } from "sequelize";

const UserActivityModel = function (db: Sequelize.Sequelize, DataTypes: DataTypes) {
  const UserActivity = db.define("user_activities", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    activityDate: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    user: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.TIME,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      allowNull: false,
    },
    activityId: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    duration: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    distance: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    averageSpeed: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    maxSpeed: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    elevationGain: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  return UserActivity as any;

export default UserActivityModel;
