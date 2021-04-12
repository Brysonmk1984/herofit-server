const AvatarEquipModel = function(db, DataTypes){
  const AvatarEquip = db.define('avatar_equip', {
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
      avatarID : {
        type : DataTypes.INTEGER,
        allowNull: false,
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
      equipped : {
        type : DataTypes.BOOLEAN,
        allowNull : false,
        defaultValue: false,
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
      stackable : {
        type : DataTypes.BOOLEAN,
        allowNull : false,
        defaultValue: false,
      },
  }, { freezeTableName: true });

  return AvatarEquip;
}

module.exports = AvatarEquipModel;