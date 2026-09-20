const User = require('./user');
const Store = require('./store');
const Rating = require('./rating');
const Category = require('./category');
const ReviewHelp = require('./reviewHelp');
const Favorite = require('./favorite');
const Notification = require('./notification');

// Emulates the old SQL ON DELETE CASCADE behaviour of the user relations.
async function deleteUserCascade(userId) {
  const ratings = await Rating.find({ userId }).select('_id');
  const ratingIds = ratings.map((r) => r._id);

  await Promise.all([
    ReviewHelp.deleteMany({ $or: [{ userId }, { ratingId: { $in: ratingIds } }] }),
    Rating.deleteMany({ userId }),
    Favorite.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    // Owned stores become claimable again (old SQL set ownerId to NULL)
    Store.updateMany({ ownerId: userId }, { $set: { ownerId: null } })
  ]);
}

// Emulates the old SQL cascades of the store relations.
async function deleteStoreCascade(storeId) {
  const ratings = await Rating.find({ storeId }).select('_id');
  const ratingIds = ratings.map((r) => r._id);

  await Promise.all([
    ReviewHelp.deleteMany({ ratingId: { $in: ratingIds } }),
    Rating.deleteMany({ storeId }),
    Favorite.deleteMany({ storeId })
  ]);
}

module.exports = {
  User,
  Store,
  Rating,
  Category,
  ReviewHelp,
  Favorite,
  Notification,
  deleteUserCascade,
  deleteStoreCascade
};
