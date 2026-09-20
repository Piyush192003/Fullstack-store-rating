const mongoose = require('mongoose');
const { applyIdAndJson } = require('./utils');

const favoriteSchema = new mongoose.Schema(
  {
    _id: { type: Number },

    userId: { type: Number, required: true, index: true },
    storeId: { type: Number, required: true, index: true }
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, storeId: 1 }, { unique: true });

applyIdAndJson(favoriteSchema, 'favorites');

module.exports = mongoose.models.Favorite || mongoose.model('Favorite', favoriteSchema);