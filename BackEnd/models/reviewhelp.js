const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ReviewHelp', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ratingId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'review_helps',
    timestamps: true,
    indexes: [{ unique: true, fields: ['ratingId', 'userId'] }]
  });
};
