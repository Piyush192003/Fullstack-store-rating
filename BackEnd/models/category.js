const mongoose = require('mongoose');
const { applyIdAndJson } = require('./utils');

const categorySchema = new mongoose.Schema(
  {
    _id: { type: Number },

    name: { type: String, required: true, unique: true, maxlength: 80, trim: true }
  },
  { timestamps: true }
);

applyIdAndJson(categorySchema, 'categories');

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
