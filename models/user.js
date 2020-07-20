const UserModel = function(db, DataTypes){
  const User = db.define('Users', {
    latestActivityDate : {
      type : DataTypes.TIME,
    },
    email : {
      type : DataTypes.STRING,
      unique : true,
      validate : {
        notEmpty :true,
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
    }
  });

  return User;
};

module.exports = UserModel;