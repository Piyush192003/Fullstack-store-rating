const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    name: { type: DataTypes.STRING(60), allowNull: false },

    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },

    address: { type: DataTypes.STRING(400) },

    phone: { type: DataTypes.STRING(40), allowNull: true },

    isSuspended: { type: DataTypes.BOOLEAN, defaultValue: false },

    password: { type: DataTypes.STRING, allowNull: false },

    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },

    profilePhoto: { type: DataTypes.STRING(500), allowNull: true },

    // Bumped to invalidate every issued JWT (sign-out of all devices)
    tokenVersion: { type: DataTypes.INTEGER, defaultValue: 0 },

    // Notification / location / appearance / preference settings
    settings: { type: DataTypes.JSON, allowNull: true },

    role: {
      type: DataTypes.ENUM('admin', 'user', 'owner'),
      defaultValue: 'user'
    }
  }, {
    tableName: 'users',
    timestamps: true
  });
};
