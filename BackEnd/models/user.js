const mongoose = require('mongoose');
const { applyIdAndJson } = require('./utils');

const userSchema = new mongoose.Schema(
  {
    _id: { type: Number },

    name: { type: String, required: true, maxlength: 60, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
      lowercase: true,
      trim: true
    },

    address: { type: String, maxlength: 400, default: null },

    phone: { type: String, maxlength: 40, default: null },

    isSuspended: { type: Boolean, default: false },

    password: { type: String, required: true },

    dateOfBirth: { type: String, default: null }, // 'YYYY-MM-DD' (same as before)

    profilePhoto: { type: String, maxlength: 500, default: null },

    // Bumped to invalidate every issued JWT (sign-out of all devices)
    tokenVersion: { type: Number, default: 0 },

    // Notification / location / appearance / preference settings
    settings: { type: Object, default: {} },

    // Guest demo accounts (Login page "continue as guest") expire automatically
    isGuest: { type: Boolean, default: false, index: true },
    guestExpiresAt: { type: Date, default: null, index: true },

    role: { type: String, enum: ['admin', 'user', 'owner'], default: 'user', index: true }
  },
  { timestamps: true, minimize: false }
);

// Fast guest-login lookups: expiry sweep + shared demo-owner findOne
userSchema.index({ isGuest: 1, guestExpiresAt: 1 });
userSchema.index({ role: 1, email: 1 });

applyIdAndJson(userSchema, 'users');

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
