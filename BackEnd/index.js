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

// CORS: allowed frontend origins.
// - Extra origins via FRONTEND_URL env (comma-separated).
// - Production Vercel URL + all Vercel preview URLs + local dev are ALWAYS
//   allowed in code, so no dashboard env change is ever required.
const envOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const ALWAYS_ALLOWED = [
  'https://fullstack-store-rating.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];
// e.g. https://fullstack-store-rating-git-main-xyz.vercel.app (preview deploys)
const VERCEL_PREVIEW_RE = /^https:\/\/.*\.vercel\.app$/;

const allowedSet = new Set([...ALWAYS_ALLOWED, ...envOrigins]);

function isOriginAllowed(origin) {
  if (!origin) return true; // curl / uptime monitors / same-origin
  if (allowedSet.has(origin)) return true;
  if (VERCEL_PREVIEW_RE.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, cb) {
    // IMPORTANT: never call cb(null, false) — that sends NO header and the
    // browser reports "blocked by CORS policy" (exactly the reported bug).
    // Unknown origins get an explicit error instead.
    if (isOriginAllowed(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  // Preflight result cached 24h by the browser → 2nd guest click skips OPTIONS
  maxAge: 86400,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
// Explicit preflight handler (Express 5-safe: no '*' path pattern)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return cors(corsOptions)(req, res, next);
  next();
});
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
