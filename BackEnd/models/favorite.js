const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Favorite', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    storeId: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'favorites',
    timestamps: true,
    indexes: [{ unique: true, fields: ['userId', 'storeId'] }]
  });
};