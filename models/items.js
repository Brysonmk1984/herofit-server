const ItemsModel = function(db, DataTypes){
  const Items = db.define('items', {
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
      type : {
        type : DataTypes.STRING(15),
        allowNull : false,
      },
      name : {
        type : DataTypes.STRING(35),
        allowNull : false,
      },
      description : {
        type : DataTypes.STRING(100),
        allowNull : false,
      },
      lore : {
        type : DataTypes.STRING(500),
        allowNull : true,
      },
      effect1 : {
        type : DataTypes.STRING(75),
        allowNull : true,
      },
      effect2 : {
        type : DataTypes.STRING(75),
        allowNull : true,
      },
      icon : {
        type : DataTypes.STRING(50),
        allowNull : true,
      },
      class : {
        type : DataTypes.STRING(50),
        allowNull : true,
      },
      exhaustible : {
        type : DataTypes.BOOLEAN,
        allowNull : false,
        defaultValue: false,
      },
      ptCost : {
        type : DataTypes.INTEGER,
        allowNull : true,
      },
      action : {
        type : DataTypes.STRING(25),
        allowNull : true,
      }
  }, { freezeTableName: true });

  return Items;
}

module.exports = ItemsModel;