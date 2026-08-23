// Temporary helper: list all users (id, role, email, suspended, hasPassword).
// Usage: node scripts/list-users.js
require('dotenv').config();
const sequelize = require('../config/db');
const { User } = require('../models');

(async () => {
  try {
    await sequelize.authenticate();
    const users = await User.findAll({ attributes: ['id', 'email', 'role', 'isSuspended'] });
    console.log('Users in DB:');
    users.forEach((u) => console.log(`  #${u.id} | ${u.role} | ${u.email} | suspended=${u.isSuspended ? 'yes' : 'no'}`));
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();