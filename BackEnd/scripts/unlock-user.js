// Emergency recovery tool - reactivate a suspended account and optionally reset its password.
// Usage: node scripts/unlock-user.js <email> [newPassword]
require('dotenv').config();
const { connectDB, mongoose } = require('../config/db');
const { User } = require('../models');

(async () => {
  try {
    await connectDB();
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node scripts/unlock-user.js <email> [newPassword]');
      process.exit(1);
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error('No account found for ' + email);
      process.exit(1);
    }
    user.isSuspended = false;
    let note = '';
    const newPassword = process.argv[3];
    if (newPassword) {
      if (String(newPassword).length < 4) {
        console.error('New password must be at least 4 characters');
        process.exit(1);
      }
      const bcrypt = require('bcrypt');
      user.password = await bcrypt.hash(newPassword, 10);
      note = ' + password updated';
    }
    await user.save();
    console.log(`OK: ${user.email} (${user.role}) re-activated${note}.`);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();