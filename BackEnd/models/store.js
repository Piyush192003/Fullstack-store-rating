const mongoose = require('mongoose');
const { applyIdAndJson } = require('./utils');

const storeSchema = new mongoose.Schema(
  {
    _id: { type: Number },

    name: { type: String, required: true, maxlength: 120, trim: true },

    email: { type: String, maxlength: 100, default: null },

    address: { type: String, maxlength: 400, default: null },

    phone: { type: String, maxlength: 40, default: null },

    description: { type: String, default: null },

    openingHours: { type: String, maxlength: 240, default: null },

    priceLevel: { type: Number, min: 1, max: 4, default: null },

    images: { type: [String], default: [] },

    categoryId: { type: Number, default: null, index: true },

    isApproved: { type: Boolean, default: true },

    isSuspended: { type: Boolean, default: false },

    ownerId: { type: Number, default: null, index: true }
  },
  { timestamps: true }
);

applyIdAndJson(storeSchema, 'stores');

module.exports = mongoose.models.Store || mongoose.model('Store', storeSchema);
