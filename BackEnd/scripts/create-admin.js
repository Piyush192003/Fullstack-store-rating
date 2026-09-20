// Creates the first administrator account on a fresh database.
// Usage: node scripts/create-admin.js <email> <password> [name]
// Or set ADMIN_EMAIL / ADMIN_PASSWORD env vars and run `npm run create-admin`.
require('dotenv').config();
const mongoose = require('../config/db');
const bcrypt = require('bcrypt');
const { User } = require('../models');

(async () => {
  try {
    const email = (process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.argv[3] || process.env.ADMIN_PASSWORD || '';
    const name = process.argv[4] || process.env.ADMIN_NAME || 'Administrator';

    if (!email || !password) {
      console.error('Usage: node scripts/create-admin.js <email> <password> [name]');
      console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD and run: npm run create-admin');
      process.exit(1);
    }
    if (String(password).length < 4) {
      console.error('Password must be at least 4 characters');
      process.exit(1);
    }

    await mongoose.connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      console.error(`An account already exists for ${email} (role=${existing.role}).`);
      process.exit(1);
    }

    const admin = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: 'admin'
    });

    console.log(`OK: admin #${admin.id} created for ${email}.`);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();