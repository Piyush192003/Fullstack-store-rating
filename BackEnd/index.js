const express = require('express');
require('dotenv').config();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const { connectDB, warmupDB } = require('./config/db');

const app = express();

// Keep the Mongo pool warm from the moment the dyno boots (Render cold start
// is the main reason the first guest login feels slow).
warmupDB();

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
// Faster preflight + JSON responses
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// Serve uploaded store images (long cache, immutable-ish)
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', etag: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/category'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));
app.use('/api/owner', require('./routes/owner'));

// Health probe (uptime checks / deployment verification).
// Responds instantly even on a cold start, AND kicks the DB connection so the
// next real request (e.g. guest login) finds a warm pool.
app.get('/api/health', (req, res) => {
  warmupDB();
  res.json({ ok: true });
});

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
