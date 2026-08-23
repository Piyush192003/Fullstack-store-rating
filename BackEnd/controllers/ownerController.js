const { Store, Rating, User, ReviewHelp, Category, Notification } = require('../models');
const { Op } = require('sequelize');

function helpfulCount(reviewHelps) {
  return (reviewHelps || []).length;
}

// Get all ratings for owner store plus trends and stats
exports.myStoreRatings = async (req, res) => {
  const store = await Store.findOne({
    where: { ownerId: req.user.id },
    include: [
      { model: Rating, include: [{ model: User }, { model: ReviewHelp }] },
      { model: Category }
    ]
  });

  if (!store)
    return res.status(404).json({ message: 'Store not found for this owner' });

  const ratings = store.Ratings || [];
  const ratingsCount = ratings.length;
  const avg = ratingsCount
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratingsCount
    : null;

  const positive = ratings.filter((r) => r.rating >= 4).length;
  const positivePercent = ratingsCount ? Math.round((positive / ratingsCount) * 100) : 0;

  // Trend: ratings this month vs last month (full months)
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthCount = ratings.filter((r) => new Date(r.createdAt) >= thisMonth).length;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthCount = ratings.filter((r) => new Date(r.createdAt) >= lastMonth && new Date(r.createdAt) < thisMonth).length;
  let trendPercent = 0;
  if (lastMonthCount > 0) trendPercent = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
  else if (thisMonthCount > 0) trendPercent = 100;

  const reviewList = ratings.map((r) => ({
    id: r.id,
    rating: r.rating,
    review: r.review,
    ownerReply: r.ownerReply,
    isFlagged: r.isFlagged,
    createdAt: r.createdAt,
    user: r.User ? { id: r.User.id, name: r.User.name, email: r.User.email } : null,
    helpful: helpfulCount(r.ReviewHelps)
  }));

  res.json({
    store: {
      id: store.id,
      name: store.name,
      address: store.address,
      email: store.email,
      phone: store.phone,
      description: store.description,
      openingHours: store.openingHours,
      priceLevel: store.priceLevel,
      category: store.Category ? store.Category.name : null,
      categoryId: store.categoryId,
      images: Array.isArray(store.images) ? store.images : [],
      isApproved: store.isApproved
    },
    avgRating: avg,
    ratingCount: ratingsCount,
    positivePercent,
    trendPercent,
    thisMonthCount,
    ratings: reviewList
  });
};

// Update owner store information
exports.updateStore = async (req, res) => {
  const store = await Store.findOne({ where: { ownerId: req.user.id } });
  if (!store)
    return res.status(404).json({ message: 'Store not found for this owner' });

  const { name, address, email, phone, description, openingHours, priceLevel, categoryId } = req.body;
  if (name !== undefined) store.name = name;
  if (address !== undefined) store.address = address;
  if (email !== undefined) store.email = email;
  if (phone !== undefined) store.phone = phone;
  if (description !== undefined) store.description = description;
  if (openingHours !== undefined) store.openingHours = openingHours;
  if (priceLevel !== undefined) store.priceLevel = Number(priceLevel) || null;
  if (categoryId !== undefined) store.categoryId = categoryId ? Number(categoryId) : null;

  await store.save();
  res.json({ message: 'Store updated', store });
};

// Reply to a customer review
exports.replyToReview = async (req, res) => {
  const store = await Store.findOne({ where: { ownerId: req.user.id } });
  if (!store)
    return res.status(404).json({ message: 'Store not found for this owner' });

  const rating = await Rating.findOne({ where: { id: req.params.ratingId, storeId: store.id } });
  if (!rating)
    return res.status(404).json({ message: 'Review not found for this store' });

  const { reply } = req.body;
  if (!reply || !reply.trim())
    return res.status(400).json({ message: 'Reply text required' });

  rating.ownerReply = reply.trim();
  await rating.save();

  // Notify the reviewer that the store responded (respect their notification prefs)
  try {
    const reviewer = await User.findByPk(rating.userId);
    const prefs = (reviewer && reviewer.settings && reviewer.settings.notif) || {};
    if (prefs.replies !== false)
      await Notification.create({
        userId: rating.userId,
        title: 'Reply to your review',
        body: `"${store.name}" responded to your review.`
      });
  } catch {}

  res.json({ message: 'Reply posted', ownerReply: rating.ownerReply });
};

// Report an abusive/fake review
exports.reportReview = async (req, res) => {
  const rating = await Rating.findByPk(req.params.ratingId);
  if (!rating)
    return res.status(404).json({ message: 'Review not found' });

  rating.isFlagged = true;
  await rating.save();
  res.json({ message: 'Review reported for review by moderators' });
};

// Change owner password
exports.changePassword = async (req, res) => {
  const bcrypt = require('bcrypt');
  const { password } = req.body;

  if (!password)
    return res.status(400).json({ message: 'Password required' });

  req.user.password = await bcrypt.hash(password, 10);
  await req.user.save();

  res.json({ message: 'Password updated successfully' });
};

// Register a brand-new store (owners without a store yet)
exports.registerStore = async (req, res) => {
  try {
    const existing = await Store.findOne({ where: { ownerId: req.user.id } });
    if (existing)
      return res.status(400).json({ message: 'You already manage a store.' });

    const { name, address, email, phone, description, openingHours, priceLevel, categoryId } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ message: 'Store name is required' });

    const store = await Store.create({
      name: name.trim(),
      address: address || null,
      email: email || null,
      phone: phone || null,
      description: description || null,
      openingHours: openingHours || null,
      priceLevel: priceLevel ? Number(priceLevel) : null,
      categoryId: categoryId ? Number(categoryId) : null,
      ownerId: req.user.id,
      isApproved: false // needs admin approval before going live
    });

    res.json({ message: 'Store registered successfully.', store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Stores without an owner that can be claimed
exports.listUnclaimedStores = async (req, res) => {
  try {
    const stores = await Store.findAll({
      where: { ownerId: null },
      attributes: ['id', 'name', 'address'],
      order: [['name', 'ASC']]
    });
    res.json(stores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Claim an existing unowned store
exports.claimStore = async (req, res) => {
  try {
    const existing = await Store.findOne({ where: { ownerId: req.user.id } });
    if (existing)
      return res.status(400).json({ message: 'You already manage a store.' });

    const storeId = Number(req.body.storeId);
    if (!storeId)
      return res.status(400).json({ message: 'Store ID required' });

    const store = await Store.findOne({ where: { id: storeId, ownerId: null } });
    if (!store)
      return res.status(404).json({ message: 'That store is not available to claim.' });

    store.ownerId = req.user.id;
    await store.save();

    res.json({ message: `You are now the owner of "${store.name}".`, store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upload store images (multipart, field name "images")
exports.uploadImages = async (req, res) => {
  try {
    const store = await Store.findOne({ where: { ownerId: req.user.id } });
    if (!store)
      return res.status(404).json({ message: 'Store not found for this owner' });

    const files = req.files || [];
    if (!files.length)
      return res.status(400).json({ message: 'Select at least one image.' });

    const current = Array.isArray(store.images) ? store.images : [];
    if (current.length + files.length > 6) {
      const fs = require('fs');
      files.forEach((f) => { try { fs.unlinkSync(f.path); } catch {} });
      return res.status(400).json({ message: 'You can store up to 6 images. Remove one first.' });
    }

    store.images = [...current, ...files.map((f) => `/uploads/${f.filename}`)];
    await store.save();

    res.json({ message: 'Images uploaded.', images: store.images });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Remove one store image by its index
exports.deleteImage = async (req, res) => {
  try {
    const store = await Store.findOne({ where: { ownerId: req.user.id } });
    if (!store)
      return res.status(404).json({ message: 'Store not found for this owner' });

    const index = Number(req.params.index);
    const images = Array.isArray(store.images) ? [...store.images] : [];
    if (!Number.isInteger(index) || index < 0 || index >= images.length)
      return res.status(400).json({ message: 'Invalid image selected.' });

    const removed = images.splice(index, 1)[0];
    store.images = images;
    await store.save();

    // Best-effort delete from disk (basename prevents path traversal)
    const fs = require('fs');
    const path = require('path');
    const UPLOADS = path.join(__dirname, '..', 'uploads');
    const full = path.join(UPLOADS, path.basename(removed));
    if (full.startsWith(UPLOADS)) fs.promises.unlink(full).catch(() => {});

    res.json({ message: 'Image removed.', images: store.images });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

