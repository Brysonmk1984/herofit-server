

const UserActivityModel = function(db, DataTypes){
  const UserActivity = db.define('user_activities', {
      id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
      },
      activity: {
          type: DataTypes.JSONB,
          allowNull: false
      },
      activityDate: {
        type: DataTypes.TIME,
        allowNull: false
        },
      user : {
          type : DataTypes.STRING,
          allowNull: false,
      },
      createdAt : {
          type : DataTypes.TIME,
          defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
          allowNull: false
      },
  });

      
     


  return UserActivity;

}

module.exports = UserActivityModel;