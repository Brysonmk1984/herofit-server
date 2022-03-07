import Sequelize, { DataTypes } from "sequelize";

const UserTotalModel = function (db: Sequelize.Sequelize, DataTypes: DataTypes) {
  const UserTotal = db.define(
    "user_totals",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      avatarId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      lastUpdate: {
        type: DataTypes.TIME,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false,
      },
      run: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      hike: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      walk: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      ride: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      swim: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      yoga: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      weightTraining: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      stairStepper: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      elliptical: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      standUpPaddling: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      crossfit: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      rowing: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      ski: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      snowboard: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      snowshoe: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      kayaking: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      workout: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    { timestamps: false },
  );

  return UserTotal as any;
};

export default UserTotalModel;
