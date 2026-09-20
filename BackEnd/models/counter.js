const mongoose = require('mongoose');

// Tiny counter collection used to generate small numeric ids,
// exactly like the old SQL auto-increment ids (frontend expects numbers).
const counterSchema = new mongoose.Schema(
  {
    _id: String,
    seq: { type: Number, default: 0 }
  },
  { versionKey: false }
);

const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

async function getNextId(key) {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

module.exports = { Counter, getNextId };