<div align="center">

# 🏪 StoreScope

**Discover local stores, share honest ratings, and help your community make confident decisions.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-47A248?logo=mongodb&logoColor=white)
![JWT Auth](https://img.shields.io/badge/Auth-JWT%20%2B%20bcrypt-black)

</div>

---

## 📖 About

StoreScope is a full-stack store rating platform with three roles — **customers**, **store owners**, and an **admin**. Customers discover local stores and rate them, owners track feedback on a live dashboard and respond to reviews, and the admin moderates the whole platform.

It also ships **one-click guest demo logins**, so anyone can explore the entire app instantly — no signup needed.

---

## ✨ Features

### 👤 Customers
- Discover stores with **search**, **category filter**, **price level** and sorting (name / rating)
- ⭐ Rate stores **1–5** with written reviews — edit or delete your review anytime
- Mark reviews **helpful**, and get notified when someone likes yours
- ❤️ Favorites list, 🔔 notifications inbox with unread counts
- ⚙️ Settings: themes, notification preferences, default category & sorting
- Profile photo upload, account data export (JSON), permanent account deletion

### 🏪 Store Owners
- Live **dashboard metrics**: average rating, rating count, positive %, month-over-month trend
- 💬 **Reply** to customer reviews, 🚩 report abusive/fake reviews for moderation
- Register a store or **claim** an unclaimed one, upload up to **6 store images**
- Store details: category, price level, opening hours, contact info, description
- Auto-notification when the admin approves the store

### 🛡️ Admin
- Console with platform stats: users, stores, ratings, flagged reviews, pending approvals
- Add users & stores, **edit every store field**, approve / suspend / delete listings
- **Category management** (owners pick categories from this list)
- Review moderation: view flagged reviews, delete or clear flags
- User detail view with owner-rating summary; suspend / re-activate accounts

### 🎭 Guest demo logins
- **👤 Login as Guest User** → a *fresh* temporary reviewer on every click (auto-deleted after 24h)
- **🏪 Login as Guest Owner** → always opens the **same shared demo account** + demo store, so reviews and notifications accumulate while you explore

### 🔒 Security
- Passwords hashed with **bcrypt**; passwords are never returned by the API
- **JWT** sessions (7 days) with token-version invalidation for "sign out of all devices"
- Role-based route guards (`admin` / `owner` / `user`)
- The public signup can never create an admin; admins can't be suspended or self-deleted
- Path-safe image deletion (no directory traversal)

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, React Router 7, Axios |
| Backend | Node.js (18+), Express 5 |
| Database | MongoDB with **Mongoose 8** |
| Auth | JWT + bcrypt, token versioning, role guards |
| File uploads | Multer (store images & profile photos) |
| Validation | express-validator + shared client-side rules |
| Testing | Node built-in test runner + **in-memory MongoDB** |

---

## 📂 Project Structure

```
fullstack-store-rating/
├── BackEnd/                  # Express + Mongoose API
│   ├── config/db.js          # MongoDB connection (MONGODB_URI)
│   ├── controllers/          # auth, admin, owner, user, category
│   ├── middleware/           # auth guard, role guard, multer upload
│   ├── models/               # User, Store, Rating, Category, ReviewHelp, Favorite, Notification
│   ├── routes/               # /api/auth, /api/user, /api/owner, /api/admin, /api/categories
│   ├── scripts/              # create-admin, seed-categories, unlock-user, delete-user,
│   │                         # list-users, update-admin, boot-check
│   ├── tests/api.test.js     # Full API test suite (in-memory MongoDB)
│   └── index.js              # App entry — also serves /uploads and /api/health
├── FrontEnd/myapp/           # React + Vite + Tailwind SPA
│   └── src/
│       ├── pages/            # Login, Register, User*, Owner*, Admin* pages
│       ├── components/       # AppShell, StoreDetailModal
│       └── utils/            # api client (axios), theme, store-form validation
└── vercel.json               # Vercel deploy config for the frontend
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+**
- **MongoDB** — either a local MongoDB service **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 1. Clone
```bash
git clone https://github.com/Piyush192003/Fullstack-store-rating.git
cd Fullstack-store-rating
```

### 2. Backend
```bash
cd BackEnd
npm install
copy .env.example .env        # Windows (use `cp` on macOS/Linux)
# → edit .env and set MONGODB_URI + JWT_SECRET

npm run dev                   # API on http://localhost:5000
```
✅ Verify: open `http://localhost:5000/api/health` → `{"ok":true}`

> On first boot the app **auto-seeds 12 default categories** (Grocery, Restaurant, Cafe…) on an empty database. Admin-created categories are never overwritten. You can also run `npm run seed-categories` manually.

### 3. Create an admin account
Admins cannot be created from the signup form (by design):
```bash
npm run create-admin -- admin@example.com yourpassword
```

### 4. Frontend
```bash
cd FrontEnd/myapp
npm install
npm run dev                   # App on http://localhost:5173
```

### 5. Sign in
- **Admin:** with the credentials you created above
- **Customer / Owner:** use **Create account** on the login page
- **Just exploring?** use the 👤 **Guest User** or 🏪 **Guest Owner** buttons

---

## 🔐 Environment Variables

**`BackEnd/.env`**

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/store_rating_db` |
| `JWT_SECRET` | Long random string used to sign JWTs | `a-very-long-random-secret` |
| `PORT` | API port (default `5000`) | `5000` |
| `FRONTEND_URL` | CORS allow-list (comma-separated origins) | `http://localhost:5173` |

**`FrontEnd/myapp/.env`** *(optional — defaults to localhost)*

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |

---

## 🧪 Testing

The API has a full end-to-end test suite (auth, roles, ratings, guest logins, admin flows) that runs against an **in-memory MongoDB** — no database setup required:

```bash
cd BackEnd
npm test
```

---

## 📜 Useful Scripts (from `BackEnd/`)

| Script | Purpose |
|---|---|
| `npm run dev` | Start API with auto-reload (nodemon) |
| `npm start` | Start API in production mode |
| `npm test` | Run the API test suite |
| `npm run create-admin -- <email> <password>` | Create an admin account |
| `npm run seed-categories` | Seed default categories (only if empty) |
| `node scripts/boot-check.js` | Boot the real server + health-check it |
| `node scripts/list-users.js` | List all accounts |
| `node scripts/unlock-user.js <email> [newPassword]` | Re-activate / reset a password |
| `node scripts/delete-user.js <email>` | Delete an account and its data |

---

## 🔗 API Overview

| Group | Endpoints |
|---|---|
| Auth | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/guest-login` |
| Account | `GET/PUT /api/auth/me` · `POST /api/auth/me/photo` · `POST /api/auth/change-password` · `POST /api/auth/sessions/logout-all` · `GET /api/auth/me/data` · `DELETE /api/auth/me` |
| Categories | `GET /api/categories` (public) |
| Admin | `/api/admin/dashboard` · `/api/admin/users` · `/api/admin/stores` · `/api/admin/categories` · `/api/admin/reviews/flagged` |
| User | `/api/user/stores` · `/api/user/stores/:id` · `POST /api/user/rating` · `/api/user/my-reviews` · `/api/user/favorites` · `/api/user/notifications` |
| Owner | `/api/owner/ratings` · `/api/owner/store` · `/api/owner/store/claim` · `/api/owner/store/images` · `POST /api/owner/rating/:id/reply` · `POST /api/owner/rating/:id/report` |
| Health | `GET /api/health` |

---

## 👥 Roles & Permissions

| Role | What they can do |
|---|---|
| **Admin** | Full moderation: users, stores, categories, reviews; add stores/users |
| **User** | Discover stores, rate & review, favorites, notifications, settings |
| **Owner** | Own store dashboard, reply to reviews, report reviews, edit store, upload images, claim unclaimed stores |

---

## ☁️ Deployment

Deployment configs are included in the repository: `BackEnd/Procfile` (Heroku web dyno) and `vercel.json` (Vercel SPA build for the frontend). Deploy the backend with any MongoDB host (e.g. MongoDB Atlas) and point the frontend's `VITE_API_URL` at the API.

---

<div align="center">

**Built with ❤️ by [Piyush192003](https://github.com/Piyush192003)**

</div>