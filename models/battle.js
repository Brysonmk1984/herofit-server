const BattleModel = function(db, DataTypes){
  const Battle = db.define('battles', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    avatarID : {
      type : DataTypes.STRING,
      allowNull: false,
    },
    scenario : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    outcome : {
      type : DataTypes.STRING,
      allowNull: false,
    },
    aStatus : {
      type : DataTypes.STRING,
      allowNull: true,
    },
    aPhyDamage : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    fPhyReduction : {
      type : DataTypes.NUMERIC,
      allowNull: true
    },
    fPhyDamage : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    aPhyReduction : {
      type : DataTypes.NUMERIC,
      allowNull: true
    },
    xpGain: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    owner : {
      type : DataTypes.STRING,
      allowNull: false,
    },
    avatarName : {
      type : DataTypes.STRING,
      allowNull: false,
    },
    aHealthRemaining : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    fHealthRemaining : {
      type : DataTypes.INTEGER,
      allowNull: true
    },
    avatar : {
      type : DataTypes.JSONB,
      allowNull: true
    },
    foe : {
      type : DataTypes.JSONB,
      allowNull: true
    },
    bra : {
      type : DataTypes.JSONB,
      allowNull: true
    },
    brf : {
      type : DataTypes.JSONB,
      allowNull: true
    },
    aElmDamage : {
      type : DataTypes.JSONB,
      allowNull: true
    },
    aElmReduction : {
      type : DataTypes.JSONB,
      allowNull: true
    },
    fElmDamage : {
      type : DataTypes.JSONB,
      allowNull: true
    },
    fElmReduction : {
      type : DataTypes.JSONB,
      allowNull: true
    },
    roundBreakdown : {
      type : DataTypes.JSONB,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.TIME,
      defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.TIME,
      defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
      allowNull: false
    },
    seenReport : {
      type : DataTypes.BOOLEAN,
      allowNull: false,
    },    
    postBattleActions : {
      type : DataTypes.JSONB,
      allowNull: true
    },
    ptGain: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  });

  return Battle;
}

module.exports = BattleModel;