const mongoose = require('mongoose');
const { applyIdAndJson } = require('./utils');

const reviewHelpSchema = new mongoose.Schema(
  {
    _id: { type: Number },

    ratingId: { type: Number, required: true, index: true },
    userId: { type: Number, required: true, index: true }
  },
  { timestamps: true }
);

// One helpful vote per user per review (same as the old SQL unique index)
reviewHelpSchema.index({ ratingId: 1, userId: 1 }, { unique: true });

applyIdAndJson(reviewHelpSchema, 'review_helps');

module.exports = mongoose.models.ReviewHelp || mongoose.model('ReviewHelp', reviewHelpSchema);
