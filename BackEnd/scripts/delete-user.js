// Permanently delete an account by email.
// Usage: node scripts/delete-user.js <email>
require('dotenv').config();
const sequelize = require('../config/db');
const { User } = require('../models');

(async () => {
  try {
    await sequelize.authenticate();
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node scripts/delete-user.js <email>');
      process.exit(1);
    }
    const deleted = await User.destroy({ where: { email } });
    if (!deleted) {
      console.error('No account found for ' + email);
      process.exit(1);
    }
    console.log(`OK: ${email} deleted (their ratings were removed too).`);
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();