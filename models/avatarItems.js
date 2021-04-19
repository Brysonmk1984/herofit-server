const AvatarItemsModel = function(db, DataTypes){
  const AvatarItems = db.define('avatar_items', {
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
      updatedAt: {
        type: DataTypes.TIME,
        defaultValue: DataTypes.literal('CURRENT_TIMESTAMP'),
        allowNull: false
    },
      avatarID : {
        type : DataTypes.INTEGER,
        allowNull: false,
      },
      itemID : {
        type : DataTypes.INTEGER,
        allowNull: false,
      },
      equipped : {
        type : DataTypes.BOOLEAN,
        allowNull : false,
        defaultValue: false,
      },
  }, { freezeTableName: true });

  return AvatarItems;
}

module.exports = AvatarItemsModel;