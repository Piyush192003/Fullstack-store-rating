// Temporary helper: list all users (id, role, email, suspended).
// Usage: node scripts/list-users.js
require('dotenv').config();
const mongoose = require('../config/db');
const { User } = require('../models');

(async () => {
  try {
    await mongoose.connectDB();
    const users = await User.find().select('email role isSuspended isGuest');
    console.log('Users in DB:');
    users.forEach((u) => console.log(`  #${u.id} | ${u.role} | ${u.email} | suspended=${u.isSuspended ? 'yes' : 'no'}${u.isGuest ? ' | GUEST' : ''}`));
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();