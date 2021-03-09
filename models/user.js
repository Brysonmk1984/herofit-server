

const UserModel = function(db, DataTypes){
  const User = db.define('users', {
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
      username : {
        type : DataTypes.STRING,
        unique : true,
        allowNull: false,
        },
      email : {
          type : DataTypes.STRING,
          unique : true,
          allowNull: false,
      },
      firstName : {
            type : DataTypes.STRING,
            allowNull: true,
        },
        lastName : {
            type : DataTypes.STRING,
            allowNull: true,
        },
    isFake : {
        type : DataTypes.BOOLEAN,
        },
      latestActivityUpdate : {
          type : DataTypes.TIME,
          allowNull: true
      },
      stravaAccessToken: {
          type: DataTypes.CHAR,
          length : 40,
          allowNull: true
      },
      stravaAccessTokenExpiration: {
          type: DataTypes.INTEGER,
          allowNull: true
      },
      stravaRefreshToken: {
          type: DataTypes.CHAR,
          length : 40,
          allowNull: true
      },
      featurePreferenceSubmitted : {
        type : DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    seenLatestPatch : {
        type : DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    }
  });

      
     


  return User;

}

module.exports = UserModel;