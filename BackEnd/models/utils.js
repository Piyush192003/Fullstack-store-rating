const { getNextId } = require('./counter');

// Shared schema helpers so Mongo documents keep the exact same JSON shape the
// frontend already expects: { id, name, ... } with no _id / __v noise.
function applyIdAndJson(schema, counterKey) {
  // Numeric auto-increment primary key (same UX as the old SQL ids).
  // NOTE: Mongoose assigns a default ObjectId in the document constructor,
  // so we must overwrite it (not check for undefined) while validating.
  schema.pre('validate', function () {
    if (this.isNew && typeof this._id !== 'number') {
      return getNextId(counterKey).then((id) => {
        this._id = id;
      });
    }
  });

  // doc.id behaves like a number (matches the old SQL API shape)
  schema.virtual('id').get(function () {
    return this._id;
  });

  // JSON: { id, ...fields } without _id / __v
  schema.set('toJSON', {
    versionKey: false,
    transform(doc, ret) {
      if (ret._id !== undefined) ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  });
}

module.exports = { applyIdAndJson };