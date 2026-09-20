const { Store, Rating, Category, ReviewHelp, User, Favorite, Notification, deleteStoreCascade } = require('../models');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const likeRe = (q) => new RegExp(escapeRegex(q), 'i');
const SORT_COLLATION = { locale: 'en', strength: 2 }; // case-insensitive, like MySQL

function distribution(ratings) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (ratings || []).forEach((r) => { if (dist[r.rating] !== undefined) dist[r.rating] += 1; });
  return dist;
}

function helpfulInfo(reviewHelps, userId) {
  return {
    count: (reviewHelps || []).length,
    mine: (reviewHelps || []).some((h) => h.userId === userId)
  };
}

// Get the signed-in user's own profile without exposing the password hash.
exports.getProfile = async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      address: req.user.address,
      phone: req.user.phone,
      role: req.user.role,
      isGuest: !!req.user.isGuest,
      createdAt: req.user.createdAt
    }
  });
};

// Get list of stores for user with filters, aggregation, and rating distribution
exports.listStores = async (req, res) => {
  const { q, category, price, sortBy = 'name', order = 'ASC' } = req.query;

  const filter = { isApproved: true, isSuspended: false };
  if (q) {
    filter.$or = [
      { name: likeRe(q) },
      { address: likeRe(q) }
    ];
  }
  if (category) filter.categoryId = Number(category);
  if (price) filter.priceLevel = Number(price);

  const stores = await Store.find(filter).collation(SORT_COLLATION).sort({ name: 1 });

  const [ratings, categories] = await Promise.all([
    Rating.find({ storeId: { $in: stores.map((s) => s.id) } }).select('storeId userId rating review'),
    Category.find().select('name')
  ]);

  const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const result = stores
    .map((s) => {
      const storeRatings = ratings.filter((r) => r.storeId === s.id);
      const avg = storeRatings.length ? storeRatings.reduce((sum, r) => sum + r.rating, 0) / storeRatings.length : null;
      const userRating = storeRatings.find((r) => r.userId === req.user.id);
      return {
        id: s.id,
        name: s.name,
        address: s.address,
        phone: s.phone,
        description: s.description,
        openingHours: s.openingHours,
        priceLevel: s.priceLevel,
        category: s.categoryId ? catName[s.categoryId] || null : null,
        categoryId: s.categoryId,
        avgRating: avg,
        ratingCount: storeRatings.length,
        distribution: distribution(storeRatings),
        userRating: userRating ? { rating: userRating.rating, review: userRating.review, ratingId: userRating.id } : null
      };
    })
    .sort((a, b) => {
      const nameCmp = (x, y) => { const ax = (x.name || '').toLowerCase(); const bx = (y.name || '').toLowerCase(); return ax < bx ? -1 : ax > bx ? 1 : 0; };
      const ratingCmp = (x, y) => (x.avgRating || 0) - (y.avgRating || 0);
      if (sortBy === 'ratingDesc') return ratingCmp(b, a);
      if (sortBy === 'ratingAsc') return ratingCmp(a, b);
      if (sortBy === '-name' || order === 'DESC') return nameCmp(b, a);
      return nameCmp(a, b);
    });

  res.json(result);
};

// Get one store with a full review list
exports.getStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);

    // Hidden stores are invisible to normal users (admins may preview them)
    const hidden = !store || !store.isApproved || store.isSuspended;
    if (hidden && req.user.role !== 'admin')
      return res.status(404).json({ message: 'Store not found' });
    if (!store)
      return res.status(404).json({ message: 'Store not found' });

    const ratings = await Rating.find({ storeId: store.id });

    const [category, helps, users] = await Promise.all([
      store.categoryId ? Category.findById(store.categoryId) : Promise.resolve(null),
      ReviewHelp.find({ ratingId: { $in: ratings.map((r) => r.id) } }).select('ratingId userId'),
      User.find({ _id: { $in: [...new Set(ratings.map((r) => r.userId))] } }).select('name')
    ]);

    const userName = Object.fromEntries(users.map((u) => [u.id, u.name]));
    const helpsByRating = {};
    helps.forEach((h) => { (helpsByRating[h.ratingId] = helpsByRating[h.ratingId] || []).push(h); });

    const avg = ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null;

    const reviews = ratings
      .map((r) => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        ownerReply: r.ownerReply,
        isFlagged: r.isFlagged,
        createdAt: r.createdAt,
        user: userName[r.userId] ? { id: r.userId, name: userName[r.userId] } : null,
        helpful: helpfulInfo(helpsByRating[r.id], req.user.id)
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        email: store.email,
        description: store.description,
        openingHours: store.openingHours,
        priceLevel: store.priceLevel,
        category: category ? category.name : null,
        images: Array.isArray(store.images) ? store.images : []
      },
      avgRating: avg,
      ratingCount: ratings.length,
      distribution: distribution(ratings),
      reviews
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Submit or update rating and review for a store
exports.submitRating = async (req, res) => {
  const { storeId, rating, review } = req.body;

  if (!storeId || !rating)
    return res.status(400).json({ message: 'storeId and rating required' });

  if (rating < 1 || rating > 5)
    return res.status(400).json({ message: 'Rating must be 1 to 5' });

  if (review !== undefined && typeof review === 'string' && review.length > 4000)
    return res.status(400).json({ message: 'Review must be under 4000 characters' });

  const store = await Store.findById(storeId);
  if (!store)
    return res.status(404).json({ message: 'Store not found' });

  let existing = await Rating.findOne({ userId: req.user.id, storeId: store.id });

  if (existing) {
    existing.rating = rating;
    if (typeof review === 'string') existing.review = review || null;
    await existing.save();
    return res.json({ message: 'Rating updated', rating: existing });
  }

  const newRating = await Rating.create({
    userId: req.user.id,
    storeId: store.id,
    rating,
    review: review || null
  });

  return res.json({ message: 'Rating and review added', rating: newRating });
};

// Delete own rating/review for a store
exports.deleteRating = async (req, res) => {
  const { storeId } = req.params;
  const deleted = await Rating.deleteOne({ userId: req.user.id, storeId });
  if (!deleted.deletedCount) return res.status(404).json({ message: 'Rating not found' });
  res.json({ message: 'Rating deleted' });
};

// Toggle helpful vote on a review
exports.toggleHelpful = async (req, res) => {
  const ratingId = Number(req.params.ratingId);
  if (!Number.isInteger(ratingId))
    return res.status(404).json({ message: 'Review not found' });

  const rating = await Rating.findById(ratingId);
  if (!rating) return res.status(404).json({ message: 'Review not found' });

  const existing = await ReviewHelp.findOne({ ratingId, userId: req.user.id });
  if (existing) {
    await existing.deleteOne();
    return res.json({ message: 'Removed helpful', helpful: false });
  }
  await ReviewHelp.create({ ratingId, userId: req.user.id });

  // Notify the review author when someone likes their review (respect their prefs)
  if (rating.userId && rating.userId !== req.user.id) {
    try {
      const author = await User.findById(rating.userId);
      const prefs = (author && author.settings && author.settings.notif) || {};
      if (prefs.likes !== false) {
        const store = await Store.findById(rating.storeId).select('name');
        await Notification.create({
          userId: rating.userId,
          title: 'Someone liked your review',
          body: store ? `Your review of "${store.name}" was marked helpful.` : 'Your review was marked helpful.'
        });
      }
    } catch {}
  }

  return res.json({ message: 'Marked helpful', helpful: true });
};

// Change password
exports.changePassword = async (req, res) => {
  const { password } = req.body;
  const bcrypt = require('bcrypt');

  if (!password)
    return res.status(400).json({ message: 'Password required' });

  const hashed = await bcrypt.hash(password, 10);

  req.user.password = hashed;
  await req.user.save();

  res.json({ message: 'Password updated successfully' });
};

// ---------- My Ratings & Reviews ----------
exports.myReviews = async (req, res) => {
  try {
    const ratings = await Rating.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const stores = await Store.find({ _id: { $in: [...new Set(ratings.map((r) => r.storeId))] } })
      .select('name address images');
    const storeById = Object.fromEntries(stores.map((s) => [s.id, s]));

    res.json(ratings.map((r) => {
      const s = storeById[r.storeId];
      return {
        id: r.id,
        rating: r.rating,
        review: r.review,
        ownerReply: r.ownerReply,
        createdAt: r.createdAt,
        store: s ? {
          id: s.id,
          name: s.name,
          address: s.address,
          images: Array.isArray(s.images) ? s.images : []
        } : null
      };
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Favorites ----------
exports.favoriteIds = async (req, res) => {
  try {
    const rows = await Favorite.find({ userId: req.user.id }).select('storeId');
    res.json(rows.map((r) => r.storeId));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listFavorites = async (req, res) => {
  try {
    const favs = await Favorite.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const stores = await Store.find({ _id: { $in: favs.map((f) => f.storeId) } });
    const ratings = await Rating.find({ storeId: { $in: favs.map((f) => f.storeId) } }).select('storeId userId rating');
    const categories = await Category.find().select('name');

    const storeById = Object.fromEntries(stores.map((s) => [s.id, s]));
    const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    res.json(favs.filter((f) => storeById[f.storeId]).map((f) => {
      const s = storeById[f.storeId];
      const storeRatings = ratings.filter((r) => r.storeId === s.id);
      const avg = storeRatings.length ? storeRatings.reduce((sum, r) => sum + r.rating, 0) / storeRatings.length : null;
      const mine = storeRatings.find((r) => r.userId === req.user.id);
      return {
        id: s.id,
        name: s.name,
        address: s.address,
        priceLevel: s.priceLevel,
        images: Array.isArray(s.images) ? s.images : [],
        category: s.categoryId ? catName[s.categoryId] || null : null,
        avgRating: avg,
        ratingCount: storeRatings.length,
        userRating: mine ? { rating: mine.rating } : null
      };
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const storeId = Number(req.params.storeId);
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const existing = await Favorite.findOne({ userId: req.user.id, storeId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ favorited: false, message: 'Removed from favorites' });
    }
    await Favorite.create({ userId: req.user.id, storeId });
    return res.json({ favorited: true, message: 'Added to favorites' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Notifications ----------
exports.getNotifications = async (req, res) => {
  try {
    const items = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ items, unread: items.filter((n) => !n.isRead).length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { $set: { isRead: true } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};