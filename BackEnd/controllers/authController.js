const { User, Store, Category, deleteUserCascade } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
require('dotenv').config();

const signToken = (user) =>
  jwt.sign(
    { id: user.id, tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isGuest: !!user.isGuest
});

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  let { name, email, address, phone, password, role, storeName, storeAddress } = req.body;

  try {
    // SECURITY: 'admin' accounts can only be created by an already-authenticated admin.
    // The public signup form can never mint an administrator.
    if (role === 'admin') {
      const authHeader = req.headers.authorization || '';
      let requester = null;
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        requester = await User.findById(decoded.id);
      } catch {}
      if (!requester || requester.role !== 'admin')
        return res.status(403).json({ message: 'Not allowed. Administrator accounts can only be created by an existing administrator.' });
    }

    // Sanitize role — public signups may only become a customer or a store owner
    if (!['user', 'owner'].includes(role)) role = 'user';

    email = String(email).trim().toLowerCase();

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: 'Email already in use' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      address,
      phone: phone || null,
      password: hashedPassword,
      role
    });

    // If user is store owner
    if (role === 'owner' && storeName) {
      await Store.create({
        name: storeName,
        address: storeAddress || '',
        ownerId: user.id,
        isApproved: false // needs admin approval before going live
      });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: publicUser(user)
    });

  } catch (err) {
    if (err && err.code === 11000)
      return res.status(400).json({ message: 'Email already in use' });
    return res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: 'Invalid credentials' });

    if (user.isSuspended)
      return res.status(403).json({ message: 'This account has been suspended. Contact support.' });

    const token = signToken(user);

    return res.json({
      token,
      user: publicUser(user)
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ---------- GUEST LOGIN (optimized for <1-2s on cold Render free tier) ----------
// Creates a one-click temporary demo account (user or owner) so anyone can try
// the app instantly. Guest accounts auto-expire after 24h and are then removed
// together with their data (stores, ratings, favorites, notifications).
const GUEST_TTL_MS = 24 * 60 * 60 * 1000;
// Cheap hash for guest throwaway passwords: the password is a 48-char random
// secret that is never used to sign in, so cost 4 is plenty and saves
// ~100-200ms of CPU on Render's weak free-tier CPUs vs cost 10.
const GUEST_BCRYPT_COST = 4;
// Throttle background cleanup so it runs at most once per 10 min per instance
// and never blocks the login response.
let lastGuestCleanupAt = 0;
const GUEST_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

async function cleanupExpiredGuests() {
  const now = Date.now();
  if (now - lastGuestCleanupAt < GUEST_CLEANUP_INTERVAL_MS) return;
  lastGuestCleanupAt = now;
  const expired = await User.find({
    isGuest: true,
    guestExpiresAt: { $ne: null, $lt: new Date() }
  })
    .select('_id')
    .limit(20)
    .lean();
  for (const guest of expired) {
    try {
      await deleteUserCascade(guest._id);
      await User.deleteOne({ _id: guest._id });
    } catch {}
  }
}

// One shared demo owner: every "Login as Guest Owner" opens the SAME account
// and the SAME demo store, so reviews/notifications accumulate across sessions.
const DEMO_OWNER_EMAIL = 'guest.owner@demo.local';

// Cache the demo owner id in-memory so repeat logins skip the User lookup
// (falls back to DB on miss; invalidated automatically on failure).
let cachedDemoOwnerId = null;

exports.guestLogin = async (req, res) => {
  try {
    const role = req.body.role === 'owner' ? 'owner' : 'user';

    // Best-effort housekeeping AFTER the response is sent (never blocks login).
    // Scheduled via setImmediate so zero extra latency is added to this request.
    setImmediate(() => cleanupExpiredGuests().catch(() => {}));

    // ---- Owner: always the single shared demo account ----
    if (role === 'owner') {
      let owner = null;
      if (cachedDemoOwnerId) {
        owner = await User.findById(cachedDemoOwnerId).select('_id role tokenVersion isSuspended').lean();
        if (!owner) cachedDemoOwnerId = null;
      }
      if (!owner) {
        owner = await User.findOne({ role: 'owner', email: DEMO_OWNER_EMAIL })
          .select('_id role tokenVersion isSuspended')
          .lean();
      }
      if (!owner) {
        const created = await User.create({
          name: 'Guest Owner',
          email: DEMO_OWNER_EMAIL,
          password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), GUEST_BCRYPT_COST), // unguessable
          role: 'owner',
          isGuest: true,
          guestExpiresAt: null, // never auto-expires (not touched by cleanup)
          address: 'Shared demo account'
        });
        owner = created.toObject();
      }
      cachedDemoOwnerId = owner._id;
      if (owner.isSuspended) {
        // Single cheap update instead of full doc save()
        await User.updateOne({ _id: owner._id }, { $set: { isSuspended: false } });
        owner.isSuspended = false;
      }

      // Ensure the demo store exists (recreate if it was deleted).
      // .lean() + only _id keeps this to one tiny indexed query in the hot path.
      const storeExists = await Store.exists({ ownerId: owner._id });
      if (!storeExists) {
        const category = await Category.findOne().sort({ name: 1 }).select('_id').lean();
        await Store.create({
          name: `Guest's Demo Store`,
          address: '123 Demo Street, Springfield',
          categoryId: category ? category._id : null,
          ownerId: owner._id,
          isApproved: true // live so the demo works end-to-end
        });
      }

      const tokenUser = { id: owner._id, tokenVersion: owner.tokenVersion || 0 };
      return res.json({
        token: signToken(tokenUser),
        user: { id: owner._id, name: 'Guest Owner', email: DEMO_OWNER_EMAIL, role: 'owner', isGuest: true }
      });
    }

    // ---- User: a fresh temporary reviewer each time (24h, auto-cleaned) ----
    const suffix = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
    const rawPassword = crypto.randomBytes(24).toString('hex'); // unguessable; guests never sign in manually

    const user = await User.create({
      name: 'Guest User',
      email: `guest.user.${suffix}@guest.local`,
      password: await bcrypt.hash(rawPassword, GUEST_BCRYPT_COST),
      role: 'user',
      isGuest: true,
      guestExpiresAt: new Date(Date.now() + GUEST_TTL_MS),
      address: 'Temporary demo session (expires in 24h)'
    });

    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Profile of the signed-in account (works for every role)
exports.me = async (req, res) => {
  const user = req.user;
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      phone: user.phone,
      role: user.role,
      isGuest: !!user.isGuest,
      createdAt: user.createdAt,
      dateOfBirth: user.dateOfBirth,
      profilePhoto: user.profilePhoto,
      settings: user.settings || {}
    }
  });
};

// Update signed-in user's editable profile fields (any role)
exports.updateMe = async (req, res) => {
  const { name, email, phone, address, dateOfBirth, settings } = req.body;

  if (name !== undefined && !String(name).trim())
    return res.status(400).json({ message: 'Name cannot be empty' });

  try {
    if (email !== undefined && email !== req.user.email) {
      const clean = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))
        return res.status(400).json({ message: 'Enter a valid email address' });
      const taken = await User.findOne({ email: clean });
      if (taken && taken.id !== req.user.id)
        return res.status(400).json({ message: 'That email is already in use' });
      req.user.email = clean;
    }
    if (name !== undefined) req.user.name = String(name).trim().slice(0, 60);
    if (phone !== undefined) req.user.phone = phone ? String(phone).trim().slice(0, 40) : null;
    if (address !== undefined) req.user.address = address ? String(address).trim().slice(0, 400) : null;
    if (dateOfBirth !== undefined) {
      if (!dateOfBirth) { req.user.dateOfBirth = null; }
      else {
        const d = new Date(dateOfBirth);
        if (isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid date of birth' });
        req.user.dateOfBirth = String(dateOfBirth).slice(0, 10);
      }
    }
    // Deep-merge so each settings section can save independently
    if (settings && typeof settings === 'object') {
      req.user.settings = { ...(req.user.settings || {}), ...settings };
    }
    await req.user.save();
    return res.json({
      message: 'Settings saved',
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        address: req.user.address,
        role: req.user.role,
        isGuest: !!req.user.isGuest,
        createdAt: req.user.createdAt,
        dateOfBirth: req.user.dateOfBirth,
        profilePhoto: req.user.profilePhoto,
        settings: req.user.settings || {}
      }
    });
  } catch (err) {
    if (err && err.code === 11000)
      return res.status(400).json({ message: 'That email is already in use' });
    return res.status(500).json({ message: err.message });
  }
};

// Upload / replace profile photo (multipart field: photo)
exports.uploadMyPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Select an image first.' });
    const old = req.user.profilePhoto;
    req.user.profilePhoto = `/uploads/${req.file.filename}`;
    await req.user.save();
    if (old && old.startsWith('/uploads/')) {
      const fs = require('fs');
      const path = require('path');
      const full = path.join(__dirname, '..', 'uploads', path.basename(old));
      if (full.startsWith(path.join(__dirname, '..', 'uploads'))) fs.promises.unlink(full).catch(() => {});
    }
    return res.json({ message: 'Profile photo updated.', profilePhoto: req.user.profilePhoto });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Sign out of every other device by bumping the token version
exports.logoutAllDevices = async (req, res) => {
  try {
    req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
    await req.user.save();
    const token = signToken(req.user);
    return res.json({ message: 'Signed out of all other devices.', token });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Permanently delete this account (password required; admins excluded)
exports.deleteMe = async (req, res) => {
  const bcrypt = require('bcrypt');
  try {
    if (req.user.role === 'admin')
      return res.status(403).json({ message: 'Administrator accounts cannot be deleted from Settings.' });
    const { password } = req.body;
    if (!password && !req.user.isGuest)
      return res.status(400).json({ message: 'Enter your password to confirm.' });
    if (!req.user.isGuest) {
      const ok = await bcrypt.compare(password, req.user.password);
      if (!ok) return res.status(401).json({ message: 'Incorrect password.' });
    }
    await deleteUserCascade(req.user.id);
    await req.user.deleteOne();
    return res.json({ message: 'Your account has been permanently deleted.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Download a copy of everything stored about this account
exports.exportMyData = async (req, res) => {
  try {
    const { Rating, Favorite, Store } = require('../models');
    const ratings = await Rating.find({ userId: req.user.id });
    const favorites = await Favorite.find({ userId: req.user.id });

    const storeIds = [...ratings.map((r) => r.storeId), ...favorites.map((f) => f.storeId)];
    const stores = await Store.find({ _id: { $in: [...new Set(storeIds)] } }).select('name');
    const storeName = Object.fromEntries(stores.map((s) => [s.id, s.name]));

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        address: req.user.address,
        role: req.user.role,
        dateOfBirth: req.user.dateOfBirth,
        createdAt: req.user.createdAt
      },
      settings: req.user.settings || {},
      reviews: ratings.map((r) => ({
        rating: r.rating,
        review: r.review,
        ownerReply: r.ownerReply,
        createdAt: r.createdAt,
        store: storeName[r.storeId] || null
      })),
      favorites: favorites.map((f) => storeName[f.storeId] || null)
    };
    res.setHeader('Content-Disposition', 'attachment; filename="storescope-my-data.json"');
    res.setHeader('Content-Type', 'application/json');
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Change password of the signed-in account (works for every role)
exports.changePassword = async (req, res) => {
  const { password } = req.body;

  if (!password || String(password).length < 4)
    return res.status(400).json({ message: 'Password must be at least 4 characters' });

  req.user.password = await bcrypt.hash(password, 10);
  await req.user.save();

  return res.json({ message: 'Password updated successfully' });
};