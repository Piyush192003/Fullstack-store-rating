// Update an admin account's email and password (password re-hashed with bcrypt).
// Usage: node scripts/update-admin.js <currentEmail> <newEmail> <newPassword>
require('dotenv').config();
const sequelize = require('../config/db');
const bcrypt = require('bcrypt');
const { User } = require('../models');

(async () => {
  try {
    const currentEmail = process.argv[2];
    const newEmail = process.argv[3];
    const newPassword = process.argv[4];

    if (!currentEmail || !newEmail || !newPassword) {
      console.error('Usage: node scripts/update-admin.js <currentEmail> <newEmail> <newPassword>');
      process.exit(1);
    }
    if (String(newPassword).length < 4) {
      console.error('New password must be at least 4 characters');
      process.exit(1);
    }

    await sequelize.authenticate();

    const user = await User.findOne({ where: { email: currentEmail } });
    if (!user) {
      console.error('No account found for ' + currentEmail);
      process.exit(1);
    }

    // Check the target email is not already taken by another account
    const taken = await User.findOne({ where: { email: newEmail } });
    if (taken && taken.id !== user.id) {
      console.error(`Email ${newEmail} is already in use by account #${taken.id}.`);
      process.exit(1);
    }

    user.email = newEmail;
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log(`OK: ${currentEmail} -> ${newEmail} (role=${user.role}). Password updated.`);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();