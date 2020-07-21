

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
          validate : {
              notEmpty :true,
          }
      },
      email : {
          type : DataTypes.STRING,
          unique : true,
          validate : {
              notEmpty :true,
              // ENABLE WHEN READY
              isUnique : function(value, next){
                  User.find({
                      where: {email: value},
                      attributes: ['id']
                  })
                  .done(function(error, user) {
                      if (error){
                          // Some unexpected error occured with the find method.
                          return next(error);
                      }
                      if (user){
                          // We found a user with this email address.
                          // Pass the error to the next method.
                          return next('Email address already in use!');
                      }
                      // If we got this far, the email address hasn't been used yet.
                      // Call next with no arguments when validation is successful.
                      next();
                  });
  
              }
          }
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
  });

      
     


  return User;

}

module.exports = UserModel;