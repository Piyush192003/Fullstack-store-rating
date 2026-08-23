# StoreScope — Full-Stack Store Rating Platform

A store discovery & rating web app with three roles: **Users**, **Store Owners**, and **Admins**.

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Node.js + Express 5 + Sequelize ORM (MySQL 8)
- **Auth:** JWT (bcrypt-hashed passwords) + role-based access control

## ✨ Features

- **User** — search / filter (category, price, rating) & sort stores, 1–5★ ratings with written reviews, update/delete own review, "helpful" votes, favorites, nearby discovery, in-app notifications, theme & preferences.
- **Store Owner** – register/claim a store, edit profile (hours, price, photos), upload/remove images, view ratings, reply publicly to reviews, report abusive reviews.
- **Admin** – dashboard statistics, create accounts, suspend users, add/edit/approve/suspend/reject stores, manage categories, and moderate owner-flagged reviews.

---

## ✨ Project structure

```
fullstack-store-rating/
├── BackEnd/            # Express API
│   ├── config/         # Sequelize/MySQL connection
│   ├── controllers/    # auth, admin, owner, user, category
│   ├── middleware/     # auth guard, role guard, upload
│   ├── models/         # Store, User, Rating, ReviewHelp, Favorite, Notification, Category
│   ├── routes/         # /api/auth, /api/user, /api/owner, /api/admin, /api/categories
│   ├── scripts/        # unlock-user.js, delete-user.js
│   ├── uploads/        # store photos (git-ignored)
│   ├── .env.example    # copy to .env and edit
│   └── package.json
└── FrontEnd/
    └── myapp/          # React + Vite app
        ├── src/
        └── package.json
```

---

## 🖥 Requirements

| Tool | Version |
|---|---|
| Node.js | 18+ recommended (uses Express 5 / React 19) |
| MySQL | 8.x |

---

## 🚀 Getting started (manual run)

### 1. Clone / extract & open the folder

```bash
git clone https://github.com/<you>/fullstack-store-rating.git
cd fullstack-store-rating
```

### 2. Create the database + config

Open your MySQL client and run:

```sql
CREATE DATABASE IF NOT EXISTS store_rating_db;
```

Then create your backend config file:

```bash
cp BackEnd/.env.example BackEnd/.env
```

Edit `BackEnd/.env` and set your real MySQL password:

```
PORT=5000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=store_rating_db
JWT_SECRET=change_this_to_a_long_random_secret
```

> The app auto-creates/updates **tables** on startup, but the **database** itself must exist first.

### 3. Start the backend

```bash
cd BackEnd
npm install
node index.js
```

Expected output:
```
DB connected
Server running on port 5000
```

### 4. Start the frontend

```bash
cd FrontEnd/myapp
npm install
npm run dev
```

Expected: `Local: http://localhost:5173/`

> ⚠️ The frontend runs from `FrontEnd/myapp` (it has `package.json`). Running `npm run dev` from `FrontEnd` alone fails with `Missing script: "dev"`.

### 5. Open the app

- UI: **http://localhost:5173/**
- API: **http://localhost:5000/api**

Register the first account at `http://localhost:5173/register`. There is **no seeded admin** — to promote an account to admin, either use `BackEnd/scripts/unlock-user.js` or set `role='admin'` for that email directly in MySQL.

---

## 🐛 Troubleshooting

| Symptom | Fix |
|---|---|
| `npm error Missing script: "dev"` | Start the frontend from `FrontEnd/myapp`, not `FrontEnd`. |
| `Unable to start server` / `SequelizeAuthenticationError` | MySQL isn't running, `.env` password is wrong, or the DB isn't created. |
| `vite: command not found` | Run `npm install` inside the app folder first. |
| Login works but no data | Backend isn't running on port 5000, or `FrontEnd/myapp/src/utils/api.js` baseURL doesn't match. |
| Port 5000 is busy | Change `PORT` in `BackEnd/.env` **and** `baseURL` in `FrontEnd/myapp/src/utils/api.js`. |

---

## 🔒 Security note

`.gitignore` excludes `node_modules/`, `BackEnd/.env`, `BackEnd/uploads/`, and `*.log`. Always push the `.env.example` template (never your real `.env`), because it contains your database password and JWT secret.