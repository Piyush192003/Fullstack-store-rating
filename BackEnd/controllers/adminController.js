const { User, Store, Rating, Category, Notification } = require('../models');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');

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
      email,
      address,
      password: hashedPassword,
      role: role || 'user'
    });

    return res.json({ user });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Add store
exports.addStore = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation Errors:", errors.array()); // DEBUG ADDED
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
    console.log("SERVER ERROR:", err); // DEBUG ADDED
    return res.status(500).json({ message: err.message });
  }
};
// Dashboard summary
exports.dashboard = async (req, res) => {
  try {
    const [totalUsers, totalStores, totalRatings, flaggedReviews, pendingStores] = await Promise.all([
      User.count(),
      Store.count(),
      Rating.count(),
      Rating.count({ where: { isFlagged: true } }),
      Store.count({ where: { isApproved: false, isSuspended: false } })
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
  const safeOrder = order === 'DESC' ? 'DESC' : 'ASC';

  const where = {};
  if (role) where.role = role;
  if (q) {
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { email: { [Op.like]: `%${q}%` } },
      { address: { [Op.like]: `%${q}%` } }
    ];
  }

  const users = await User.findAll({ where, order: [[safeSortBy, safeOrder]] });

  res.json({ users });
};

// List stores with avg ratings
exports.listStores = async (req, res) => {
  const { q, sortBy = 'name', order = 'ASC' } = req.query;
  const safeSortBy = ['name', 'email', 'address'].includes(sortBy) ? sortBy : 'name';
  const safeOrder = order === 'DESC' ? 'DESC' : 'ASC';

  const where = {};
  if (q) {
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { address: { [Op.like]: `%${q}%` } }
    ];
  }

  const stores = await Store.findAll({
    where,
    include: [Rating, Category],
    order: [[safeSortBy, safeOrder]]
  });

  const result = stores.map(s => {
    const ratings = s.Ratings || [];
    const avg =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : null;

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
      category: s.Category ? s.Category.name : null,
      categoryId: s.categoryId,
      isApproved: s.isApproved,
      isSuspended: s.isSuspended,
      avgRating: avg,
      ratingCount: ratings.length
    };
  });

  res.json(result);
};

// Get single user detail
exports.getUserDetail = async (req, res) => {
  const { id } = req.params;

  const user = await User.findByPk(id, { include: Store });

  if (!user) return res.status(404).json({ message: 'User not found' });

  let ownerRating = null;

  if (user.role === 'owner') {
    const store = await Store.findOne({
      where: { ownerId: user.id },
      include: [Rating]
    });

    if (store && store.Ratings.length > 0) {
      ownerRating =
        store.Ratings.reduce((sum, r) => sum + r.rating, 0) /
        store.Ratings.length;
    }
  }

  res.json({ user, ownerRating });
};

// Toggle a user's suspended status
exports.changeUserStatus = async (req, res) => {
  const user = await User.findByPk(req.params.id);
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
  const store = await Store.findByPk(req.params.id);
  if (!store) return res.status(404).json({ message: 'Store not found' });
  const { isApproved, isSuspended } = req.body;
  if (typeof isApproved === 'boolean') store.isApproved = isApproved;
  if (typeof isSuspended === 'boolean') store.isSuspended = isSuspended;
  await store.save();

  // Notify the owner when their store gets approved (respect their prefs)
  if (store.isApproved && !store.isSuspended && store.ownerId) {
    try {
      const owner = await User.findByPk(store.ownerId);
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
  const deleted = await Store.destroy({ where: { id: req.params.id } });
  if (!deleted) return res.status(404).json({ message: 'Store not found' });
  res.json({ message: 'Store listing removed' });
};

// Delete a review (moderation)
exports.deleteReview = async (req, res) => {
  const deleted = await Rating.destroy({ where: { id: req.params.ratingId } });
  if (!deleted) return res.status(404).json({ message: 'Review not found' });
  res.json({ message: 'Review deleted' });
};

// List flagged reviews
exports.listFlaggedReviews = async (req, res) => {
  const reviews = await Rating.findAll({
    where: { isFlagged: true },
    include: [{ model: User, attributes: ['id', 'name', 'email'] }, { model: Store, attributes: ['id', 'name'] }],
    order: [['updatedAt', 'DESC']]
  });
  res.json(reviews.map((r) => ({ id: r.id, rating: r.rating, review: r.review, isFlagged: r.isFlagged, createdAt: r.createdAt, user: r.User, store: r.Store })));
};

// Clear a flag after review (reviewer: keep review, remove flag)
exports.clearFlag = async (req, res) => {
  const rating = await Rating.findByPk(req.params.ratingId);
  if (!rating) return res.status(404).json({ message: 'Review not found' });
  rating.isFlagged = false;
  await rating.save();
  res.json({ message: 'Flag cleared' });
};

// Get one store (for the admin edit form)
exports.getStoreDetail = async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'name'] }]
    });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    res.json({
      store,
      ownerName: store.owner ? store.owner.name : null
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
    const store = await Store.findByPk(req.params.id);
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const { name, email, address, ownerId, phone, description, openingHours, priceLevel, categoryId } = req.body;

    await store.update({
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

    res.json({ message: 'Store updated', store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

