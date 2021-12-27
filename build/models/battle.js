"use strict";
const BattleModel = function (db, DataTypes) {
  const Battle = db.define("battles", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    avatarID: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    scenario: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    outcome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    aStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    xpGain: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    owner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatarName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    foe: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    foeType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bra: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    brf: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    roundBreakdown: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.TIME,
      defaultValue: DataTypes.literal("CURRENT_TIMESTAMP"),
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.TIME,
      defaultValue: DataTypes.literal("CURRENT_TIMESTAMP"),
      allowNull: false,
    },
    seenReport: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    postBattleActions: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ptGain: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    effects: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    effectProcs: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  });
  return Battle;
};
module.exports = BattleModel;
