const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  'mongodb://127.0.0.1:27017/store_rating_db';

let connected = false;
let connecting = null;

async function connectDB() {
  if (connected) return mongoose.connection;
  // De-dupe concurrent connection attempts (e.g. /api/health + /guest-login
  // hitting a cold Render instance at the same time).
  if (connecting) return connecting;
  mongoose.set('strictQuery', true);
  // In production indexes are already built — skip autoIndex so the first
  // request after a cold start doesn't block on index builds.
  const isProd = process.env.NODE_ENV === 'production';
  connecting = mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 7000,
      connectTimeoutMS: 7000,
      socketTimeoutMS: 20000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      autoIndex: !isProd,
      family: 4
    })
    .then((conn) => {
      connected = true;
      connecting = null;
      console.log('MongoDB connected');
      return conn;
    })
    .catch((err) => {
      connecting = null;
      throw err;
    });
  return connecting;
}

// Fire-and-forget warmup used at boot so the first real request reuses a
// hot pool instead of paying for TLS + handshake inside the request.
function warmupDB() {
  connectDB().catch(() => {});
}

module.exports = { connectDB, warmupDB, mongoose, MONGODB_URI };
