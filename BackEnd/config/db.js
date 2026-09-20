const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  'mongodb://127.0.0.1:27017/store_rating_db';

let connected = false;

async function connectDB() {
  if (connected) return mongoose.connection;
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: true
  });
  connected = true;
  console.log('MongoDB connected');
  return mongoose.connection;
}

module.exports = { connectDB, mongoose, MONGODB_URI };
