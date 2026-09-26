// Seeds 18 ready-made demo stores (+ starter ratings) so the live site never
// looks empty. Idempotent: skips any store whose name already exists, so it is
// safe to run on every boot and re-run manually at any time.
// Run manually: npm run seed-demo-stores
require('dotenv').config();
const { connectDB, mongoose } = require('../config/db');
const { Category, Store, User, Rating } = require('../models');
const bcrypt = require('bcrypt');
const { ensureDefaultCategories } = require('./seed-categories');

const DEMO_REVIEWER_EMAIL = 'demo.reviewer@demo.local';

// 18 stores across all default categories (unclaimed, visible to everyone).
// [name, category, address, phone, description, openingHours, priceLevel]
const DEMO_STORES = [
  ['FreshDaily Grocery', 'Grocery', '12 Market Road, Springfield', '+1-555-0101', 'Farm-fresh produce, dairy and daily essentials at fair prices.', 'Mon-Sun 7AM-10PM', 2],
  ['Spice Route Restaurant', 'Restaurant', '45 Food Street, Springfield', '+1-555-0102', 'Authentic North Indian curries, biryanis and tandoor specials.', 'Mon-Sun 11AM-11PM', 2],
  ['Brew & Bean Cafe', 'Cafe', '8 Lakeview Plaza, Springfield', '+1-555-0103', 'Artisan coffee, fresh bakes and cozy work-friendly seating.', 'Mon-Sun 8AM-10PM', 2],
  ['Crumb Culture Bakery', 'Bakery', '21 Baker Lane, Springfield', '+1-555-0104', 'Sourdough, croissants and custom celebration cakes baked daily.', 'Tue-Sun 7:30AM-8:30PM', 2],
  ['CarePlus Pharmacy', 'Pharmacy', '3 Health Avenue, Springfield', '+1-555-0105', 'Medicines, health checkups and 24x7 emergency counter.', 'Open 24 hours', 2],
  ['VoltEdge Electronics', 'Electronics', '99 Tech Park, Springfield', '+1-555-0106', 'Mobiles, laptops, accessories and trusted repair service.', 'Mon-Sat 10AM-9PM', 3],
  ['UrbanThread Clothing', 'Clothing', '17 Fashion Street, Springfield', '+1-555-0107', 'Trendy everyday fashion for men and women, new drops weekly.', 'Mon-Sun 10AM-9:30PM', 2],
  ['FixIt Hardware', 'Hardware', '6 Industrial Estate, Springfield', '+1-555-0108', 'Tools, paints, plumbing and electricals for home and pros.', 'Mon-Sat 9AM-8PM', 2],
  ['Glow & Grace Salon', 'Salon & Spa', '28 Beauty Boulevard, Springfield', '+1-555-0109', 'Hair, skin and spa rituals by certified stylists.', 'Tue-Sun 10AM-8PM', 3],
  ['Chapter House Books', 'Book Store', '14 Library Road, Springfield', '+1-555-0110', 'Bestsellers, stationery and weekend reading clubs.', 'Mon-Sun 9:30AM-8:30PM', 2],
  ['NestWood Furniture', 'Furniture', '71 Decor District, Springfield', '+1-555-0111', 'Solid-wood beds, sofas and office setups with free delivery.', 'Mon-Sat 10AM-8PM', 3],
  ['Sharma Kirana Store', 'Kirana Store', '5 Gandhi Nagar, Springfield', '+1-555-0112', 'Trusted neighbourhood kirana, monthly kits and home delivery.', 'Mon-Sun 7AM-10:30PM', 1],
  ['GreenBasket Organics', 'Grocery', '33 Eco Market, Springfield', '+1-555-0113', 'Certified organic fruits, vegetables and pantry staples.', 'Mon-Sun 8AM-9PM', 3],
  ['Tandoori Nights', 'Restaurant', '9 Food Street, Springfield', '+1-555-0114', 'Late-night kebabs, rolls and family dinner combos.', 'Mon-Sun 12PM-11:30PM', 2],
  ['Chai Sutta Point', 'Cafe', '2 College Road, Springfield', '+1-555-0115', 'Kulhad chai, maggi and a favourite student hangout spot.', 'Mon-Sun 9AM-11PM', 1],
  ['GadgetGully', 'Electronics', '44 Tech Park, Springfield', '+1-555-0116', 'Budget mobiles, audio gear and instant exchange offers.', 'Mon-Sun 10:30AM-9PM', 1],
  ['Denim & Co.', 'Clothing', '19 Fashion Street, Springfield', '+1-555-0117', 'Denims, jackets and streetwear essentials.', 'Mon-Sun 11AM-9PM', 2],
  ['HomeStyle Furnishings', 'Furniture', '72 Decor District, Springfield', '+1-555-0118', 'Curtains, lamps, rugs and budget home makeovers.', 'Mon-Sat 10AM-8:30PM', 2]
];

// Starter reviews so ratings look alive: [storeIndex, stars, text]
const DEMO_RATINGS = [
  [0, 5, 'Best grocery nearby, fresh veggies every morning and polite staff.'],
  [0, 4, 'Good prices, gets crowded on weekends.'],
  [1, 5, 'Butter chicken here is outstanding. Must visit!'],
  [1, 4, 'Tasty food, quick service. Slightly noisy at peak hours.'],
  [2, 5, 'Perfect work cafe, great cappuccino and fast Wi-Fi.'],
  [3, 5, 'Their chocolate croissants are addictive.'],
  [5, 4, 'Genuine products with proper billing. Repair took a day extra.'],
  [6, 4, 'Nice collection, trial rooms are clean and big.'],
  [8, 5, 'Amazing haircut and very hygienic spa. Book ahead on weekends.'],
  [9, 5, 'Lovely little bookstore, staff helped me pick gifts.'],
  [11, 4, 'Reliable kirana with quick home delivery.'],
  [13, 5, 'Cozy rolls at midnight, lifesaver!'],
  [15, 3, 'Decent budget store, check warranty terms before buying.']
];

async function ensureDemoStores() {
  await ensureDefaultCategories();
  const categories = await Category.find().select('name');
  if (!categories.length) throw new Error('No categories available for demo seeding');
  const byName = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  let reviewer = await User.findOne({ email: DEMO_REVIEWER_EMAIL });
  if (!reviewer) {
    reviewer = await User.create({
      name: 'Demo Reviewer',
      email: DEMO_REVIEWER_EMAIL,
      password: await bcrypt.hash('demo-reviewer-local-only', 4),
      role: 'user',
      isGuest: false,
      address: 'Seeded demo account (starter reviews)'
    });
  }

  let createdStores = 0;
  const storesByIndex = [];
  for (const row of DEMO_STORES) {
    const [name, category, address, phone, description, openingHours, priceLevel] = row;
    let store = await Store.findOne({ name });
    if (!store) {
      store = await Store.create({
        name, address, phone, description, openingHours, priceLevel,
        categoryId: byName[category] != null ? byName[category] : null,
        email: null, ownerId: null, isApproved: true, isSuspended: false
      });
      createdStores += 1;
    }
    storesByIndex.push(store);
  }

  let createdRatings = 0;
  for (const [storeIdx, rating, review] of DEMO_RATINGS) {
    const store = storesByIndex[storeIdx];
    if (!store) continue;
    const exists = await Rating.findOne({ userId: reviewer.id, storeId: store.id });
    if (!exists) {
      await Rating.create({ userId: reviewer.id, storeId: store.id, rating, review });
      createdRatings += 1;
    }
  }
  return { createdStores, createdRatings, totalStores: DEMO_STORES.length };
}

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      const r = await ensureDemoStores();
      console.log('Demo stores ready: ' + r.createdStores + ' new, ' + r.createdRatings + ' ratings (of ' + r.totalStores + ').');
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Demo seed failed:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { ensureDemoStores, DEMO_STORES };
