import Sequelize, { DataTypes } from "sequelize";

const AvatarModel = function (db: Sequelize.Sequelize, DataTypes: DataTypes) {
  const Avatar = db.define("avatars", {
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
    isFake: {
      type: DataTypes.BOOLEAN,
    },
    status: {
      type: DataTypes.TEXT,
      defaultValue: "Rested",
      allowNull: false,
    },
    goToBattle: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    owner: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    hasBeenUpgraded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    character: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true,
      },
    },
    power: {
      type: DataTypes.INTEGER,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    health: {
      type: DataTypes.INTEGER,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    maxHealth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    fire: {
      type: DataTypes.NUMERIC,
      precision: 7,
      scale: 2,
      allowNull: false,
      defaultValue: 0,
    },
    earth: {
      type: DataTypes.NUMERIC,
      precision: 7,
      scale: 2,
      allowNull: false,
      defaultValue: 0,
    },
    air: {
      type: DataTypes.NUMERIC,
      precision: 7,
      scale: 2,
      allowNull: false,
      defaultValue: 0,
    },
    water: {
      type: DataTypes.NUMERIC,
      precision: 7,
      scale: 2,
      allowNull: false,
      defaultValue: 0,
    },
    armor: {
      type: DataTypes.NUMERIC,
      precision: 7,
      scale: 2,
      allowNull: false,
      defaultValue: 0,
    },
    recovery: {
      type: DataTypes.NUMERIC,
      precision: 7,
      scale: 2,
      allowNull: false,
      defaultValue: 0,
    },
    aether: {
      type: DataTypes.NUMERIC,
      precision: 7,
      scale: 2,
      allowNull: false,
      defaultValue: 0,
    },
    qpFire: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    qpEarth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    qpWater: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    qpAir: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    qpRecovery: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    qpArmor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    qpPower: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    qpHealth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    qpAether: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    qp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    activityXP: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    battleXP: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    battleWins: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    battleLosses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    battleDraws: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    battleDkos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    photonTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    statusFade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    fireToWater: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    fireToEarth: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    fireToAir: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    earthToWater: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    earthToFire: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    earthToAir: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    airToWater: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    airToEarth: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    airToFire: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    waterToFire: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    waterToEarth: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
    waterToAir: {
        type: DataTypes.NUMERIC,
        precision: 7,
        scale: 2,
        allowNull: false,
        defaultValue: 0,
    },
  });

  return Avatar as any;
};

export default AvatarModel;
