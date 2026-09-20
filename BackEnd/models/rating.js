const mongoose = require('mongoose');
const { applyIdAndJson } = require('./utils');

const ratingSchema = new mongoose.Schema(
  {
    _id: { type: Number },

    rating: { type: Number, required: true, min: 1, max: 5 },

    review: { type: String, default: null },

    ownerReply: { type: String, default: null },

    isFlagged: { type: Boolean, default: false },

    userId: { type: Number, required: true, index: true },

    storeId: { type: Number, required: true, index: true }
  },
  { timestamps: true }
);

// One rating per user per store (same as the old SQL unique index)
ratingSchema.index({ userId: 1, storeId: 1 }, { unique: true });

applyIdAndJson(ratingSchema, 'ratings');

module.exports = mongoose.models.Rating || mongoose.model('Rating', ratingSchema);
