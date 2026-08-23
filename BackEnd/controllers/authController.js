const { User, Store } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
require('dotenv').config();

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
        requester = await User.findByPk(decoded.id);
      } catch {}
      if (!requester || requester.role !== 'admin')
        return res.status(403).json({ message: 'Not allowed. Administrator accounts can only be created by an existing administrator.' });
    }

    // Sanitize role — public signups may only become a customer or a store owner
    if (!['user', 'owner'].includes(role)) role = 'user';

    const existing = await User.findOne({ where: { email } });
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

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: 'Invalid credentials' });

    if (user.isSuspended)
      return res.status(403).json({ message: 'This account has been suspended. Contact support.' });

    const token = jwt.sign({ id: user.id, tv: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

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
      const taken = await User.findOne({ where: { email: clean } });
      if (taken) return res.status(400).json({ message: 'That email is already in use' });
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
        req.user.dateOfBirth = dateOfBirth;
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
        createdAt: req.user.createdAt,
        dateOfBirth: req.user.dateOfBirth,
        profilePhoto: req.user.profilePhoto,
        settings: req.user.settings || {}
      }
    });
  } catch (err) {
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
    const token = jwt.sign({ id: req.user.id, tv: req.user.tokenVersion }, process.env.JWT_SECRET, { expiresIn: '7d' });
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
    if (!password) return res.status(400).json({ message: 'Enter your password to confirm.' });
    const ok = await bcrypt.compare(password, req.user.password);
    if (!ok) return res.status(401).json({ message: 'Incorrect password.' });
    await req.user.destroy();
    return res.json({ message: 'Your account has been permanently deleted.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Download a copy of everything stored about this account
exports.exportMyData = async (req, res) => {
  try {
    const { Rating, Favorite, Store } = require('../models');
    void Rating; void Favorite; void Store;
    const reviews = await Rating.findAll({
      where: { userId: req.user.id },
      include: [{ model: Store, attributes: ['id', 'name'] }]
    });
    const favorites = await Favorite.findAll({
      where: { userId: req.user.id },
      include: [{ model: Store, attributes: ['id', 'name'] }]
    });
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: { id: req.user.id, name: req.user.name, email: req.user.email, phone: req.user.phone, address: req.user.address, role: req.user.role, dateOfBirth: req.user.dateOfBirth, createdAt: req.user.createdAt },
      settings: req.user.settings || {},
      reviews: reviews.map((r) => ({ rating: r.rating, review: r.review, ownerReply: r.ownerReply, createdAt: r.createdAt, store: r.Store ? r.Store.name : null })),
      favorites: favorites.map((f) => f.Store ? f.Store.name : null)
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
