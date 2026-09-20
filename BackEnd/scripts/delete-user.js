// Permanently delete an account by email.
// Usage: node scripts/delete-user.js <email>
require('dotenv').config();
const { connectDB, mongoose } = require('../config/db');
const { User, deleteUserCascade } = require('../models');

(async () => {
  try {
    await connectDB();
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node scripts/delete-user.js <email>');
      process.exit(1);
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error('No account found for ' + email);
      process.exit(1);
    }
    await deleteUserCascade(user.id);
    await user.deleteOne();
    console.log(`OK: ${email} deleted (their ratings were removed too).`);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();