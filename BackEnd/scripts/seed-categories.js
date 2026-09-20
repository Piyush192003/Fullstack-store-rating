// Seeds sensible default store categories the first time the app runs.
// Idempotent: only seeds when the categories collection is empty
// (admin-created categories are never touched).
// Run manually: npm run seed-categories
require('dotenv').config();
const { connectDB, mongoose } = require('../config/db');
const { Category } = require('../models');

const DEFAULT_CATEGORIES = [
  'Grocery',
  'Kirana Store',
  'Restaurant',
  'Cafe',
  'Bakery',
  'Pharmacy',
  'Electronics',
  'Clothing',
  'Hardware',
  'Salon & Spa',
  'Book Store',
  'Furniture'
];

async function ensureDefaultCategories() {
  const count = await Category.countDocuments();
  if (count > 0) return false; // already has categories — nothing to do
  for (const name of DEFAULT_CATEGORIES) {
    // create() (not insertMany) so document middleware runs and ids stay numeric
    await Category.create({ name });
  }
  return true;
}

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      const seeded = await ensureDefaultCategories();
      console.log(seeded
        ? `Seeded ${DEFAULT_CATEGORIES.length} default categories.`
        : 'Categories already exist — nothing to seed.');
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Failed:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { ensureDefaultCategories, DEFAULT_CATEGORIES };