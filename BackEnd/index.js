const express = require('express');
require('dotenv').config();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { connectDB } = require('./config/db');

const app = express();

// CORS: allow the deployed frontend (FRONTEND_URL, comma-separated list).
// If FRONTEND_URL is not set, all origins are allowed (handy for Vercel preview URLs).
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    }
  })
);
app.use(express.json({ limit: '2mb' }));

// Serve uploaded store images
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/category'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));
app.use('/api/owner', require('./routes/owner'));

// Health probe (uptime checks / deployment verification)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Exported so tests can start the app programmatically
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;

  (async () => {
    try {
      await connectDB();

      // Seed reference data (default categories) on a fresh database.
      // Admin-created categories are never touched.
      try {
        const { ensureDefaultCategories } = require('./scripts/seed-categories');
        await ensureDefaultCategories();
      } catch (seedErr) {
        console.warn('Category seeding skipped:', seedErr.message);
      }

      // NOTE: There is no automatic admin seeding.
      // Create the first admin on a fresh database with:
      //   npm run create-admin -- <email> <password>
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
      console.error('Unable to start server:', err);
      process.exit(1);
    }
  })();
}
