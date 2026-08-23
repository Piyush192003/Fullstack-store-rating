const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const User = require('./user')(sequelize);
const Store = require('./store')(sequelize);
const Rating = require('./rating')(sequelize);
const Category = require('./category')(sequelize);
const ReviewHelp = require('./reviewhelp')(sequelize);
const Favorite = require('./favorite')(sequelize);
const Notification = require('./notification')(sequelize);

// Relations
User.hasMany(Rating, { foreignKey: 'userId', onDelete: 'CASCADE' });
Rating.belongsTo(User, { foreignKey: 'userId' });

Store.hasMany(Rating, { foreignKey: 'storeId', onDelete: 'CASCADE' });
Rating.belongsTo(Store, { foreignKey: 'storeId' });

User.hasOne(Store, { foreignKey: 'ownerId' });
Store.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });

// Categories
Category.hasMany(Store, { foreignKey: 'categoryId' });
Store.belongsTo(Category, { foreignKey: 'categoryId' });

// Helpful votes
Rating.hasMany(ReviewHelp, { foreignKey: 'ratingId', onDelete: 'CASCADE' });
ReviewHelp.belongsTo(Rating, { foreignKey: 'ratingId' });
User.hasMany(ReviewHelp, { foreignKey: 'userId', onDelete: 'CASCADE' });
ReviewHelp.belongsTo(User, { foreignKey: 'userId' });

// Favorites
User.hasMany(Favorite, { foreignKey: 'userId', onDelete: 'CASCADE' });
Favorite.belongsTo(User, { foreignKey: 'userId' });
Store.hasMany(Favorite, { foreignKey: 'storeId', onDelete: 'CASCADE' });
Favorite.belongsTo(Store, { foreignKey: 'storeId' });

// Notifications
User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });

module.exports = {
  sequelize,
  User,
  Store,
  Rating,
  Category,
  ReviewHelp,
  Favorite,
  Notification
};
