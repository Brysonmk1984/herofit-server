

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
      skills: {
          type: DataTypes.CHAR,
          allowNull: true
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
      items: {
        type: DataTypes.CHAR,
        allowNull: true
      },
      titles: {
        type: DataTypes.CHAR,
        allowNull: true
      },
      pets: {
        type: DataTypes.CHAR,
        allowNull: true
      },
  });

  return Avatar;
}

module.exports = AvatarModel;