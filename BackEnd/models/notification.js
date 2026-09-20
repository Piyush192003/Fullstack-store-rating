const mongoose = require('mongoose');
const { applyIdAndJson } = require('./utils');

const notificationSchema = new mongoose.Schema(
  {
    _id: { type: Number },

    userId: { type: Number, required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, maxlength: 400, default: null },
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

applyIdAndJson(notificationSchema, 'notifications');

module.exports = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);