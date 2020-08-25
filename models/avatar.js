

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
        type : DataTypes.CHAR,
        unique : true,
        length : 40,
        validate : {
            notEmpty :true,
        }
      },
      character : {
        type : DataTypes.CHAR,
        length : 40,
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
          length : 250,
          allowNull: true
      },
      elements: {
        type: DataTypes.CHAR,
        length : 100,
        allowNull: true
      },
      items: {
        type: DataTypes.CHAR,
        length : 250,
        allowNull: true
      },
  });

  return Avatar;
}

module.exports = AvatarModel;