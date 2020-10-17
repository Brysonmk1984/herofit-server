const AvatarModel = function(db, DataTypes){
  const Avatar = db.define('avatars', {
      id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
      },
      createdAt: {
          type: DataTypes.TIME,
          defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
          allowNull: false
      },
      isFake : {
        type : DataTypes.BOOLEAN,
      },
      status: {
        type: DataTypes.TEXT,
        defaultValue: 'Rested',
        allowNull: false
      },
      goToBattle: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      owner : {
          type : DataTypes.STRING,
          unique : true,
          validate : {
              notEmpty :true,
          }
      },
      
      ownerUsername : {
        type : DataTypes.STRING,
        unique : true,
        validate : {
            notEmpty :true,
        }
      },
      hasBeenUpgraded : {
        type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false
      },
      name : {
        type : DataTypes.STRING,
        unique : true,
        validate : {
            notEmpty :true,
        }
      },
      character : {
        type : DataTypes.STRING,
        validate : {
            notEmpty :true,
        }
      },
      power : {
          type : DataTypes.INTEGER,
          unique : true,
          validate : {
              notEmpty :true,
          }
      },
      health : {
        type : DataTypes.INTEGER,
        unique : true,
        validate : {
            notEmpty :true,
        }
      },
      maxHealth: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
      },
      fire: {
        type: DataTypes.NUMERIC,
        precision : 7,
        scale : 2,
        allowNull: false,
        defaultValue: 0,
      },
      earth: {
        type: DataTypes.NUMERIC,
        precision : 7,
        scale : 2,
        allowNull: false,
        defaultValue: 0,
      },
      air: {
        type: DataTypes.NUMERIC,
        precision : 7,
        scale : 2,
        allowNull: false,
        defaultValue: 0,
      },
      water: {
        type: DataTypes.NUMERIC,
        precision : 7,
        scale : 2,
        allowNull: false,
        defaultValue: 0,
      },
      armor: {
        type: DataTypes.NUMERIC,
        precision : 7,
        scale : 2,
        allowNull: false,
        defaultValue: 0,
      },
      recovery: {
        type: DataTypes.NUMERIC,
        precision : 7,
        scale : 2,
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
      qpItems: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      qpHealth: {
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
      items: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      titles: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      pets: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      skills: {
        type: DataTypes.JSONB,
        allowNull: true
      }
  });

  return Avatar;
}

module.exports = AvatarModel;