

const UserTotalModel = function(db, DataTypes){
  const UserTotal = db.define('user_totals', {
      id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
      },
      user : {
          type : DataTypes.STRING,
          unique : true,
          allowNull: false,
          validate : {
              notEmpty :true,
          }
      },
      avatarId: {
          type: DataTypes.INTEGER,
          allowNull: false,
      },
      lastUpdate : {
        type : DataTypes.TIME,
        defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
        allowNull: false
      },
      run: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      hike: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      walk: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      ride: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      swim: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      yoga: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      weightLifting: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      stairStepper: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      elliptical: {
        type: DataTypes.TEXT,
        allowNull: true
      }
  }, {timestamps: false});

      
     


  return UserTotal;

}

module.exports = UserTotalModel;