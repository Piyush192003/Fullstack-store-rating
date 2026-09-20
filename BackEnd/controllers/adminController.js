const { User, Store, Rating, Category, Notification, ReviewHelp, deleteStoreCascade } = require('../models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const likeRe = (q) => new RegExp(escapeRegex(q), 'i');
const SORT_COLLATION = { locale: 'en', strength: 2 }; // case-insensitive, like MySQL

// Full user object without the password hash (the old API leaked it)
const safeUser = (u) => {
  const json = u.toJSON ? u.toJSON() : u;
  delete json.password;
  return json;
};

// Add user
exports.addUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  const { name, email, address, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: String(email).trim().toLowerCase(),
      address,
      password: hashedPassword,
      role: role || 'user'
    });

    return res.json({ user: safeUser(user) });

  } catch (err) {
    if (err && err.code === 11000)
      return res.status(400).json({ message: 'Email already in use' });
    return res.status(500).json({ message: err.message });
  }
};

// Add store
exports.addStore = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation Errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, address, ownerId, phone, description, openingHours, priceLevel, categoryId } = req.body;

    const store = await Store.create({
      name,
      email: email || null,
      address,
      phone: phone || null,
      description: description || null,
      openingHours: openingHours || null,
      priceLevel: priceLevel ? Number(priceLevel) : null,
      categoryId: categoryId ? Number(categoryId) : null,
      ownerId: ownerId ? Number(ownerId) : null
    });

    return res.json({ store });

  } catch (err) {
    console.log('SERVER ERROR:', err);
    return res.status(500).json({ message: err.message });
  }
};

// Dashboard summary
exports.dashboard = async (req, res) => {
  try {
    const [totalUsers, totalStores, totalRatings, flaggedReviews, pendingStores] = await Promise.all([
      User.countDocuments(),
      Store.countDocuments(),
      Rating.countDocuments(),
      Rating.countDocuments({ isFlagged: true }),
      Store.countDocuments({ isApproved: false, isSuspended: false })
    ]);

    res.json({ totalUsers, totalStores, totalRatings, flaggedReviews, pendingStores });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List users
exports.listUsers = async (req, res) => {
  const { q, role, sortBy = 'name', order = 'ASC' } = req.query;
  const safeSortBy = ['name', 'email', 'address', 'role'].includes(sortBy) ? sortBy : 'name';
  const safeOrder = order === 'DESC' ? 'desc' : 'asc';

  const filter = {};
  if (role) filter.role = role;
  if (q) {
    filter.$or = [
      { name: likeRe(q) },
      { email: likeRe(q) },
      { address: likeRe(q) }
    ];
  }

  const users = await User.find(filter)
    .collation(SORT_COLLATION)
    .sort({ [safeSortBy]: safeOrder });

  res.json({ users: users.map(safeUser) });
};

// List stores with avg ratings
exports.listStores = async (req, res) => {
  const { q, sortBy = 'name', order = 'ASC' } = req.query;
  const safeSortBy = ['name', 'email', 'address'].includes(sortBy) ? sortBy : 'name';
  const safeOrder = order === 'DESC' ? 'desc' : 'asc';

  const filter = {};
  if (q) {
    filter.$or = [
      { name: likeRe(q) },
      { address: likeRe(q) }
    ];
  }

  const [stores, ratings] = await Promise.all([
    Store.find(filter).collation(SORT_COLLATION).sort({ [safeSortBy]: safeOrder }),
    Rating.find().select('storeId rating')
  ]);

  const byStore = new Map();
  ratings.forEach((r) => {
    const list = byStore.get(r.storeId) || [];
    list.push(r.rating);
    byStore.set(r.storeId, list);
  });

  const result = stores.map((s) => {
    const list = byStore.get(s.id) || [];
    const avg = list.length > 0 ? list.reduce((sum, v) => sum + v, 0) / list.length : null;
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      address: s.address,
      phone: s.phone,
      description: s.description,
      openingHours: s.openingHours,
      priceLevel: s.priceLevel,
      ownerId: s.ownerId,
      category: null,
      categoryId: s.categoryId,
      isApproved: s.isApproved,
      isSuspended: s.isSuspended,
      avgRating: avg,
      ratingCount: list.length
    };
  });

  // Resolve category names with one extra query
  const catIds = [...new Set(stores.map((s) => s.categoryId).filter((v) => v !== null && v !== undefined))];
  if (catIds.length) {
    const cats = await Category.find({ _id: { $in: catIds } }).select('name');
    const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));
    result.forEach((r) => { if (r.categoryId != null) r.category = catName[r.categoryId] || null; });
  }

  res.json(result);
};

// Get single user detail
exports.getUserDetail = async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // The old API embedded the user's store as `user.Store`
  const store = await Store.findOne({ ownerId: user.id });

  let ownerRating = null;

  if (user.role === 'owner' && store) {
    const ratings = await Rating.find({ storeId: store.id }).select('rating');
    if (ratings.length > 0)
      ownerRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  }

  res.json({ user: { ...safeUser(user), Store: store || null }, ownerRating });
};

// Toggle a user's suspended status
exports.changeUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Safety: administrator accounts can never be suspended from here,
  // otherwise the last admin could lock themselves out of the platform.
  if (user.role === 'admin')
    return res.status(403).json({ message: 'Administrator accounts cannot be suspended.' });

  user.isSuspended = !user.isSuspended;
  await user.save();
  res.json({ message: user.isSuspended ? 'User suspended' : 'User re-activated', isSuspended: user.isSuspended });
};

// Approve or suspend a store
exports.changeStoreStatus = async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ message: 'Store not found' });
  const { isApproved, isSuspended } = req.body;
  if (typeof isApproved === 'boolean') store.isApproved = isApproved;
  if (typeof isSuspended === 'boolean') store.isSuspended = isSuspended;
  await store.save();

  // Notify the owner when their store gets approved (respect their prefs)
  if (store.isApproved && !store.isSuspended && store.ownerId) {
    try {
      const owner = await User.findById(store.ownerId);
      const prefs = (owner && owner.settings && owner.settings.notif) || {};
      if (prefs.storeUpdates !== false)
        await Notification.create({
          userId: store.ownerId,
          title: 'Your store is live',
          body: `"${store.name}" was approved and is now visible to customers.`
        });
    } catch {}
  }

  res.json({ message: store.isSuspended ? 'Store suspended' : store.isApproved ? 'Store approved' : 'Store updated', store });
};

// Reject / permanently remove a store listing
exports.deleteStore = async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) return res.status(404).json({ message: 'Store not found' });
  await deleteStoreCascade(store.id);
  await store.deleteOne();
  res.json({ message: 'Store listing removed' });
};

// Delete a review (moderation)
exports.deleteReview = async (req, res) => {
  const rating = await Rating.findById(req.params.ratingId);
  if (!rating) return res.status(404).json({ message: 'Review not found' });
  await ReviewHelp.deleteMany({ ratingId: rating.id });
  await rating.deleteOne();
  res.json({ message: 'Review deleted' });
};

// List flagged reviews
exports.listFlaggedReviews = async (req, res) => {
  const reviews = await Rating.find({ isFlagged: true }).sort({ updatedAt: -1 });

  const [users, stores] = await Promise.all([
    User.find({ _id: { $in: [...new Set(reviews.map((r) => r.userId))] } }).select('name email'),
    Store.find({ _id: { $in: [...new Set(reviews.map((r) => r.storeId))] } }).select('name')
  ]);

  const userById = Object.fromEntries(users.map((u) => [u.id, u]));
  const storeById = Object.fromEntries(stores.map((s) => [s.id, s]));

  res.json(reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    review: r.review,
    isFlagged: r.isFlagged,
    createdAt: r.createdAt,
    user: userById[r.userId] || null,
    store: storeById[r.storeId] || null
  })));
};

// Clear a flag after review (reviewer: keep review, remove flag)
exports.clearFlag = async (req, res) => {
  const rating = await Rating.findById(req.params.ratingId);
  if (!rating) return res.status(404).json({ message: 'Review not found' });
  rating.isFlagged = false;
  await rating.save();
  res.json({ message: 'Flag cleared' });
};

// Get one store (for the admin edit form)
exports.getStoreDetail = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const owner = store.ownerId ? await User.findById(store.ownerId).select('name') : null;
    res.json({
      store,
      ownerName: owner ? owner.name : null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update a store's details
exports.updateStore = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const { name, email, address, ownerId, phone, description, openingHours, priceLevel, categoryId } = req.body;

    Object.assign(store, {
      name: String(name).trim(),
      email: email || null,
      address: address || null,
      phone: phone || null,
      description: description || null,
      openingHours: openingHours || null,
      priceLevel: priceLevel ? Number(priceLevel) : null,
      categoryId: categoryId ? Number(categoryId) : null,
      ownerId: ownerId ? Number(ownerId) : null
    });

    await store.save();

    res.json({ message: 'Store updated', store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};