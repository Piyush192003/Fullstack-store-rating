const { Store, Rating, Category, ReviewHelp, User, Favorite, Notification } = require('../models');
const { Op } = require('sequelize');

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
      createdAt: req.user.createdAt
    }
  });
};

// Get list of stores for user with filters, aggregation, and rating distribution
exports.listStores = async (req, res) => {
  const { q, category, price, sortBy = 'name', order = 'ASC' } = req.query;
  const safeOrder = order === 'DESC' ? 'DESC' : 'ASC';

  const where = { isApproved: true, isSuspended: false };
  if (q) {
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { address: { [Op.like]: `%${q}%` } }
    ];
  }
  if (category) where.categoryId = Number(category);
  if (price) where.priceLevel = Number(price);

  const stores = await Store.findAll({
    where,
    include: [
      { model: Rating, as: 'Ratings' },
      { model: Category }
    ]
  });

  const result = stores
    .map((s) => {
      const ratings = s.Ratings || [];
      const avg = ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null;
      const userRating = ratings.find((r) => r.userId === req.user.id);
      return {
        id: s.id,
        name: s.name,
        address: s.address,
        phone: s.phone,
        description: s.description,
        openingHours: s.openingHours,
        priceLevel: s.priceLevel,
        category: s.Category ? s.Category.name : null,
        categoryId: s.categoryId,
        avgRating: avg,
        ratingCount: ratings.length,
        distribution: distribution(ratings),
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
    const store = await Store.findByPk(req.params.id, {
      include: [
        { model: Category },
        { model: Rating, as: 'Ratings', include: [{ model: ReviewHelp }, { model: User }] }
      ]
    });

    // Hidden stores are invisible to normal users (admins may preview them)
    const hidden = !store || !store.isApproved || store.isSuspended;
    if (hidden && req.user.role !== 'admin')
      return res.status(404).json({ message: 'Store not found' });
    if (!store)
      return res.status(404).json({ message: 'Store not found' });

    const ratings = store.Ratings || [];
    const avg = ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null;

    const reviews = ratings
      .map((r) => ({
        id: r.id,
        rating: r.rating,
        review: r.review,
        ownerReply: r.ownerReply,
        isFlagged: r.isFlagged,
        createdAt: r.createdAt,
        user: r.User ? { id: r.User.id, name: r.User.name } : null,
        helpful: helpfulInfo(r.ReviewHelps, req.user.id)
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
        category: store.Category ? store.Category.name : null,
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

  const store = await Store.findByPk(storeId);
  if (!store)
    return res.status(404).json({ message: 'Store not found' });

  let existing = await Rating.findOne({
    where: { userId: req.user.id, storeId }
  });

  if (existing) {
    existing.rating = rating;
    if (typeof review === 'string') existing.review = review || null;
    await existing.save();
    return res.json({ message: 'Rating updated', rating: existing });
  }

  const newRating = await Rating.create({
    userId: req.user.id,
    storeId,
    rating,
    review: review || null
  });

  return res.json({ message: 'Rating and review added', rating: newRating });
};

// Delete own rating/review for a store
exports.deleteRating = async (req, res) => {
  const { storeId } = req.params;
  const deleted = await Rating.destroy({
    where: { userId: req.user.id, storeId }
  });
  if (!deleted) return res.status(404).json({ message: 'Rating not found' });
  res.json({ message: 'Rating deleted' });
};

// Toggle helpful vote on a review
exports.toggleHelpful = async (req, res) => {
  const ratingId = Number(req.params.ratingId);
  const rating = await Rating.findByPk(ratingId);
  if (!rating) return res.status(404).json({ message: 'Review not found' });

  const existing = await ReviewHelp.findOne({ where: { ratingId, userId: req.user.id } });
  if (existing) {
    await existing.destroy();
    return res.json({ message: 'Removed helpful', helpful: false });
  }
  await ReviewHelp.create({ ratingId, userId: req.user.id });

  // Notify the review author when someone likes their review (respect their prefs)
  if (rating.userId && rating.userId !== req.user.id) {
    try {
      const author = await User.findByPk(rating.userId);
      const prefs = (author && author.settings && author.settings.notif) || {};
      if (prefs.likes !== false) {
        const store = await Store.findByPk(rating.storeId, { attributes: ['name'] });
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
    const ratings = await Rating.findAll({
      where: { userId: req.user.id },
      include: [{ model: Store, attributes: ['id', 'name', 'address', 'images'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(ratings.map((r) => ({
      id: r.id,
      rating: r.rating,
      review: r.review,
      ownerReply: r.ownerReply,
      createdAt: r.createdAt,
      store: r.Store ? {
        id: r.Store.id,
        name: r.Store.name,
        address: r.Store.address,
        images: Array.isArray(r.Store.images) ? r.Store.images : []
      } : null
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ---------- Favorites ----------
exports.favoriteIds = async (req, res) => {
  try {
    const rows = await Favorite.findAll({ where: { userId: req.user.id }, attributes: ['storeId'] });
    res.json(rows.map((r) => r.storeId));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listFavorites = async (req, res) => {
  try {
    const favs = await Favorite.findAll({
      where: { userId: req.user.id },
      include: [{ model: Store, include: [Rating, Category] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(favs.filter((f) => f.Store).map((f) => {
      const s = f.Store;
      const ratings = s.Ratings || [];
      const avg = ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null;
      const mine = ratings.find((r) => r.userId === req.user.id);
      return {
        id: s.id,
        name: s.name,
        address: s.address,
        priceLevel: s.priceLevel,
        images: Array.isArray(s.images) ? s.images : [],
        category: s.Category ? s.Category.name : null,
        avgRating: avg,
        ratingCount: ratings.length,
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
    const store = await Store.findByPk(storeId);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const existing = await Favorite.findOne({ where: { userId: req.user.id, storeId } });
    if (existing) {
      await existing.destroy();
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
    const items = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json({ items, unread: items.filter((n) => !n.isRead).length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

