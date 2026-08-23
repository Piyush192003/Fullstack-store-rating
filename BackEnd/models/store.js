const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Store', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    name: { type: DataTypes.STRING(120), allowNull: false },

    email: { type: DataTypes.STRING(100), allowNull: true },

    address: { type: DataTypes.STRING(400) },

    phone: { type: DataTypes.STRING(40), allowNull: true },

    description: { type: DataTypes.TEXT, allowNull: true },

    openingHours: { type: DataTypes.STRING(240), allowNull: true },

    priceLevel: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 4 } },

    images: { type: DataTypes.JSON, allowNull: true },

    categoryId: { type: DataTypes.INTEGER, allowNull: true },

    isApproved: { type: DataTypes.BOOLEAN, defaultValue: true },

    isSuspended: { type: DataTypes.BOOLEAN, defaultValue: false },

    ownerId: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'stores',
    timestamps: true
  });
};
