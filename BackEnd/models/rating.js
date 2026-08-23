const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Rating', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },

    review: { type: DataTypes.TEXT, allowNull: true },

    ownerReply: { type: DataTypes.TEXT, allowNull: true },

    isFlagged: { type: DataTypes.BOOLEAN, defaultValue: false },

    userId: { type: DataTypes.INTEGER, allowNull: false },

    storeId: { type: DataTypes.INTEGER, allowNull: false }

  }, {
    tableName: 'ratings',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'storeId'] }
    ]
  });
};
